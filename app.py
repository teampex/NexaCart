from flask import ( Flask,render_template,request,jsonify,session,redirect,url_for,abort
)

import mysql.connector
from mysql.connector import Error

import os
import re
import hmac
import hashlib
import importlib
import secrets
import smtplib
import time
from email.message import EmailMessage
from uuid import uuid4
from datetime import timedelta

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from werkzeug.utils import secure_filename


# =========================================================
# PROJECT MAP (Roman Hindi)
#
# 1. Database: get_db_connection() MySQL "nexacart" se connect karta hai.
# 2. Customer: home, products, cart, checkout, login, register aur orders.
# 3. AI: get_home_recommendations() saved .pkl model se suggestions laata hai.
# 4. Admin: users/sellers/products ko manage karta hai.
# 5. Seller: product add karta hai aur received orders ka status badalta hai.
# =========================================================

# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)

app.secret_key = "nexacart-secret-key"
app.permanent_session_lifetime = timedelta(days=30)
LOGIN_OTP_STORE = {}

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Keep local .env configuration working even if python-dotenv is absent.
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.isfile(env_path):
        with open(env_path, encoding="utf-8") as env_file:
            for line in env_file:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                value = value.strip().strip('"').strip("'")
                os.environ.setdefault(key.strip(), value)


# =========================================================
# PRODUCT IMAGE UPLOAD SETTINGS
# =========================================================

ALLOWED_IMAGE_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}


# Upload validation: sirf configured image extensions ko product photos ke liye allow karta hai.
def allowed_image(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_IMAGE_EXTENSIONS
    )


# Product image ko validate karke unique naam se static/uploads/products mein save karta hai.
def save_product_image(image):
    if not image or not image.filename:
        return None

    if not allowed_image(image.filename):
        raise ValueError(
            "Only PNG, JPG, JPEG and WEBP images are allowed."
        )

    upload_folder = os.path.join(
        app.root_path,
        "static",
        "uploads",
        "products"
    )

    # Create the upload folder automatically.
    os.makedirs(
        upload_folder,
        exist_ok=True
    )

    original_name = secure_filename(
        image.filename
    )

    extension = original_name.rsplit(
        ".",
        1
    )[1].lower()

    # Use a unique filename so different sellers cannot overwrite images.
    filename = (
        f"product_{uuid4().hex}.{extension}"
    )

    image.save(
        os.path.join(
            upload_folder,
            filename
        )
    )

    # Store the path relative to the static folder.
    return (
        f"uploads/products/{filename}"
    )


# Database mein saved image path ko browser ke liye usable static URL mein badalta hai.
def product_image_url(image_path):
    """Return a valid static URL for current and legacy product image paths."""
    if not image_path:
        return ""

    image_path = str(image_path).strip().replace("\\", "/")

    if image_path.startswith(("http://", "https://")):
        return image_path

    # Older records may contain a full path or repeat the static/ prefix.
    static_marker = "/static/"
    if static_marker in image_path:
        image_path = image_path.split(static_marker, 1)[1]
    elif image_path.startswith("static/"):
        image_path = image_path[len("static/"):]

    image_path = image_path.lstrip("/")

    # Some old rows saved only the uploaded filename.
    if "/" not in image_path:
        image_path = f"uploads/products/{image_path}"

    # If an old path is stale, try the uploaded products directory by basename.
    candidate = os.path.join(
        app.root_path,
        "static",
        *image_path.split("/")
    )
    if not os.path.isfile(candidate):
        basename = os.path.basename(image_path)
        upload_candidate = os.path.join(
            app.root_path,
            "static",
            "uploads",
            "products",
            basename
        )
        if os.path.isfile(upload_candidate):
            image_path = f"uploads/products/{basename}"

    return url_for("static", filename=image_path)


# =========================================================
# DATABASE CONNECTION
# =========================================================

# MySQL database connection banata hai; database queries wale routes isi helper ko use karte hain.
def get_db_connection():
    # Har database query se pehle isi function se MySQL connection banta hai.

    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="nexacart"
    )


# =========================================================
# USER SESSION AVAILABLE IN ALL HTML PAGES
# =========================================================

# Har template render par session ke current user ki basic details template context mein deta hai.
@app.context_processor
def inject_user():
    # Ye data har HTML template ko automatically milta hai.

    return {
        "logged_in": "user_id" in session,
        "username": session.get("username")
    }


# Protected customer pages/actions ke liye login check karke redirect ya JSON error deta hai.
def require_customer_login(next_url=None, json_response=False):
    # Login na hone par intended page save hota hai. Login ke baad user
    # Home ki jagah isi saved page, jaise /checkout ya /orders, par jaata hai.
    if session.get("user_id"):
        return None
    session["next_after_login"] = next_url or request.full_path.rstrip("?")
    if json_response:
        return jsonify({"success": False, "message": "Please log in to continue.",
                        "redirect": url_for("login", next=session["next_after_login"])}), 401
    return redirect(url_for("login", next=session["next_after_login"]))


# Guest ya logged-in customer ke cart/wishlist records ko identify karne wali key deta hai.
def get_cart_key():
    # Guest/customer cart ko identify karne ke liye browser session mein unique key.
    session.permanent = True
    if not session.get("cart_key"):
        session["cart_key"] = session.get("cart_token") or uuid4().hex
    return session["cart_key"]


# OTP confirmation mein email ka kuch hissa chhupa kar privacy rakhta hai.
def masked_email(email):
    local, separator, domain = str(email).partition("@")
    if not separator:
        return "your registered email"
    return f"{local[:1]}***@{domain}"


# SMTP settings se login OTP email bhejta hai; code generate ya verify karna iska kaam nahi.
def send_login_email(email, code):
    host = os.getenv("SMTP_HOST", "").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    sender = os.getenv("SMTP_FROM", username).strip()
    if not all((host, username, password, sender)):
        raise RuntimeError("Email delivery is not configured")

    message = EmailMessage()
    message["Subject"] = "Your NexaCart login code"
    message["From"] = sender
    message["To"] = email
    message.set_content(f"Your NexaCart login code is {code}. It expires in 5 minutes. If you did not request it, ignore this email.")
    port = int(os.getenv("SMTP_PORT", "587"))
    if os.getenv("SMTP_USE_SSL", "false").lower() in ("1", "true", "yes"):
        with smtplib.SMTP_SSL(host, port, timeout=12) as server:
            server.login(username, password)
            server.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(username, password)
            server.send_message(message)


# Homepage ke liye saved model aur fallback catalog se product suggestions banata hai.
def get_home_recommendations(products, browsing_categories=None, purchase_history=None):
    # AI section: saved .pkl model load hota hai; ismein training nahi hoti.
    # Model browsing categories aur prior orders ke basis par product names deta hai.
    if not products:
        return []

    # Always fill the recommendations row from the live catalog when the
    # saved model is unavailable or its training catalog does not match these
    # seller listings. The homepage can still show useful picks in either case.
    fallback_products = products[:5]

    def normalized_name(value):
        return re.sub(r"[^a-z0-9]", "", str(value or "").casefold())

    def purchase_fields(item):
        if isinstance(item, dict):
            return (
                item.get("name") or item.get("product_name"),
                item.get("category"),
            )
        return item, None

    # A purchase category is the strongest signal for the requested behavior:
    # show the live products from that same store category, not unrelated CF picks.
    purchased_categories = {
        normalized_name(category)
        for _, category in map(purchase_fields, purchase_history or [])
        if normalized_name(category)
    }
    target_categories = purchased_categories or {
        normalized_name(category)
        for category in (browsing_categories or [])
        if normalized_name(category)
    }
    category_products = [
        item for item in products
        if normalized_name(item.get("category")) in target_categories
    ]
    if category_products:
        return category_products

    def model_category_for(value):
        """Translate store category labels into the model's six categories."""
        category_key = normalized_name(value)
        for category in recommender.category_product_probability.index:
            if normalized_name(category) == category_key:
                return category

        aliases = {
            "Electronics": ("electronic", "phone", "mobile", "smartphone", "laptop", "computer", "gadget", "tech"),
            "Beauty": ("beauty", "cosmetic", "makeup", "skincare", "skin", "lipstick", "perfume"),
            "Books": ("book", "fiction", "comic", "biography", "novel", "reading"),
            "Fashion": ("fashion", "clothing", "apparel", "wear", "shirt", "jean", "jacket", "shoe", "sneaker"),
            "Fitness": ("fitness", "sport", "gym", "exercise", "dumbbell", "treadmill", "yoga", "resistance"),
            "Home Decor": ("home", "decor", "curtain", "cushion", "lamp", "wallart", "furniture"),
        }
        for model_category, terms in aliases.items():
            if any(term in category_key for term in terms):
                return model_category
        return None

    try:
        recommender = importlib.import_module("models.recommendation_model")
        model_products = list(recommender.item_similarity_df.index)
        model_categories = list(recommender.category_product_probability.index)
        product_names = {normalized_name(name): name for name in model_products}
        category_names = {normalized_name(name): name for name in model_categories}
        model_purchase_history = []
        model_browsing_categories = [
            category_names[key]
            for item in (browsing_categories or [])
            if (key := normalized_name(item)) in category_names
        ]

        # Order history must influence recommendations too. The saved model is
        # trained on generic names (e.g. "Smartphone"), while seller listings
        # often use names such as "phone 9" and store-specific categories.
        for item in (purchase_history or []):
            purchased_name, purchased_category = purchase_fields(item)

            key = normalized_name(purchased_name)
            if key in product_names:
                model_purchase_history.append(product_names[key])
            else:
                # Map common seller naming variants to the equivalent trained item.
                item_aliases = {
                    "smartphone": ("phone", "mobile"),
                    "smartwatch": ("watch",),
                    "headphones": ("headphone", "earphone", "earbud"),
                    "shoes": ("shoe", "sneaker"),
                }
                for model_name, aliases in item_aliases.items():
                    if any(alias in key for alias in aliases):
                        canonical_key = normalized_name(model_name)
                        if canonical_key in product_names:
                            model_purchase_history.append(product_names[canonical_key])
                            break

            mapped_category = model_category_for(purchased_category or purchased_name)
            if mapped_category and mapped_category not in model_browsing_categories:
                model_browsing_categories.append(mapped_category)
        results = recommender.recommend_for_website(
            customer_id=session.get("user_id", "NEW_CUSTOMER"),
            browsing_categories=model_browsing_categories,
            purchase_history=model_purchase_history,
            n=5,
        )
    except Exception:
        # AI is optional: a missing dependency/model must not break the storefront.
        app.logger.exception("Product recommendations are unavailable")
        return fallback_products

    # Model item names can differ from seller listing names. Keep the model's
    # learned category probabilities available for matching live listings too.
    category_product_probability = recommender.category_product_probability

    def normalized_category(value):
        return re.sub(r"[^a-z0-9]", "", str(value or "").casefold())

    products_by_name = {
        normalized_name(item["name"]): item
        for item in products
    }

    def matching_catalog_product(model_product_name):
        # Model ke product name ko seller ke live MySQL product se match karta hai.
        model_name = normalized_name(model_product_name)
        if not model_name:
            return None

        exact_match = products_by_name.get(model_name)
        if exact_match:
            return exact_match

        # The trained dataset calls some items "Smartphone" and "Smartwatch",
        # while seller listings may use the shorter names "phone" and "watch".
        for catalog_name, catalog_product in products_by_name.items():
            if len(catalog_name) >= 3 and (
                catalog_name in model_name or model_name in catalog_name
            ):
                return catalog_product
        return None

    recommendations = []
    seen = set()
    for result in results:
        product = matching_catalog_product(result.get("product"))
        if product and product["id"] in seen:
            product = None
        if product is None:
            model_name = result.get("product")
            if model_name in category_product_probability.columns:
                model_category = category_product_probability[model_name].idxmax()
                category_key = normalized_category(model_category)
                product = next(
                    (
                        item for item in products
                        if normalized_category(item.get("category")) == category_key
                        and item["id"] not in seen
                    ),
                    None,
                )
        if product and product["id"] not in seen:
            recommendations.append(product)
            seen.add(product["id"])

    # Model names/categories can be unrelated to the products currently sold.
    # Complete any short result with distinct live products so the section does
    # not disappear just because the training and store catalogs differ.
    for product in products:
        if len(recommendations) >= 5:
            break
        if product["id"] not in seen:
            recommendations.append(product)
            seen.add(product["id"])

    return recommendations


# =========================================================
# HOME
# =========================================================

# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():
    # Homepage products, customer activity, recommendations, cart aur wishlist data load karta hai.
    # Home page: active products + AI recommendations template ko bhejta hai.

    conn = None
    cursor = None
    products = []
    home_products = []
    recommended_products = []
    browsing_categories = session.get("browsing_categories", [])
    purchase_history = []

    try:

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                seller_id,
                name,
                category,
                price,
                description,
                stock,
                image,
                status,
                created_at
            FROM products
            WHERE status = 'active'
            ORDER BY id DESC
            """
        )

        products = cursor.fetchall()
        home_products = [
            {
                "id": product["id"],
                "name": product["name"],
                "category": product["category"],
                "price": float(product["price"] or 0),
                "oldPrice": 0,
                "rating": 0,
                "reviews": 0,
                "badge": "",
                "image": product_image_url(product["image"]),
                "detailUrl": url_for("product_detail", product_id=product["id"]),
            }
            for product in products
        ]

        if session.get("user_id"):
            # Logged-in user ke old orders AI model ko personal suggestions ke liye milte hain.
            try:
                cursor.execute(
                    """SELECT oi.product_name, p.category FROM order_items oi
                       JOIN orders o ON o.id = oi.order_id
                       LEFT JOIN products p ON p.id = oi.product_id
                       WHERE o.user_id = %s ORDER BY o.created_at DESC""",
                    (session["user_id"],),
                )
                purchase_history = [
                    {"name": row["product_name"], "category": row["category"]}
                    for row in cursor.fetchall()
                ]
            except Error:
                app.logger.exception("Could not load purchase history for recommendations")

        recommended_products = get_home_recommendations(
            home_products, browsing_categories, purchase_history
        )

        print("----------------------------------------")
        print("HOME PRODUCTS LOADED")
        print("Total Products:", len(products))
        print("----------------------------------------")

    except Error as error:

        print("----------------------------------------")
        print("HOME PRODUCT ERROR")
        print(error)
        print("----------------------------------------")

        products = []

    finally:

        if cursor:
            try:
                cursor.close()
            except Exception:
                pass

        if conn:
            try:
                if conn.is_connected():
                    conn.close()
            except Exception:
                pass

    return render_template(
        "home.html",
        products=products,
        home_products=home_products,
        recommended_products=recommended_products,
    )


@app.route("/home")
def home_page():
    # /home URL ko main storefront homepage par redirect karta hai.

    return redirect(
        url_for("home")
    )


@app.route("/products")
def products_page():
    # Active catalog template ko deta hai, jahan browser search/filter/sort karta hai.
    # Catalog page: database ke saare active products show karta hai.
    """Show active products from the database in the catalog page."""
    conn = None
    cursor = None
    products = []

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, name, category, price, description, stock, image, created_at
            FROM products
            WHERE status = 'active'
            ORDER BY id DESC
            """
        )
        for product in cursor.fetchall():
            products.append({
                "id": product["id"],
                "name": product["name"],
                "category": product["category"] or "General",
                "price": float(product["price"] or 0),
                "description": product["description"] or "",
                "stock": int(product["stock"] or 0),
                "image": product_image_url(product["image"]),
                "rating": 0,
                "reviews": 0,
                "createdAt": product["created_at"].isoformat() if product["created_at"] else "",
            })
    except Error as error:
        app.logger.exception("Could not load product catalog: %s", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            try:
                if conn.is_connected():
                    conn.close()
            except Exception:
                pass

    return render_template("products.html", products=products)


@app.route("/products/<int:product_id>")
def product_detail(product_id):
    # Ek active product ki detail dikhata hai; unavailable ID par not-found response deta hai.
    # Product detail kholte hi category session mein save hoti hai for AI browsing history.
    conn = None
    cursor = None
    product = None
    more_products = []
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, name, category, price, description, stock, image, created_at
            FROM products
            WHERE id = %s AND status = 'active'
            LIMIT 1
            """,
            (product_id,)
        )
        row = cursor.fetchone()
        if row:
            categories = session.get("browsing_categories", [])
            category = str(row.get("category") or "General").strip()
            if category:
                categories = [item for item in categories if item != category]
                categories.append(category)
                session["browsing_categories"] = categories[-10:]
            product = {
                "id": row["id"],
                "name": row["name"],
                "category": row["category"] or "General",
                "price": float(row["price"] or 0),
                "description": row["description"] or "No description is available for this product.",
                "stock": int(row["stock"] or 0),
                "image": product_image_url(row["image"]),
            }
            cursor.execute(
                """
                SELECT id, name, category, price, stock, image
                FROM products
                WHERE status = 'active' AND id <> %s
                ORDER BY id DESC
                """,
                (product_id,)
            )
            more_products = [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "category": item["category"] or "General",
                    "price": float(item["price"] or 0),
                    "stock": int(item["stock"] or 0),
                    "image": product_image_url(item["image"]),
                }
                for item in cursor.fetchall()
            ]
    except Error as error:
        app.logger.exception("Could not load product %s: %s", product_id, error)
        abort(500)
    finally:
        if cursor:
            cursor.close()
        if conn:
            try:
                if conn.is_connected():
                    conn.close()
            except Exception:
                pass

    if product is None:
        abort(404)
    return render_template(
        "product_detail.html",
        product=product,
        more_products=more_products,
    )


@app.route("/checkout")
def checkout():
    # Customer login check karke database cart aur delivery details ke saath checkout page kholta hai.
    # Protected page: login zaroori hai; customer details aur live products load hote hain.
    login_redirect = require_customer_login(url_for("checkout"))
    if login_redirect:
        return login_redirect
    conn = None
    cursor = None
    checkout_products = []
    customer = {"name": session.get("username", ""), "email": session.get("email", ""), "phone": ""}
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if session.get("user_id"):
            cursor.execute("SELECT username, email, phone FROM users WHERE id = %s", (session["user_id"],))
            user = cursor.fetchone()
            if user:
                customer = {"name": user["username"] or session.get("username", ""),
                            "email": user["email"] or "", "phone": user["phone"] or ""}
        cursor.execute(
            "SELECT id, name, price, image, stock FROM products WHERE status = 'active' ORDER BY id DESC"
        )
        checkout_products = [
            {"id": row["id"], "name": row["name"], "price": float(row["price"] or 0),
             "image": product_image_url(row["image"]), "stock": int(row["stock"] or 0)}
            for row in cursor.fetchall()
        ]
    except Error as error:
        app.logger.exception("Could not load checkout: %s", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            try:
                if conn.is_connected(): conn.close()
            except Exception:
                pass
    return render_template("checkout.html", checkout_products=checkout_products, customer=customer)


@app.route("/api/cart", methods=["GET", "POST"])
def api_cart():
    # GET cart deta hai; POST se item add, quantity set, ya remove karke MySQL cart update karta hai.
    # Frontend JavaScript yahan se cart add, quantity update aur cart fetch karta hai.
    data = request.get_json(silent=True) or {}
    action = data.get("action")
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cart_key = get_cart_key()
        if request.method == "POST":
            product_id = int(data.get("product_id", 0))
            cursor.execute("SELECT id, stock FROM products WHERE id = %s AND status = 'active'", (product_id,))
            product = cursor.fetchone()
            if not product:
                return jsonify({"success": False, "message": "Product is no longer available."}), 404
            cursor.execute("SELECT quantity FROM cart_items WHERE cart_key = %s AND product_id = %s", (cart_key, product_id))
            existing = cursor.fetchone()
            if action == "add":
                quantity = (int(existing["quantity"]) if existing else 0) + 1
            elif action == "set":
                quantity = int(data.get("quantity", 0))
            elif action == "remove":
                quantity = 0
            else:
                return jsonify({"success": False, "message": "Unknown cart action."}), 400
            if quantity < 0 or quantity > 25 or quantity > int(product["stock"] or 0):
                return jsonify({"success": False, "message": "Requested quantity is unavailable."}), 409
            if quantity == 0:
                cursor.execute("DELETE FROM cart_items WHERE cart_key = %s AND product_id = %s", (cart_key, product_id))
            else:
                cursor.execute("INSERT INTO cart_items (cart_key, product_id, quantity) VALUES (%s,%s,%s) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)", (cart_key, product_id, quantity))
            conn.commit()
        cursor.execute("""SELECT p.id, p.name, p.price, p.image, ci.quantity
                          FROM cart_items ci JOIN products p ON p.id = ci.product_id
                          WHERE ci.cart_key = %s AND p.status = 'active' ORDER BY ci.updated_at""", (cart_key,))
        items = [{"id": row["id"], "name": row["name"], "price": float(row["price"] or 0),
                  "image": product_image_url(row["image"]), "quantity": int(row["quantity"])} for row in cursor.fetchall()]
        return jsonify({"success": True, "items": items})
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Cart item or quantity is invalid."}), 400
    except Error as error:
        app.logger.exception("Could not update cart: %s", error)
        return jsonify({"success": False, "message": "Cart is temporarily unavailable."}), 500
    finally:
        if cursor: cursor.close()
        if conn:
            try:
                if conn.is_connected(): conn.close()
            except Exception: pass


@app.route("/api/wishlist", methods=["GET", "POST"])
def api_wishlist():
    # GET wishlist deta hai; POST se product toggle/remove karke MySQL wishlist update karta hai.
    # Wishlist ka database API; cart se alag table wishlist_items use hoti hai.
    data = request.get_json(silent=True) or {}
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cart_key = get_cart_key()
        if request.method == "POST":
            action = data.get("action")
            product_id = int(data.get("product_id", 0))
            cursor.execute("SELECT id FROM products WHERE id = %s AND status = 'active'", (product_id,))
            if not cursor.fetchone():
                return jsonify({"success": False, "message": "Product is no longer available."}), 404
            if action == "remove":
                cursor.execute("DELETE FROM wishlist_items WHERE cart_key = %s AND product_id = %s", (cart_key, product_id))
            elif action == "toggle":
                cursor.execute("SELECT 1 FROM wishlist_items WHERE cart_key = %s AND product_id = %s", (cart_key, product_id))
                if cursor.fetchone():
                    cursor.execute("DELETE FROM wishlist_items WHERE cart_key = %s AND product_id = %s", (cart_key, product_id))
                else:
                    cursor.execute("INSERT INTO wishlist_items (cart_key, product_id) VALUES (%s,%s)", (cart_key, product_id))
            else:
                return jsonify({"success": False, "message": "Unknown wishlist action."}), 400
            conn.commit()
        cursor.execute("""SELECT p.id, p.name FROM wishlist_items wi JOIN products p ON p.id = wi.product_id
                          WHERE wi.cart_key = %s AND p.status = 'active'""", (cart_key,))
        return jsonify({"success": True, "items": cursor.fetchall()})
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Wishlist item is invalid."}), 400
    except Error as error:
        app.logger.exception("Could not update wishlist: %s", error)
        return jsonify({"success": False, "message": "Wishlist is temporarily unavailable."}), 500
    finally:
        if cursor: cursor.close()
        if conn:
            try:
                if conn.is_connected(): conn.close()
            except Exception: pass


@app.route("/api/place-order", methods=["POST"])
def place_order():
    # Checkout validate karke order/items save, stock update aur cart clear karta hai.
    # Checkout form yahan order create karta hai, stock update karta hai aur cart clear karta hai.
    login_response = require_customer_login(url_for("checkout"), json_response=True)
    if login_response:
        return login_response
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    address = str(data.get("address", "")).strip()
    city = str(data.get("city", "")).strip()
    state = str(data.get("state", "")).strip()
    pincode = str(data.get("pincode", "")).strip()
    payment_method = str(data.get("payment_method", "COD")).upper()
    if payment_method not in ("COD", "DEMO_UPI", "DEMO_CARD"):
        return jsonify({"success": False, "message": "Select an available payment option."}), 400
    if not all([name, email, phone, address, city, state, pincode]):
        return jsonify({"success": False, "message": "Please complete all delivery details."}), 400
    if not re.fullmatch(r"[0-9]{10}", phone) or not re.fullmatch(r"[0-9]{6}", pincode):
        return jsonify({"success": False, "message": "Enter a valid 10-digit phone and 6-digit PIN code."}), 400
    if (len(name) > 160 or len(email) > 255 or len(address) > 500
            or len(city) > 120 or len(state) > 120
            or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email)):
        return jsonify({"success": False, "message": "Check the email and delivery details."}), 400
    conn = None
    cursor = None
    try:
        from decimal import Decimal
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_order_tables(cursor)
        cursor.execute("SELECT product_id, quantity FROM cart_items WHERE cart_key = %s FOR UPDATE", (get_cart_key(),))
        cart_rows = cursor.fetchall()
        quantities = {int(row["product_id"]): int(row["quantity"]) for row in cart_rows}
        if not quantities:
            conn.rollback()
            return jsonify({"success": False, "message": "Your cart is empty."}), 400
        if any(product_id < 1 or quantity < 1 or quantity > 25 for product_id, quantity in quantities.items()):
            conn.rollback()
            return jsonify({"success": False, "message": "Cart contains an invalid quantity."}), 400
        products = []
        subtotal = Decimal("0.00")
        for product_id, quantity in quantities.items():
            cursor.execute(
                "SELECT id, seller_id, name, price, stock FROM products WHERE id = %s AND status = 'active' FOR UPDATE",
                (product_id,)
            )
            product = cursor.fetchone()
            if not product:
                conn.rollback()
                return jsonify({"success": False, "message": "A product in your cart is no longer available."}), 409
            if int(product["stock"] or 0) < quantity:
                conn.rollback()
                return jsonify({"success": False, "message": f"Not enough stock for {product['name']}."}), 409
            product["quantity"] = quantity
            product["price"] = Decimal(str(product["price"] or 0))
            products.append(product)
            subtotal += product["price"] * quantity

        shipping = Decimal("0.00") if subtotal >= Decimal("999.00") else Decimal("49.00")
        total = subtotal + shipping
        order_number = "NC" + uuid4().hex[:16].upper()
        cursor.execute(
            """INSERT INTO orders
               (order_number, user_id, customer_name, email, phone, address, city, state, pincode,
                subtotal, shipping, total, payment_method, payment_status, status)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'Placed')""",
            (order_number, session["user_id"], name, email, phone, address, city, state, pincode,
             subtotal, shipping, total, payment_method,
             "Demo successful" if payment_method.startswith("DEMO_") else "Pending")
        )
        order_id = cursor.lastrowid
        for product in products:
            cursor.execute(
                "INSERT INTO order_items (order_id, product_id, seller_id, product_name, unit_price, quantity, fulfillment_status) VALUES (%s,%s,%s,%s,%s,%s,'Placed')",
                (order_id, product["id"], product["seller_id"], product["name"], product["price"], product["quantity"])
            )
            cursor.execute("UPDATE products SET stock = stock - %s WHERE id = %s", (product["quantity"], product["id"]))
            cursor.execute("DELETE FROM cart_items WHERE cart_key = %s", (get_cart_key(),))
        conn.commit()
        session["last_order_number"] = order_number
        return jsonify({"success": True, "order_number": order_number,
                        "redirect": url_for("order_success", order_number=order_number)}), 201
    except Error as error:
        if conn:
            conn.rollback()
        app.logger.exception("Could not place order: %s", error)
        return jsonify({"success": False, "message": "Could not place the order. Please try again."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            try:
                if conn.is_connected(): conn.close()
            except Exception:
                pass


@app.route("/orders")
def my_orders():
    # Logged-in customer ke past aur current orders dikhata hai.
    # Sirf current logged-in user ke orders load hote hain.
    if "user_id" not in session:
        return require_customer_login(url_for("my_orders"))
    conn = None
    cursor = None
    orders = []
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_order_tables(cursor)
        cursor.execute("SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC", (session["user_id"],))
        orders = cursor.fetchall()
        for order in orders:
            cursor.execute("SELECT product_name, unit_price, quantity, fulfillment_status FROM order_items WHERE order_id = %s", (order["id"],))
            order["items"] = cursor.fetchall()
    except Error as error:
        app.logger.exception("Could not load order history: %s", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            try:
                if conn.is_connected(): conn.close()
            except Exception:
                pass
    return render_template("orders.html", orders=orders)


@app.route("/orders/<order_number>/cancel", methods=["POST"])
def cancel_order(order_number):
    # Eligible customer order cancel karke order state aur stock update karta hai.
    # Valid order cancel karke product stock wapas add karta hai.
    if "user_id" not in session:
        return require_customer_login(url_for("cancel_order", order_number=order_number))
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_order_tables(cursor)
        cursor.execute("SELECT id, status FROM orders WHERE order_number = %s AND user_id = %s FOR UPDATE", (order_number, session["user_id"]))
        order = cursor.fetchone()
        if not order or order["status"] not in ("Placed", "Confirmed", "Processing"):
            conn.rollback()
            return redirect(url_for("my_orders"))
        cursor.execute("SELECT id, product_id, quantity, fulfillment_status FROM order_items WHERE order_id = %s FOR UPDATE", (order["id"],))
        order_items = cursor.fetchall()
        if any(item["fulfillment_status"] not in ("Placed", "Processing") for item in order_items):
            conn.rollback()
            return redirect(url_for("my_orders"))
        for item in order_items:
            cursor.execute("UPDATE products SET stock = stock + %s WHERE id = %s", (item["quantity"], item["product_id"]))
            cursor.execute("UPDATE order_items SET fulfillment_status = 'Cancelled' WHERE id = %s", (item["id"],))
        cursor.execute("UPDATE orders SET status = 'Cancelled' WHERE id = %s", (order["id"],))
        conn.commit()
    except Error as error:
        if conn: conn.rollback()
        app.logger.exception("Could not cancel order: %s", error)
    finally:
        if cursor: cursor.close()
        if conn:
            try:
                if conn.is_connected(): conn.close()
            except Exception:
                pass
    return redirect(url_for("my_orders"))


@app.route("/orders/success/<order_number>")
def order_success(order_number):
    # Order placement ke baad confirmation page ke liye order summary load karta hai.
    # Newly placed order ki confirmation screen.
    if session.get("last_order_number") != order_number:
        abort(404)
    conn = None
    cursor = None
    order = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_order_tables(cursor)
        cursor.execute("SELECT * FROM orders WHERE order_number = %s LIMIT 1", (order_number,))
        order = cursor.fetchone()
        if order:
            cursor.execute("SELECT product_name, quantity, fulfillment_status FROM order_items WHERE order_id = %s", (order["id"],))
            order["items"] = cursor.fetchall()
    except Error as error:
        app.logger.exception("Could not load order confirmation: %s", error)
    finally:
        if cursor: cursor.close()
        if conn:
            try:
                if conn.is_connected(): conn.close()
            except Exception:
                pass
    if not order:
        abort(404)
    return render_template("order_success.html", order=order)


@app.route("/track-order", methods=["GET", "POST"])
def track_order():
    # Order number aur contact details se delivery/status information dhoondhta hai.
    # Order ID aur phone se order tracking/status dikhata hai.
    order = None
    error = None
    if request.method == "POST":
        order_number = request.form.get("order_number", "").strip().upper()
        phone = request.form.get("phone", "").strip()
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            ensure_order_tables(cursor)
            if session.get("user_id"):
                cursor.execute("SELECT * FROM orders WHERE order_number = %s AND phone = %s AND user_id = %s LIMIT 1",
                               (order_number, phone, session["user_id"]))
            else:
                cursor.execute("SELECT * FROM orders WHERE order_number = %s AND phone = %s LIMIT 1", (order_number, phone))
            order = cursor.fetchone()
            if order:
                cursor.execute("SELECT product_name, quantity, fulfillment_status FROM order_items WHERE order_id = %s", (order["id"],))
                order["items"] = cursor.fetchall()
            else:
                error = "Order number and phone did not match an order."
        except Error as db_error:
            app.logger.exception("Could not track order: %s", db_error)
            error = "Order tracking is temporarily unavailable."
        finally:
            if cursor: cursor.close()
            if conn:
                try:
                    if conn.is_connected(): conn.close()
                except Exception:
                    pass
    return render_template("track_order.html", order=order, error=error)


@app.route("/seller/orders")
def seller_orders():
    # Logged-in seller ko uske products se jude customer orders dikhata hai.
    if not session.get("seller_logged_in"):
        return redirect(url_for("seller_login"))
    conn = None
    cursor = None
    items = []
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_order_tables(cursor)
        cursor.execute(
            """SELECT oi.id AS item_id, oi.product_name, oi.quantity, oi.unit_price,
                      oi.fulfillment_status, o.order_number, o.customer_name, o.phone,
                      o.address, o.city, o.state, o.pincode, o.payment_method, o.payment_status,
                      o.created_at
               FROM order_items oi JOIN orders o ON o.id = oi.order_id
               WHERE oi.seller_id = %s ORDER BY o.created_at DESC""",
            (session["seller_id"],)
        )
        items = cursor.fetchall()
    except Error as error:
        app.logger.exception("Could not load seller orders: %s", error)
    finally:
        if cursor: cursor.close()
        if conn:
            try:
                if conn.is_connected(): conn.close()
            except Exception:
                pass
    return render_template("seller_orders.html", items=items)


@app.route("/seller/orders/<int:item_id>/status", methods=["POST"])
def seller_update_order_status(item_id):
    # Seller ke apne order item ka fulfillment status update karta hai.
    if not session.get("seller_logged_in"):
        return redirect(url_for("seller_login"))
    new_status = request.form.get("status", "")
    progression = {"Placed": 0, "Processing": 1, "Shipped": 2, "Delivered": 3}
    if new_status not in progression:
        abort(400)
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_order_tables(cursor)
        cursor.execute("SELECT id, order_id, fulfillment_status FROM order_items WHERE id = %s AND seller_id = %s FOR UPDATE", (item_id, session["seller_id"]))
        item = cursor.fetchone()
        if item and item["fulfillment_status"] in progression and progression[new_status] == progression[item["fulfillment_status"]] + 1:
            cursor.execute("UPDATE order_items SET fulfillment_status = %s WHERE id = %s", (new_status, item_id))
            cursor.execute("SELECT fulfillment_status FROM order_items WHERE order_id = %s", (item["order_id"],))
            statuses = [row["fulfillment_status"] for row in cursor.fetchall()]
            if statuses and all(status == "Delivered" for status in statuses):
                order_status = "Delivered"
            elif any(status == "Shipped" for status in statuses):
                order_status = "Shipped"
            elif any(status == "Processing" for status in statuses):
                order_status = "Processing"
            else:
                order_status = "Placed"
            cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (order_status, item["order_id"]))
        conn.commit()
    except Error as error:
        if conn: conn.rollback()
        app.logger.exception("Could not update order fulfillment: %s", error)
    finally:
        if cursor: cursor.close()
        if conn:
            try:
                if conn.is_connected(): conn.close()
            except Exception:
                pass
    return redirect(url_for("seller_orders"))


def ensure_order_tables(cursor):
    # Zaroorat par order tables create karta hai; caller ka open database cursor use hota hai.
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            order_number VARCHAR(40) NOT NULL UNIQUE,
            user_id BIGINT NULL,
            customer_name VARCHAR(160) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            address VARCHAR(500) NOT NULL,
            city VARCHAR(120) NOT NULL,
            state VARCHAR(120) NOT NULL,
            pincode VARCHAR(10) NOT NULL,
            subtotal DECIMAL(12,2) NOT NULL,
            shipping DECIMAL(12,2) NOT NULL,
            total DECIMAL(12,2) NOT NULL,
            payment_method VARCHAR(20) NOT NULL DEFAULT 'COD',
            payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
            status VARCHAR(30) NOT NULL DEFAULT 'Placed',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_orders_user_created (user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS order_items (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            order_id BIGINT UNSIGNED NOT NULL,
            product_id BIGINT NOT NULL,
            seller_id BIGINT NULL,
            product_name VARCHAR(255) NOT NULL,
            unit_price DECIMAL(12,2) NOT NULL,
            quantity INT UNSIGNED NOT NULL,
            fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'Placed',
            INDEX idx_order_items_order (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """
    )
    # Upgrade existing tables created by the earlier COD only version.
    cursor.execute("SHOW COLUMNS FROM orders LIKE 'user_id'")
    user_id_column = cursor.fetchone()
    if user_id_column and str(user_id_column.get("Null", "NO")).upper() != "YES":
        cursor.execute("ALTER TABLE orders MODIFY user_id BIGINT NULL")
    cursor.execute("SHOW COLUMNS FROM orders LIKE 'payment_status'")
    if not cursor.fetchone():
        cursor.execute("ALTER TABLE orders ADD COLUMN payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending' AFTER payment_method")
    cursor.execute("SHOW COLUMNS FROM order_items LIKE 'seller_id'")
    if not cursor.fetchone():
        cursor.execute("ALTER TABLE order_items ADD COLUMN seller_id BIGINT NULL AFTER product_id")
    cursor.execute("SHOW COLUMNS FROM order_items LIKE 'fulfillment_status'")
    if not cursor.fetchone():
        cursor.execute("ALTER TABLE order_items ADD COLUMN fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'Placed' AFTER quantity")


# =========================================================
# CUSTOMER LOGIN
# =========================================================

@app.route(
    "/login",
    methods=["GET", "POST"]
)
def login():
    # GET: login screen kholta hai. POST: username/password check karta hai.
    # Success par user_id session mein save hoti hai aur next_after_login par redirect hota hai.

    # POST request mein bhi next query parameter read karo. JavaScript login
    # request current /login?next=/checkout URL par hi bhejti hai, so this is
    # a reliable fallback if the session value is missing.
    requested_next = request.args.get("next", "")
    if requested_next.startswith("/") and not requested_next.startswith("//"):
        session["next_after_login"] = requested_next

    if request.method == "GET":
        if "user_id" in session:

            return redirect(
                session.pop("next_after_login", None) or url_for("home")
            )

        return render_template(
            "login.html"
        )

    db = None
    cursor = None
    data = request.get_json(
        silent=True
    )

    try:

        if data:

            username = data.get(
                "username",
                ""
            )

            password = data.get(
                "password",
                ""
            )

        else:

            username = request.form.get(
                "username",
                ""
            )

            password = request.form.get(
                "password",
                ""
            )

        username = username.strip()

        if not username or not password:

            if data:

                return jsonify({
                    "success": False,
                    "message": (
                        "Username and password "
                        "are required."
                    )
                }), 400

            return render_template(
                "login.html",
                error=(
                    "Username and password "
                    "are required."
                )
            )

        db = get_db_connection()

        if not db.is_connected():

            if data:

                return jsonify({
                    "success": False,
                    "message": (
                        "Database connection failed."
                    )
                }), 500

            return render_template(
                "login.html",
                error=(
                    "Database connection failed."
                )
            )

        cursor = db.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                username,
                email,
                phone,
                password_hash,
                status
            FROM users
            WHERE username = %s
            """,
            (username,)
        )

        user = cursor.fetchone()

        if user is None:

            if data:

                return jsonify({
                    "success": False,
                    "message": (
                        "Invalid username "
                        "or password."
                    )
                }), 401

            return render_template(
                "login.html",
                error=(
                    "Invalid username "
                    "or password."
                )
            )

        if user["status"] == "blocked":

            if data:

                return jsonify({
                    "success": False,
                    "message": (
                        "Your account has been "
                        "blocked by admin."
                    )
                }), 403

            return render_template(
                "login.html",
                error=(
                    "Your account has been "
                    "blocked by admin."
                )
            )

        if not check_password_hash(
            user["password_hash"],
            password
        ):

            if data:

                return jsonify({
                    "success": False,
                    "message": (
                        "Invalid username "
                        "or password."
                    )
                }), 401

            return render_template(
                "login.html",
                error=(
                    "Invalid username "
                    "or password."
                )
            )

        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["email"] = user["email"]

        print("----------------------------------------")
        print("USER LOGIN SUCCESSFUL")
        print("User ID :", user["id"])
        print("Username:", user["username"])
        print("Email   :", user["email"])
        print("----------------------------------------")

        if data:

            return jsonify({
                "success": True,
                "message": "Login successful!",
                "username": user["username"],
                "user_id": user["id"],
                "next_url": (
                    session.pop("next_after_login", None)
                    or requested_next
                    or url_for("home")
                )
            }), 200

        return redirect(
            session.pop("next_after_login", None)
            or requested_next
            or url_for("home")
        )

    except Error as error:

        print("----------------------------------------")
        print("MYSQL LOGIN ERROR")
        print(error)
        print("----------------------------------------")

        if data:

            return jsonify({
                "success": False,
                "message": (
                    "Database error occurred."
                )
            }), 500

        return render_template(
            "login.html",
            error="Database error occurred."
        )

    except Exception as error:

        print("----------------------------------------")
        print("LOGIN ERROR")
        print(error)
        print("----------------------------------------")

        if data:

            return jsonify({
                "success": False,
                "message": "Something went wrong."
            }), 500

        return render_template(
            "login.html",
            error="Something went wrong."
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if db:

            try:

                if db.is_connected():
                    db.close()

            except Exception:
                pass


# =========================================================
# CUSTOMER REGISTER
# =========================================================

@app.route("/api/send-login-otp", methods=["POST"])
def send_login_otp():
    # Registered active email ke liye OTP generate/hash/store karke SMTP se send karta hai.
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    if len(email) > 255 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify({"success": False, "message": "Enter a valid email address."}), 400

    now = int(time.time())
    last_sent = int(session.get("otp_sent_at", 0))
    if now - last_sent < 60:
        return jsonify({"success": False, "message": "Please wait before requesting another code."}), 429

    conn = cursor = None
    try:
        for stale_ref, stale_record in list(LOGIN_OTP_STORE.items()):
            if now > stale_record.get("expires_at", 0):
                LOGIN_OTP_STORE.pop(stale_ref, None)
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""SELECT id, username, email, status FROM users
                          WHERE LOWER(email) = %s LIMIT 1""", (email,))
        user = cursor.fetchone()
        if not user or user.get("status") == "blocked":
            return jsonify({"success": False, "message": "No active account was found for this email address."}), 404

        code = f"{secrets.randbelow(1_000_000):06d}"
        secret = secrets.token_hex(16)
        code_hash = hmac.new(secret.encode(), code.encode(), hashlib.sha256).hexdigest()
        try:
            send_login_email(user["email"], code)
            delivery = {"method": "email", "destination": masked_email(user["email"])}
        except Exception as error:
            app.logger.exception("OTP email delivery failed")
            message = "Could not send OTP email. Check SMTP settings in the local .env file; no code was sent."
            if app.debug:
                message += f" ({type(error).__name__}: {error})"
            return jsonify({"success": False,
                            "message": message}), 503

        otp_ref = secrets.token_urlsafe(24)
        LOGIN_OTP_STORE[otp_ref] = {
            "user_id": user["id"], "username": user["username"], "email": user["email"],
            "hash": code_hash, "secret": secret, "expires_at": now + 300, "attempts": 0,
        }
        session["login_otp_ref"] = otp_ref
        session["otp_sent_at"] = now
        return jsonify({"success": True, "delivery": delivery, "expires_in": 300}), 200
    except Error as error:
        app.logger.exception("Could not find user for email OTP login: %s", error)
        return jsonify({"success": False, "message": "Could not look up your account. Please try again."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            try:
                if conn.is_connected():
                    conn.close()
            except Exception:
                pass


@app.route("/api/verify-login-otp", methods=["POST"])
def verify_login_otp():
    # OTP expiry, attempts aur code verify karke success par customer login session set karta hai.
    data = request.get_json(silent=True) or {}
    submitted = str(data.get("otp", "")).strip()
    otp_ref = session.get("login_otp_ref")
    record = LOGIN_OTP_STORE.get(otp_ref)
    now = int(time.time())
    if not re.fullmatch(r"\d{6}", submitted) or not record:
        return jsonify({"success": False, "message": "Request a new code and enter all 6 digits."}), 400
    if now > int(record.get("expires_at", 0)):
        LOGIN_OTP_STORE.pop(otp_ref, None)
        session.pop("login_otp_ref", None)
        return jsonify({"success": False, "message": "That code has expired. Please request another one."}), 400
    if int(record.get("attempts", 0)) >= 5:
        LOGIN_OTP_STORE.pop(otp_ref, None)
        session.pop("login_otp_ref", None)
        return jsonify({"success": False, "message": "Too many incorrect attempts. Request a new code."}), 429

    actual = hmac.new(record["secret"].encode(), submitted.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(record["hash"], actual):
        record["attempts"] += 1
        return jsonify({"success": False, "message": "Invalid code. Please try again."}), 401

    session["user_id"] = record["user_id"]
    session["username"] = record["username"]
    session["email"] = record["email"]
    LOGIN_OTP_STORE.pop(otp_ref, None)
    session.pop("login_otp_ref", None)
    session.pop("otp_sent_at", None)
    return jsonify({"success": True, "username": record["username"],
                    "next_url": session.pop("next_after_login", None) or url_for("home")}), 200


# =========================================================
# CUSTOMER REGISTER
# =========================================================

# Registration POST ko process karke validated details aur hashed password se customer account create karta hai.
@app.route(
    "/register",
    methods=["POST"]
)
def register():
    # New customer account banata hai; password hash form mein database mein save hota hai.

    db = None
    cursor = None
    data = request.get_json(
        silent=True
    )

    try:

        if data:

            username = data.get(
                "username",
                ""
            )

            email = data.get(
                "email",
                ""
            )

            phone = data.get(
                "phone",
                ""
            )

            password = data.get(
                "password",
                ""
            )

        else:

            username = request.form.get(
                "username",
                ""
            )

            email = request.form.get(
                "email",
                ""
            )

            phone = request.form.get(
                "phone",
                ""
            )

            password = request.form.get(
                "password",
                ""
            )

        username = username.strip()
        email = email.strip().lower()
        phone = phone.strip()

        if (
            not username
            or not email
            or not phone
            or not password
        ):

            return jsonify({
                "success": False,
                "message": "Please fill all fields."
            }), 400

        db = get_db_connection()

        if not db.is_connected():

            return jsonify({
                "success": False,
                "message": (
                    "Database connection failed."
                )
            }), 500

        cursor = db.cursor()

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE username = %s
               OR email = %s
            """,
            (
                username,
                email
            )
        )

        existing_user = cursor.fetchone()

        if existing_user:

            return jsonify({
                "success": False,
                "message": (
                    "Username or Email "
                    "already exists."
                )
            }), 409

        password_hash = generate_password_hash(
            password
        )

        cursor.execute(
            """
            INSERT INTO users
            (
                username,
                email,
                phone,
                password_hash
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                username,
                email,
                phone,
                password_hash
            )
        )

        new_user_id = cursor.lastrowid

        db.commit()

        print("----------------------------------------")
        print("NEW USER REGISTERED")
        print("User ID :", new_user_id)
        print("Username:", username)
        print("Email   :", email)
        print("Phone   :", phone)
        print("Status  : active")
        print("----------------------------------------")

        return jsonify({
            "success": True,
            "message": (
                "Registration successful!"
            ),
            "user_id": new_user_id,
            "username": username
        }), 201

    except Error as error:

        if db:

            try:
                db.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("MYSQL REGISTRATION ERROR")
        print(error)
        print("----------------------------------------")

        return jsonify({
            "success": False,
            "message": (
                "Database error occurred."
            )
        }), 500

    except Exception as error:

        if db:

            try:
                db.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("REGISTRATION ERROR")
        print(error)
        print("----------------------------------------")

        return jsonify({
            "success": False,
            "message": "Something went wrong."
        }), 500

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if db:

            try:

                if db.is_connected():
                    db.close()

            except Exception:
                pass


# =========================================================
# CUSTOMER PROFILE
# =========================================================

@app.route("/My profile")
def profile():
    # Logged-in customer ki profile page ke liye account details load karta hai.
    # Customer profile page. Session mein user_id na ho to login page khulta hai.

    if "user_id" not in session:

        return redirect(
            url_for("login")
        )

    return render_template(
        "profile.html"
    )


# =========================================================
# CUSTOMER LOGOUT
# =========================================================

@app.route("/logout")
def logout():
    # Customer session clear karke storefront par wapas bhejta hai.
    # Customer ka login/cart-related browser session clear karta hai.

    session.clear()

    return redirect(
        url_for("home")
    )


# =========================================================
# CHECK CUSTOMER SESSION
# =========================================================

@app.route("/check-session")
def check_session():
    # Frontend account menu ko current customer login state JSON mein batata hai.
    # Home page JavaScript is API se check karta hai ki user login hai ya nahi.

    if "user_id" in session:

        return jsonify({
            "logged_in": True,
            "user_id": session["user_id"],
            "username": session.get(
                "username"
            ),
            "email": session.get(
                "email"
            )
        })

    return jsonify({
        "logged_in": False
    })


# =========================================================
# ADMIN SYSTEM
# =========================================================


# =========================================================
# ADMIN REGISTER
# =========================================================

# Admin self-registration intentionally disabled; route returns 404 so public users cannot create admins.
@app.route(
    "/admin/register",
    methods=["GET", "POST"]
)
def admin_register():
    return abort(404)


# =========================================================
# ADMIN LOGIN
# =========================================================

# Admin login page dikhata hai aur submitted credentials se admin session establish karta hai.
@app.route(
    "/admin/login",
    methods=["GET", "POST"]
)
def admin_login():

    if session.get(
        "admin_logged_in"
    ):

        return redirect(
            url_for("admin_dashboard")
        )

    if request.method == "GET":

        return render_template(
            "admin_login.html"
        )

    conn = None
    cursor = None

    try:

        username = request.form.get(
            "username",
            ""
        ).strip()

        password = request.form.get(
            "password",
            ""
        )

        if not username or not password:

            return render_template(
                "admin_login.html",
                error=(
                    "Please enter username "
                    "and password."
                )
            )

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                username,
                password
            FROM admin_users
            WHERE username = %s
            """,
            (username,)
        )

        admin = cursor.fetchone()

        if (
            admin
            and check_password_hash(
                admin["password"],
                password
            )
        ):

            session["admin_logged_in"] = True
            session["admin_id"] = admin["id"]
            session["admin_username"] = (
                admin["username"]
            )

            return redirect(
                url_for("admin_dashboard")
            )

        return render_template(
            "admin_login.html",
            error=(
                "Invalid admin username "
                "or password."
            )
        )

    except Error as error:

        print("----------------------------------------")
        print("ADMIN LOGIN ERROR")
        print(error)
        print("----------------------------------------")

        return render_template(
            "admin_login.html",
            error="Database error occurred."
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# ADMIN AUTH HELPER
# =========================================================

def admin_required():
    # Admin-only routes ke liye session mein valid admin login verify karta hai.
    # Admin routes ko protect karne ka small helper.

    return (
        session.get(
            "admin_logged_in"
        ) is True
    )


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@app.route("/admin")
def admin_dashboard():
    # Admin overview ke liye users, sellers, products aur orders ka dashboard data load karta hai.
    # Admin ko users, sellers, products aur orders ka overview deta hai.

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    conn = None
    cursor = None

    try:

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                name,
                phone,
                email,
                status,
                created_at
            FROM seller_users
            ORDER BY id DESC
            """
        )

        sellers = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                id,
                username,
                email,
                phone,
                status,
                created_at
            FROM users
            ORDER BY id DESC
            """
        )

        users = cursor.fetchall()

        cursor.execute(
            """SELECT p.id, p.seller_id, p.name, p.category, p.price, p.stock,
                      p.status, p.image, p.created_at, s.name AS seller_name
               FROM products p LEFT JOIN seller_users s ON s.id = p.seller_id
               ORDER BY p.id DESC"""
        )
        products = cursor.fetchall()

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM seller_users
            """
        )

        total_sellers = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM seller_users
            WHERE status = 'active'
            """
        )

        active_sellers = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM seller_users
            WHERE status = 'blocked'
            """
        )

        blocked_sellers = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM users
            """
        )

        total_users = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM users
            WHERE status = 'active'
            """
        )

        active_users = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM users
            WHERE status = 'blocked'
            """
        )

        blocked_users = cursor.fetchone()["total"]

        return render_template(
            "admin_dashboard.html",
            admin_username=session.get(
                "admin_username",
                "Admin"
            ),
            sellers=sellers,
            users=users,
            products=products,
            total_sellers=total_sellers,
            active_sellers=active_sellers,
            blocked_sellers=blocked_sellers,
            total_users=total_users,
            active_users=active_users,
            blocked_users=blocked_users
        )

    except Error as error:

        print("----------------------------------------")
        print("ADMIN DASHBOARD ERROR")
        print(error)
        print("----------------------------------------")

        return render_template(
            "admin_dashboard.html",
            admin_username=session.get(
                "admin_username",
                "Admin"
            ),
            sellers=[],
            users=[],
            products=[],
            total_sellers=0,
            active_sellers=0,
            blocked_sellers=0,
            total_users=0,
            active_users=0,
            blocked_users=0,
            error="Database error occurred."
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# ADMIN VIEW SELLER
# =========================================================

@app.route(
    "/admin/seller/<int:seller_id>"
)
def admin_view_seller(seller_id):
    # Admin ko ek seller aur uske listed products/orders ki detail dikhata hai.

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    conn = None
    cursor = None

    try:

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                name,
                phone,
                email,
                status,
                created_at
            FROM seller_users
            WHERE id = %s
            """,
            (seller_id,)
        )

        seller = cursor.fetchone()

        if not seller:

            return redirect(
                url_for("admin_dashboard")
            )

        cursor.execute(
            """
            SELECT
                id,
                username,
                email,
                phone,
                status,
                created_at
            FROM users
            ORDER BY id DESC
            """
        )

        users = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                id,
                name,
                phone,
                email,
                status,
                created_at
            FROM seller_users
            ORDER BY id DESC
            """
        )

        sellers = cursor.fetchall()

        return render_template(
            "admin_dashboard.html",
            admin_username=session.get(
                "admin_username",
                "Admin"
            ),
            sellers=sellers,
            users=users,
            total_sellers=len(sellers),
            active_sellers=sum(
                1 for item in sellers
                if item["status"] == "active"
            ),
            blocked_sellers=sum(
                1 for item in sellers
                if item["status"] == "blocked"
            ),
            total_users=len(users),
            active_users=sum(
                1 for item in users
                if item["status"] == "active"
            ),
            blocked_users=sum(
                1 for item in users
                if item["status"] == "blocked"
            ),
            selected_seller_id=seller_id
        )

    except Error as error:

        print("----------------------------------------")
        print("VIEW SELLER ERROR")
        print(error)
        print("----------------------------------------")

        return redirect(
            url_for("admin_dashboard")
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# ADMIN VIEW USER
# =========================================================

@app.route(
    "/admin/user/<int:user_id>"
)
def admin_view_user(user_id):
    # Admin ko ek customer account aur uske order details dikhata hai.

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    conn = None
    cursor = None

    try:

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                username,
                email,
                phone,
                status,
                created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:

            return redirect(
                url_for("admin_dashboard")
            )

        cursor.execute(
            """
            SELECT
                id,
                username,
                email,
                phone,
                status,
                created_at
            FROM users
            ORDER BY id DESC
            """
        )

        users = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                id,
                name,
                phone,
                email,
                status,
                created_at
            FROM seller_users
            ORDER BY id DESC
            """
        )

        sellers = cursor.fetchall()

        return render_template(
            "admin_dashboard.html",
            admin_username=session.get(
                "admin_username",
                "Admin"
            ),
            sellers=sellers,
            users=users,
            total_sellers=len(sellers),
            active_sellers=sum(
                1 for item in sellers
                if item["status"] == "active"
            ),
            blocked_sellers=sum(
                1 for item in sellers
                if item["status"] == "blocked"
            ),
            total_users=len(users),
            active_users=sum(
                1 for item in users
                if item["status"] == "active"
            ),
            blocked_users=sum(
                1 for item in users
                if item["status"] == "blocked"
            ),
            selected_user=user,
            selected_user_id=user_id
        )

    except Error as error:

        print("----------------------------------------")
        print("VIEW USER ERROR")
        print(error)
        print("----------------------------------------")

        return redirect(
            url_for("admin_dashboard")
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# ADMIN BLOCK / UNBLOCK SELLER
# =========================================================

# Admin action se seller account ka access status update hota hai.

@app.route(
    "/admin/seller/<int:seller_id>/status",
    methods=["POST"]
)
def admin_change_seller_status(
    seller_id
):

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    status = request.form.get(
        "status",
        ""
    ).strip().lower()

    if status not in [
        "active",
        "blocked"
    ]:

        return redirect(
            url_for("admin_dashboard")
        )

    conn = None
    cursor = None

    try:

        conn = get_db_connection()

        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE seller_users
            SET status = %s
            WHERE id = %s
            """,
            (
                status,
                seller_id
            )
        )

        if cursor.rowcount == 0:
            conn.rollback()
            return redirect(
                url_for("admin_dashboard")
            )

        # Blocked seller ke products customers ko nahi dikhne chahiye.
        # Unblock par sirf admin-blocked products ko wapas active kiya jata hai.
        if status == "blocked":
            cursor.execute(
                """UPDATE products
                   SET status = 'seller_blocked'
                   WHERE seller_id = %s AND status = 'active'""",
                (seller_id,)
            )
        else:
            cursor.execute(
                """UPDATE products
                   SET status = 'active'
                   WHERE seller_id = %s AND status = 'seller_blocked'""",
                (seller_id,)
            )

        conn.commit()

        return redirect(
            url_for("admin_dashboard")
        )

    except Error as error:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("CHANGE SELLER STATUS ERROR")
        print(error)
        print("----------------------------------------")

        return redirect(
            url_for("admin_dashboard")
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# ADMIN DELETE SELLER
# =========================================================

@app.route(
    "/admin/seller/<int:seller_id>/delete",
    methods=["POST"]
)
def admin_delete_seller(
    seller_id
):

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    conn = None
    cursor = None

    try:

        conn = get_db_connection()

        cursor = conn.cursor()

        # Purane orders order_items mein product name/price ka snapshot rakhte hain,
        # isliye seller/product remove hone par order tracking safe rehti hai.
        cursor.execute(
            "SELECT id FROM seller_users WHERE id = %s FOR UPDATE",
            (seller_id,)
        )
        if not cursor.fetchone():
            conn.rollback()
            return redirect(
                url_for("admin_dashboard")
            )

        # Delete hone wale seller ka product kisi customer's cart/wishlist mein na rahe.
        cursor.execute(
            """DELETE ci FROM cart_items ci
               INNER JOIN products p ON p.id = ci.product_id
               WHERE p.seller_id = %s""",
            (seller_id,)
        )
        cursor.execute(
            """DELETE wi FROM wishlist_items wi
               INNER JOIN products p ON p.id = wi.product_id
               WHERE p.seller_id = %s""",
            (seller_id,)
        )
        cursor.execute(
            "DELETE FROM products WHERE seller_id = %s",
            (seller_id,)
        )

        cursor.execute(
            """
            DELETE FROM seller_users
            WHERE id = %s
            """,
            (seller_id,)
        )

        conn.commit()

        return redirect(
            url_for("admin_dashboard")
        )

    except Error as error:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("DELETE SELLER ERROR")
        print(error)
        print("----------------------------------------")

        return redirect(
            url_for("admin_dashboard")
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# ADMIN BLOCK / UNBLOCK USER
# =========================================================

@app.route(
    "/admin/user/<int:user_id>/status",
    methods=["POST"]
)
def admin_change_user_status(
    user_id
):

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    status = request.form.get(
        "status",
        ""
    ).strip().lower()

    if status not in [
        "active",
        "blocked"
    ]:

        return redirect(
            url_for("admin_dashboard")
        )

    conn = None
    cursor = None

    try:

        conn = get_db_connection()

        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE users
            SET status = %s
            WHERE id = %s
            """,
            (
                status,
                user_id
            )
        )

        conn.commit()

        return redirect(
            url_for("admin_dashboard")
        )

    except Error as error:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("CHANGE USER STATUS ERROR")
        print(error)
        print("----------------------------------------")

        return redirect(
            url_for("admin_dashboard")
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# ADMIN DELETE USER
# =========================================================

# Admin action se customer account aur required dependent data remove hota hai.

@app.route(
    "/admin/user/<int:user_id>/delete",
    methods=["POST"]
)
def admin_delete_user(user_id):
    # Admin action par customer account ko database se delete karta hai.

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    conn = None
    cursor = None

    try:

        conn = get_db_connection()

        cursor = conn.cursor()

        cursor.execute(
            """
            DELETE FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        conn.commit()

        return redirect(
            url_for("admin_dashboard")
        )

    except Error as error:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("DELETE USER ERROR")
        print(error)
        print("----------------------------------------")

        return redirect(
            url_for("admin_dashboard")
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# ADMIN LOGOUT
# =========================================================

@app.route("/admin/product/<int:product_id>/status", methods=["POST"])
def admin_change_product_status(product_id):
    # Admin product ko storefront par active ya hidden kar sakta hai.
    if not admin_required():
        return redirect(url_for("admin_login"))
    status = request.form.get("status", "").strip().lower()
    if status not in {"active", "blocked"}:
        return redirect(url_for("admin_dashboard"))
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE products SET status = %s WHERE id = %s", (status, product_id))
        conn.commit()
    except Error:
        if conn:
            conn.rollback()
        app.logger.exception("Admin could not update product %s", product_id)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/product/<int:product_id>/delete", methods=["POST"])
def admin_delete_product(product_id):
    # Admin selected product ko catalog se delete karta hai.
    if not admin_required():
        return redirect(url_for("admin_login"))
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cart_items WHERE product_id = %s", (product_id,))
        cursor.execute("DELETE FROM wishlist_items WHERE product_id = %s", (product_id,))
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
    except Error:
        if conn:
            conn.rollback()
        app.logger.exception("Admin could not delete product %s", product_id)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
    return redirect(url_for("admin_dashboard"))


# =========================================================

@app.route("/admin/logout")
def admin_logout():
    # Admin session clear karke admin login page par bhejta hai.

    session.pop(
        "admin_logged_in",
        None
    )

    session.pop(
        "admin_id",
        None
    )

    session.pop(
        "admin_username",
        None
    )

    return redirect(
        url_for("admin_login")
    )


# =========================================================
# SELLER SYSTEM
# =========================================================


# =========================================================
# SELLER REGISTER
# =========================================================

# Seller registration request validate karke seller account database mein create karta hai.

@app.route(
    "/seller/register",
    methods=["GET", "POST"]
)
def seller_register():
    # Seller account registration: seller_users table mein seller create hota hai.

    if request.method == "GET":

        return render_template(
            "seller_register.html"
        )

    conn = None
    cursor = None

    try:

        name = request.form.get(
            "name",
            ""
        ).strip()

        phone = request.form.get(
            "phone",
            ""
        ).strip()

        email = request.form.get(
            "email",
            ""
        ).strip().lower()

        password = request.form.get(
            "password",
            ""
        )

        confirm_password = request.form.get(
            "confirm_password",
            ""
        )

        if (
            not name
            or not phone
            or not email
            or not password
        ):

            return render_template(
                "seller_register.html",
                error="Please fill all fields."
            )

        if password != confirm_password:

            return render_template(
                "seller_register.html",
                error="Passwords do not match."
            )

        if len(password) < 6:

            return render_template(
                "seller_register.html",
                error=(
                    "Password must be at least "
                    "6 characters."
                )
            )

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT id
            FROM seller_users
            WHERE email = %s
               OR phone = %s
            """,
            (
                email,
                phone
            )
        )

        existing_seller = cursor.fetchone()

        if existing_seller:

            return render_template(
                "seller_register.html",
                error=(
                    "Email or phone number "
                    "already registered."
                )
            )

        hashed_password = generate_password_hash(
            password
        )

        cursor.execute(
            """
            INSERT INTO seller_users
            (
                name,
                phone,
                email,
                password,
                status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                'active'
            )
            """,
            (
                name,
                phone,
                email,
                hashed_password
            )
        )

        new_seller_id = cursor.lastrowid

        conn.commit()

        print("----------------------------------------")
        print("NEW SELLER REGISTERED")
        print("Seller ID:", new_seller_id)
        print("Name     :", name)
        print("Email    :", email)
        print("Phone    :", phone)
        print("Status   : active")
        print("----------------------------------------")

        return redirect(
            url_for("seller_login")
        )

    except Error as error:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("SELLER REGISTER ERROR")
        print(error)
        print("----------------------------------------")

        return render_template(
            "seller_register.html",
            error="Database error occurred."
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# SELLER LOGIN
# =========================================================

# Seller login page dikhata hai aur valid credentials par seller session start karta hai.

@app.route(
    "/seller/login",
    methods=["GET", "POST"]
)
def seller_login():
    # Seller login success par seller_id session mein save hoti hai.

    if session.get(
        "seller_logged_in"
    ):

        return redirect(
            url_for("seller_dashboard")
        )

    if request.method == "GET":

        return render_template(
            "seller_login.html"
        )

    conn = None
    cursor = None

    try:

        email = request.form.get(
            "email",
            ""
        ).strip().lower()

        password = request.form.get(
            "password",
            ""
        )

        if not email or not password:

            return render_template(
                "seller_login.html",
                error=(
                    "Please enter email "
                    "and password."
                )
            )

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                name,
                email,
                phone,
                password,
                status
            FROM seller_users
            WHERE email = %s
            """,
            (email,)
        )

        seller = cursor.fetchone()

        if not seller:

            return render_template(
                "seller_login.html",
                error=(
                    "Invalid seller email "
                    "or password."
                )
            )

        if seller["status"] == "blocked":

            return render_template(
                "seller_login.html",
                error=(
                    "Your seller account has "
                    "been blocked by admin."
                )
            )

        if not check_password_hash(
            seller["password"],
            password
        ):

            return render_template(
                "seller_login.html",
                error=(
                    "Invalid seller email "
                    "or password."
                )
            )

        session["seller_logged_in"] = True
        session["seller_id"] = seller["id"]
        session["seller_name"] = seller["name"]
        session["seller_email"] = seller["email"]
        session["seller_phone"] = seller["phone"]

        return redirect(
            url_for("seller_dashboard")
        )

    except Error as error:

        print("----------------------------------------")
        print("SELLER LOGIN ERROR")
        print(error)
        print("----------------------------------------")

        return render_template(
            "seller_login.html",
            error="Database error occurred."
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# SELLER LOGOUT
# =========================================================

@app.route("/seller/logout")
def seller_logout():
    # Seller session clear karke seller login page par bhejta hai.
    # Logout ke baad private seller pages dobara kholne par login check dobara chalega.

    session.pop(
        "seller_logged_in",
        None
    )

    session.pop(
        "seller_id",
        None
    )

    session.pop(
        "seller_name",
        None
    )

    session.pop(
        "seller_email",
        None
    )

    session.pop(
        "seller_phone",
        None
    )

    return redirect(
        url_for("seller_login")
    )


# =========================================================
# SELLER ADD PRODUCT
# =========================================================


# =========================================================
# SELLER - ADD PRODUCT
# =========================================================

# Seller-submitted product details aur image ko validate karke catalog mein save karta hai.

@app.route(
    "/seller/add-product",
    methods=["GET", "POST"]
)
def seller_add_product():
    # Seller product details/image lekar products table mein new listing add karta hai.

    if not session.get(
        "seller_logged_in"
    ):
        return redirect(
            url_for("seller_login")
        )

    # GET requests return to the dashboard.
    if request.method == "GET":

        return redirect(
            url_for("seller_dashboard")
        )

    conn = None
    cursor = None

    try:

        # Current HTML uses name="name".
        product_name = request.form.get(
            "name",
            ""
        ).strip()

        # Support the older field name as well.
        if not product_name:

            product_name = request.form.get(
                "product_name",
                ""
            ).strip()

        category = request.form.get(
            "category",
            ""
        ).strip()

        price = request.form.get(
            "price",
            ""
        ).strip()

        stock = request.form.get(
            "stock",
            "0"
        ).strip()

        description = request.form.get(
            "description",
            ""
        ).strip()

        if not product_name:

            return redirect(
                url_for("seller_dashboard")
            )

        if not category:

            category = "General"

        try:

            price_value = float(
                price
            )

            stock_value = int(
                stock
            )

        except (
            TypeError,
            ValueError
        ):

            return redirect(
                url_for("seller_dashboard")
            )

        if price_value < 0:

            return redirect(
                url_for("seller_dashboard")
            )

        if stock_value < 0:

            return redirect(
                url_for("seller_dashboard")
            )

        # -------------------------------------------------
        # PRODUCT IMAGE
        # -------------------------------------------------

        image_path = None

        image = request.files.get(
            "image"
        )

        if image and image.filename:

            image_path = save_product_image(
                image
            )

        # -------------------------------------------------
        # DATABASE INSERT
        # -------------------------------------------------

        conn = get_db_connection()

        # A seller may have been blocked after logging in. Re-check the account
        # before creating a new active product from an already-open dashboard.
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT status FROM seller_users WHERE id = %s",
            (session["seller_id"],),
        )
        seller = cursor.fetchone()
        if not seller or seller["status"] != "active":
            return redirect(url_for("seller_logout"))

        cursor.close()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO products
            (
                seller_id,
                name,
                category,
                price,
                stock,
                description,
                image,
                status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'active'
            )
            """,
            (
                session["seller_id"],
                product_name,
                category,
                price_value,
                stock_value,
                description,
                image_path
            )
        )

        conn.commit()

        print("----------------------------------------")
        print("PRODUCT ADDED SUCCESSFULLY")
        print("Product ID:", cursor.lastrowid)
        print("Seller ID :", session["seller_id"])
        print("Name      :", product_name)
        print("Image     :", image_path)
        print("----------------------------------------")

        return redirect(
            url_for("seller_dashboard")
        )

    except ValueError as error:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("PRODUCT IMAGE ERROR")
        print(error)
        print("----------------------------------------")

        return redirect(
            url_for("seller_dashboard")
        )

    except Error as error:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("ADD PRODUCT MYSQL ERROR")
        print(error)
        print("----------------------------------------")

        return redirect(
            url_for("seller_dashboard")
        )

    except Exception as error:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("ADD PRODUCT ERROR")
        print(error)
        print("----------------------------------------")

        return redirect(
            url_for("seller_dashboard")
        )

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass


# =========================================================
# SELLER DASHBOARD
# =========================================================
# =========================================================
# SELLER DASHBOARD
# =========================================================

@app.route("/seller/dashboard")
def seller_dashboard():
    # Seller ke apne products, sales aur settings ka dashboard data load karta hai.
    # Logged-in seller ko sirf apne products aur sales information dikhata hai.

    if not session.get(
        "seller_logged_in"
    ):

        return redirect(
            url_for("seller_login")
        )

    seller_id = session.get(
        "seller_id"
    )

    if not seller_id:

        return redirect(
            url_for("seller_login")
        )

    conn = None
    cursor = None

    products = []

    try:

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                seller_id,
                name,
                category,
                price,
                stock,
                description,
                image,
                status,
                created_at
            FROM products
            WHERE seller_id = %s
            ORDER BY id DESC
            """,
            (
                seller_id,
            )
        )

        products = cursor.fetchall()

        print("----------------------------------------")
        print("SELLER PRODUCTS LOADED")
        print("Seller ID:", seller_id)
        print("Products :", len(products))
        print("----------------------------------------")

    except Error as error:

        print("----------------------------------------")
        print("SELLER PRODUCTS LOAD ERROR")
        print(error)
        print("----------------------------------------")

        products = []

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:

                if conn.is_connected():
                    conn.close()

            except Exception:
                pass

    return render_template(
        "seller_dashboard.html",
        seller_name=session.get(
            "seller_name",
            "Seller"
        ),
        seller_email=session.get(
            "seller_email",
            ""
        ),
        products=products
    )


# =========================================================
# SELLER DELETE OWN PRODUCT
# =========================================================

@app.route("/seller/products/<int:product_id>/delete", methods=["POST"])
def seller_delete_product(product_id):
    # Ownership verify karke seller ko sirf apna product delete karne deta hai.
    """Seller can delete only a product that belongs to the current seller."""
    if not session.get("seller_logged_in") or not session.get("seller_id"):
        return redirect(url_for("seller_login"))

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # seller_id condition prevents one seller from deleting another seller's product.
        cursor.execute(
            """SELECT id FROM products
               WHERE id = %s AND seller_id = %s FOR UPDATE""",
            (product_id, session["seller_id"]),
        )
        if not cursor.fetchone():
            conn.rollback()
            return redirect(url_for("seller_dashboard"))

        # Remove stale cart/wishlist rows before deleting the catalog product.
        cursor.execute("DELETE FROM cart_items WHERE product_id = %s", (product_id,))
        cursor.execute("DELETE FROM wishlist_items WHERE product_id = %s", (product_id,))
        cursor.execute(
            "DELETE FROM products WHERE id = %s AND seller_id = %s",
            (product_id, session["seller_id"]),
        )
        conn.commit()
    except Error as error:
        if conn:
            conn.rollback()
        app.logger.exception("Seller could not delete product %s: %s", product_id, error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            try:
                if conn.is_connected():
                    conn.close()
            except Exception:
                pass

    return redirect(url_for("seller_dashboard"))


@app.cli.command("create-admin")
def create_admin_command():
    # Flask CLI helper: development/setup ke waqt admin account create karta hai.
    """Create an administrator from the trusted local server console."""
    import click

    username = click.prompt("Admin username").strip()
    email = click.prompt("Admin email").strip().lower()
    phone = click.prompt("Admin phone").strip()
    password = click.prompt("Admin password", confirmation_prompt=True)
    if not username or not email or not phone or len(password) < 12:
        raise click.ClickException("All fields are required and password must be at least 12 characters.")

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO admin_users (username, email, phone, password) VALUES (%s, %s, %s, %s)",
            (username, email, phone, generate_password_hash(password)),
        )
        conn.commit()
        click.echo("Admin account created. Sign in at /admin/login.")
    except Error as error:
        if conn:
            conn.rollback()
        raise click.ClickException(f"Could not create admin account: {error}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    print("----------------------------------------")
    print("NEXACART SERVER STARTING...")
    print("----------------------------------------")
    print("Database: nexacart")
    print("Host    : localhost")
    print("Port    : 5000")
    print("----------------------------------------")

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )


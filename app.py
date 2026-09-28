from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    session,
    redirect,
    url_for
)

import mysql.connector
from mysql.connector import Error

import os
from uuid import uuid4

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from werkzeug.utils import secure_filename


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)

app.secret_key = "nexacart-secret-key"


# =========================================================
# PRODUCT IMAGE UPLOAD SETTINGS
# =========================================================

ALLOWED_IMAGE_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}


def allowed_image(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_IMAGE_EXTENSIONS
    )


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

def get_db_connection():

    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="nexacart"
    )


# =========================================================
# USER SESSION AVAILABLE IN ALL HTML PAGES
# =========================================================

@app.context_processor
def inject_user():

    return {
        "logged_in": "user_id" in session,
        "username": session.get("username")
    }


# =========================================================
# HOME
# =========================================================

# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    conn = None
    cursor = None
    products = []
    home_products = []

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
                "name": product["name"],
                "price": float(product["price"] or 0),
                "oldPrice": 0,
                "rating": 0,
                "reviews": 0,
                "badge": "",
                "image": product_image_url(product["image"]),
            }
            for product in products
        ]

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
        home_products=home_products
    )


@app.route("/home")
def home_page():

    return redirect(
        url_for("home")
    )


# =========================================================
# CUSTOMER LOGIN
# =========================================================

@app.route(
    "/login",
    methods=["GET", "POST"]
)
def login():

    if request.method == "GET":

        if "user_id" in session:

            return redirect(
                url_for("home")
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
                "user_id": user["id"]
            }), 200

        return redirect(
            url_for("home")
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

@app.route(
    "/register",
    methods=["POST"]
)
def register():

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

    session.clear()

    return redirect(
        url_for("home")
    )


# =========================================================
# CHECK CUSTOMER SESSION
# =========================================================

@app.route("/check-session")
def check_session():

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

@app.route(
    "/admin/register",
    methods=["GET", "POST"]
)
def admin_register():

    if request.method == "GET":

        return render_template(
            "admin_register.html"
        )

    conn = None
    cursor = None

    try:

        username = request.form.get(
            "username",
            ""
        ).strip()

        email = request.form.get(
            "email",
            ""
        ).strip().lower()

        phone = request.form.get(
            "phone",
            ""
        ).strip()

        password = request.form.get(
            "password",
            ""
        )

        confirm_password = request.form.get(
            "confirm_password",
            ""
        )

        if (
            not username
            or not email
            or not phone
            or not password
            or not confirm_password
        ):

            return render_template(
                "admin_register.html",
                error="Please fill all fields."
            )

        if password != confirm_password:

            return render_template(
                "admin_register.html",
                error="Passwords do not match."
            )

        if len(password) < 6:

            return render_template(
                "admin_register.html",
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
            FROM admin_users
            WHERE username = %s
               OR email = %s
               OR phone = %s
            """,
            (
                username,
                email,
                phone
            )
        )

        existing_admin = cursor.fetchone()

        if existing_admin:

            return render_template(
                "admin_register.html",
                error=(
                    "Username, email or phone "
                    "number already exists."
                )
            )

        hashed_password = generate_password_hash(
            password
        )

        cursor.execute(
            """
            INSERT INTO admin_users
            (
                username,
                email,
                phone,
                password
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
                hashed_password
            )
        )

        conn.commit()

        return redirect(
            url_for("admin_login")
        )

    except Error as error:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        print("----------------------------------------")
        print("ADMIN REGISTER ERROR")
        print(error)
        print("----------------------------------------")

        return render_template(
            "admin_register.html",
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
# ADMIN LOGIN
# =========================================================

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

@app.route(
    "/admin/user/<int:user_id>/delete",
    methods=["POST"]
)
def admin_delete_user(user_id):

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

@app.route("/admin/logout")
def admin_logout():

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

@app.route(
    "/seller/register",
    methods=["GET", "POST"]
)
def seller_register():

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

@app.route(
    "/seller/login",
    methods=["GET", "POST"]
)
def seller_login():

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

@app.route(
    "/seller/add-product",
    methods=["GET", "POST"]
)
def seller_add_product():

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

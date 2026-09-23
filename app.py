from flask import Flask, render_template,request,jsonify,session, redirect,url_for


import mysql.connector
from mysql.connector import Error

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)

# Session secret key
app.secret_key = "nexacart-secret-key"


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
# MAKE USER SESSION AVAILABLE IN ALL HTML PAGES
# =========================================================

@app.context_processor
def inject_user():

    return {
        "logged_in": "user_id" in session,
        "username": session.get("username")
    }


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def home():

    return render_template("home.html")


# =========================================================
# HOME PAGE DIRECT URL
# =========================================================

@app.route("/home")
def home_page():

    return render_template("home.html")


# =========================================================
# LOGIN
# =========================================================
#
# GET  -> Open login page
# POST -> Process login
#
# =========================================================

@app.route("/login", methods=["GET", "POST"])
def login():

    # =====================================================
    # OPEN LOGIN PAGE
    # =====================================================

    if request.method == "GET":

        # If already logged in, go to home
        if "user_id" in session:

            return redirect(url_for("home"))

        return render_template("login.html")


    # =====================================================
    # LOGIN PROCESS
    # =====================================================

    db = None
    cursor = None

    try:

        # -------------------------------------------------
        # GET DATA
        # -------------------------------------------------
        #
        # Supports:
        # 1. JSON from JavaScript
        # 2. Normal HTML form
        #

        data = request.get_json(silent=True)

        if data:

            username = data.get("username")
            password = data.get("password")

        else:

            username = request.form.get("username")
            password = request.form.get("password")


        # -------------------------------------------------
        # CLEAN DATA
        # -------------------------------------------------

        if username:

            username = username.strip()


        # -------------------------------------------------
        # CHECK EMPTY FIELDS
        # -------------------------------------------------

        if not username or not password:

            if data:

                return jsonify({
                    "success": False,
                    "message": "Username and password are required."
                }), 400

            return render_template(
                "login.html",
                error="Username and password are required."
            )


        # -------------------------------------------------
        # DATABASE CONNECTION
        # -------------------------------------------------

        db = get_db_connection()


        if not db.is_connected():

            if data:

                return jsonify({
                    "success": False,
                    "message": "Database connection failed."
                }), 500

            return render_template(
                "login.html",
                error="Database connection failed."
            )


        print("----------------------------------------")
        print("DATABASE CONNECTED")
        print("----------------------------------------")


        # Dictionary result
        cursor = db.cursor(dictionary=True)


        # -------------------------------------------------
        # FIND USER
        # -------------------------------------------------

        query = """
            SELECT
                id,
                username,
                email,
                phone,
                password_hash
            FROM users
            WHERE username = %s
        """

        cursor.execute(
            query,
            (username,)
        )

        user = cursor.fetchone()


        # -------------------------------------------------
        # USER NOT FOUND
        # -------------------------------------------------

        if user is None:

            if data:

                return jsonify({
                    "success": False,
                    "message": "Invalid username or password."
                }), 401

            return render_template(
                "login.html",
                error="Invalid username or password."
            )


        # -------------------------------------------------
        # CHECK PASSWORD
        # -------------------------------------------------

        password_valid = check_password_hash(
            user["password_hash"],
            password
        )


        if not password_valid:

            if data:

                return jsonify({
                    "success": False,
                    "message": "Invalid username or password."
                }), 401

            return render_template(
                "login.html",
                error="Invalid username or password."
            )


        # -------------------------------------------------
        # LOGIN SUCCESS
        # -------------------------------------------------

        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["email"] = user["email"]


        print("----------------------------------------")
        print("USER LOGIN SUCCESSFUL")
        print("User ID :", user["id"])
        print("Username:", user["username"])
        print("Email   :", user["email"])
        print("----------------------------------------")


        # -------------------------------------------------
        # IF LOGIN CAME FROM JAVASCRIPT / JSON
        # -------------------------------------------------

        if data:

            return jsonify({
                "success": True,
                "message": "Login successful!",
                "username": user["username"],
                "user_id": user["id"]
            }), 200


        # -------------------------------------------------
        # NORMAL FORM LOGIN
        # -------------------------------------------------

        return redirect(url_for("home"))


    # =====================================================
    # MYSQL ERROR
    # =====================================================

    except Error as error:

        print("----------------------------------------")
        print("MYSQL LOGIN ERROR")
        print(error)
        print("----------------------------------------")


        if data:

            return jsonify({
                "success": False,
                "message": "Database error occurred."
            }), 500


        return render_template(
            "login.html",
            error="Database error occurred."
        )


    # =====================================================
    # OTHER ERROR
    # =====================================================

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


    # =====================================================
    # CLOSE DATABASE
    # =====================================================

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

@app.route("/register", methods=["POST"])
def register():

    db = None
    cursor = None

    try:

        # -------------------------------------------------
        # GET DATA
        # -------------------------------------------------
        #
        # Supports JSON and normal HTML form
        #

        data = request.get_json(silent=True)


        if data:

            username = data.get("username")
            email = data.get("email")
            phone = data.get("phone")
            password = data.get("password")

        else:

            username = request.form.get("username")
            email = request.form.get("email")
            phone = request.form.get("phone")
            password = request.form.get("password")


        # -------------------------------------------------
        # CLEAN DATA
        # -------------------------------------------------

        if username:

            username = username.strip()


        if email:

            email = email.strip().lower()


        if phone:

            phone = phone.strip()


        # -------------------------------------------------
        # CHECK EMPTY FIELDS
        # -------------------------------------------------

        if not username or not email or not phone or not password:

            return jsonify({
                "success": False,
                "message": "Please fill all fields."
            }), 400


        # -------------------------------------------------
        # DATABASE CONNECTION
        # -------------------------------------------------

        db = get_db_connection()


        if not db.is_connected():

            return jsonify({
                "success": False,
                "message": "Database connection failed."
            }), 500


        print("----------------------------------------")
        print("DATABASE CONNECTED")
        print("----------------------------------------")


        cursor = db.cursor()


        # -------------------------------------------------
        # CHECK EXISTING USER
        # -------------------------------------------------

        check_query = """
            SELECT id
            FROM users
            WHERE username = %s
               OR email = %s
        """

        cursor.execute(
            check_query,
            (username, email)
        )


        existing_user = cursor.fetchone()


        if existing_user:

            return jsonify({
                "success": False,
                "message": "Username or Email already exists."
            }), 409


        # -------------------------------------------------
        # HASH PASSWORD
        # -------------------------------------------------

        password_hash = generate_password_hash(password)


        # -------------------------------------------------
        # INSERT USER
        # -------------------------------------------------

        insert_query = """
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
        """


        cursor.execute(
            insert_query,
            (
                username,
                email,
                phone,
                password_hash
            )
        )


        # -------------------------------------------------
        # GET NEW USER ID
        # -------------------------------------------------

        new_user_id = cursor.lastrowid


        # -------------------------------------------------
        # SAVE
        # -------------------------------------------------

        db.commit()


        print("----------------------------------------")
        print("NEW USER REGISTERED")
        print("User ID :", new_user_id)
        print("Username:", username)
        print("Email   :", email)
        print("Phone   :", phone)
        print("----------------------------------------")


        # -------------------------------------------------
        # SUCCESS
        # -------------------------------------------------

        return jsonify({
            "success": True,
            "message": "Registration successful!",
            "user_id": new_user_id,
            "username": username
        }), 201


    # =====================================================
    # MYSQL ERROR
    # =====================================================

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
            "message": "Database error occurred."
        }), 500


    # =====================================================
    # OTHER ERROR
    # =====================================================

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


    # =====================================================
    # CLOSE DATABASE
    # =====================================================

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
# ADMIN PANEL
# =========================================================

@app.route("/admin")
def admin():

    # Login required
    if "user_id" not in session:
        return redirect(url_for("login"))

    db = None
    cursor = None

    try:

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT *
            FROM products
            ORDER BY id DESC
        """)

        products = cursor.fetchall()

        return render_template(
            "admin.html",
            products=products
        )

    except Error as error:

        print("----------------------------------------")
        print("ADMIN ERROR")
        print(error)
        print("----------------------------------------")

        return render_template(
            "admin.html",
            products=[]
        )

    finally:

        if cursor:
            cursor.close()

        if db:
            if db.is_connected():
                db.close()


# =========================================================
# GET ALL PRODUCTS
# =========================================================

@app.route("/api/products", methods=["GET"])
def get_products():

    db = None
    cursor = None

    try:

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT *
            FROM products
            WHERE status = 'active'
            ORDER BY id DESC
        """)

        products = cursor.fetchall()

        return jsonify(products), 200

    except Error as error:

        print("PRODUCT FETCH ERROR:", error)

        return jsonify({
            "success": False,
            "message": "Unable to load products."
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            if db.is_connected():
                db.close()


# =========================================================
# ADD PRODUCT
# =========================================================

@app.route("/admin/add-product", methods=["POST"])
def add_product():

    db = None
    cursor = None

    try:

        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No product data received."
            }), 400

        name = data.get("name")
        category = data.get("category")
        price = data.get("price", 0)
        old_price = data.get("old_price", 0)
        stock = data.get("stock", 0)
        image = data.get("image", "")
        description = data.get("description", "")

        # -----------------------------------------
        # VALIDATION
        # -----------------------------------------

        if not name:
            return jsonify({
                "success": False,
                "message": "Product name is required."
            }), 400

        try:
            price = float(price)
            old_price = float(old_price or 0)
            stock = int(stock or 0)
        except (ValueError, TypeError):

            return jsonify({
                "success": False,
                "message": "Invalid price or stock."
            }), 400

        # -----------------------------------------
        # DATABASE
        # -----------------------------------------

        db = get_db_connection()
        cursor = db.cursor()

        query = """
            INSERT INTO products
            (
                name,
                category,
                price,
                old_price,
                stock,
                image,
                description,
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
        """

        cursor.execute(
            query,
            (
                name,
                category,
                price,
                old_price,
                stock,
                image,
                description
            )
        )

        product_id = cursor.lastrowid

        db.commit()

        return jsonify({
            "success": True,
            "message": "Product added successfully!",
            "product_id": product_id
        }), 201

    except Error as error:

        if db:
            db.rollback()

        print("----------------------------------------")
        print("ADD PRODUCT ERROR")
        print(error)
        print("----------------------------------------")

        return jsonify({
            "success": False,
            "message": "Database error while adding product."
        }), 500

    except Exception as error:

        if db:
            db.rollback()

        print("ADD PRODUCT ERROR:", error)

        return jsonify({
            "success": False,
            "message": "Something went wrong."
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            if db.is_connected():
                db.close()


# =========================================================
# UPDATE PRODUCT
# =========================================================

@app.route(
    "/admin/update-product/<int:product_id>",
    methods=["PUT"]
)
def update_product(product_id):

    db = None
    cursor = None

    try:

        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No product data received."
            }), 400

        name = data.get("name")
        category = data.get("category")
        price = data.get("price", 0)
        old_price = data.get("old_price", 0)
        stock = data.get("stock", 0)
        image = data.get("image", "")
        description = data.get("description", "")

        if not name:
            return jsonify({
                "success": False,
                "message": "Product name is required."
            }), 400

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Check product
        cursor.execute(
            """
            SELECT id
            FROM products
            WHERE id = %s
            """,
            (product_id,)
        )

        product = cursor.fetchone()

        if not product:

            return jsonify({
                "success": False,
                "message": "Product not found."
            }), 404

        # Update
        cursor.execute(
            """
            UPDATE products
            SET
                name = %s,
                category = %s,
                price = %s,
                old_price = %s,
                stock = %s,
                image = %s,
                description = %s
            WHERE id = %s
            """,
            (
                name,
                category,
                price,
                old_price,
                stock,
                image,
                description,
                product_id
            )
        )

        db.commit()

        return jsonify({
            "success": True,
            "message": "Product updated successfully!"
        }), 200

    except Error as error:

        if db:
            db.rollback()

        print("UPDATE PRODUCT ERROR:", error)

        return jsonify({
            "success": False,
            "message": "Database error."
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            if db.is_connected():
                db.close()


# =========================================================
# DELETE PRODUCT
# =========================================================

@app.route(
    "/admin/delete-product/<int:product_id>",
    methods=["DELETE"]
)
def delete_product(product_id):

    db = None
    cursor = None

    try:

        db = get_db_connection()
        cursor = db.cursor()

        cursor.execute(
            """
            DELETE FROM products
            WHERE id = %s
            """,
            (product_id,)
        )

        if cursor.rowcount == 0:

            return jsonify({
                "success": False,
                "message": "Product not found."
            }), 404

        db.commit()

        return jsonify({
            "success": True,
            "message": "Product deleted successfully!"
        }), 200

    except Error as error:

        if db:
            db.rollback()

        print("DELETE PRODUCT ERROR:", error)

        return jsonify({
            "success": False,
            "message": "Database error."
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            if db.is_connected():
                db.close()            
# to conect profile ----------------------------------------------------------
@app.route("/My profile")
def profile():
    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template("profile.html")
   

# =========================================================
# LOGOUT
# =========================================================

@app.route("/logout", methods=["GET"])
def logout():

    session.clear()

    return redirect(url_for("home"))


# =========================================================
# CHECK CURRENT SESSION
# =========================================================

@app.route("/check-session", methods=["GET"])
def check_session():

    if "user_id" in session:

        return jsonify({
            "logged_in": True,
            "user_id": session["user_id"],
            "username": session.get("username"),
            "email": session.get("email")
        })


    return jsonify({
        "logged_in": False
    })


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
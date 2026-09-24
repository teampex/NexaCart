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


          
# to conect profile ----------------------------------------------------------
@app.route("/My profile")
def profile():
    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template("profile.html")
@app.route("/admin/register", methods=["GET", "POST"])
def admin_register():

    if request.method == "POST":

        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        phone = request.form.get("phone", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not username or not email or not phone or not password or not confirm_password:
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
                error="Password must be at least 6 characters."
            )

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM admin_users
            WHERE username = %s
               OR email = %s
               OR phone = %s
            """,
            (username, email, phone)
        )

        existing_admin = cursor.fetchone()

        if existing_admin:
            cursor.close()
            conn.close()

            return render_template(
                "admin_register.html",
                error="Username, email or phone number already exists."
            )

        hashed_password = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO admin_users
            (username, email, phone, password)
            VALUES (%s, %s, %s, %s)
            """,
            (username, email, phone, hashed_password)
        )

        conn.commit()

        cursor.close()
        conn.close()

        return redirect(url_for("admin_login"))

    return render_template("admin_register.html")    
   

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

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():

    if session.get("admin_logged_in"):
        return redirect(url_for("admin_dashboard"))

    if request.method == "POST":

        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        if not username or not password:
            return render_template(
                "admin_login.html",
                error="Please enter username and password."
            )

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, username, password
            FROM admin_users
            WHERE username = %s
            """,
            (username,)
        )

        admin = cursor.fetchone()

        cursor.close()
        conn.close()

        if admin and check_password_hash(admin["password"], password):

            session["admin_logged_in"] = True
            session["admin_id"] = admin["id"]
            session["admin_username"] = admin["username"]

            return redirect(url_for("admin_dashboard"))

        return render_template(
            "admin_login.html",
            error="Invalid admin username or password."
        )

    return render_template("admin_login.html")
@app.route("/admin")
def admin_dashboard():

    if not session.get("admin_logged_in"):
        return redirect(url_for("admin_login"))

    return render_template(
        "admin_dashboard.html",
        admin_username=session.get("admin_username", "Admin")
    )
@app.route("/admin/logout")
def admin_logout():

    session.pop("admin_logged_in", None)
    session.pop("admin_id", None)
    session.pop("admin_username", None)

    return redirect(url_for("admin_login"))
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
from flask import Flask, render_template, request, jsonify, session, redirect
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash


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
# MAKE SESSION AVAILABLE IN ALL HTML PAGES
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
# LOGIN PAGE
# =========================================================

@app.route("/login", methods=["GET"])
def login_page():

    # If user is already logged in,
    # don't show login page again.
    if "user_id" in session:

        return redirect("/")

    return render_template("index.html")


# =========================================================
# CUSTOMER REGISTER
# =========================================================

@app.route("/register", methods=["POST"])
def register():

    db = None
    cursor = None

    try:

        # -------------------------------------------------
        # GET JSON DATA
        # -------------------------------------------------

        data = request.get_json(silent=True)

        if not data:

            return jsonify({
                "success": False,
                "message": "No registration data received."
            }), 400


        # -------------------------------------------------
        # GET FORM VALUES
        # -------------------------------------------------

        username = data.get("username")
        email = data.get("email")
        phone = data.get("phone")
        password = data.get("password")


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
        # CONNECT DATABASE
        # -------------------------------------------------

        db = get_db_connection()

        if not db.is_connected():

            return jsonify({
                "success": False,
                "message": "Database connection failed."
            }), 500


        print("Database connected successfully.")


        cursor = db.cursor()


        # -------------------------------------------------
        # CHECK EXISTING USERNAME / EMAIL
        # -------------------------------------------------

        check_query = """
            SELECT id
            FROM users
            WHERE username = %s OR email = %s
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
        # GET USER ID
        # -------------------------------------------------

        new_user_id = cursor.lastrowid


        # -------------------------------------------------
        # SAVE DATABASE
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
            "user_id": new_user_id
        }), 201


    # =====================================================
    # MYSQL ERROR
    # =====================================================

    except Error as error:

        if db:

            try:
                db.rollback()
            except:
                pass


        print("----------------------------------------")
        print("MYSQL ERROR DURING REGISTRATION")
        print(error)
        print("----------------------------------------")


        return jsonify({
            "success": False,
            "message": "Database error occurred.",
            "error": str(error)
        }), 500


    # =====================================================
    # OTHER ERROR
    # =====================================================

    except Exception as error:

        if db:

            try:
                db.rollback()
            except:
                pass


        print("----------------------------------------")
        print("REGISTRATION ERROR")
        print(error)
        print("----------------------------------------")


        return jsonify({
            "success": False,
            "message": "Something went wrong.",
            "error": str(error)
        }), 500


    # =====================================================
    # CLOSE DATABASE
    # =====================================================

    finally:

        if cursor:

            try:
                cursor.close()
            except:
                pass


        if db:

            try:

                if db.is_connected():
                    db.close()

            except:
                pass


# =========================================================
# CUSTOMER LOGIN
# =========================================================

@app.route("/login", methods=["POST"])
def login():

    db = None
    cursor = None

    try:

        # -------------------------------------------------
        # GET JSON DATA
        # -------------------------------------------------

        data = request.get_json(silent=True)

        if not data:

            return jsonify({
                "success": False,
                "message": "No login data received."
            }), 400


        # -------------------------------------------------
        # GET USERNAME & PASSWORD
        # -------------------------------------------------

        username = data.get("username")
        password = data.get("password")


        # -------------------------------------------------
        # CLEAN USERNAME
        # -------------------------------------------------

        if username:
            username = username.strip()


        # -------------------------------------------------
        # CHECK EMPTY FIELDS
        # -------------------------------------------------

        if not username or not password:

            return jsonify({
                "success": False,
                "message": "Username and password are required."
            }), 400


        # -------------------------------------------------
        # CONNECT DATABASE
        # -------------------------------------------------

        db = get_db_connection()

        if not db.is_connected():

            return jsonify({
                "success": False,
                "message": "Database connection failed."
            }), 500


        cursor = db.cursor(dictionary=True)


        # -------------------------------------------------
        # FIND USER
        # -------------------------------------------------

        query = """
            SELECT *
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

            return jsonify({
                "success": False,
                "message": "Invalid username or password."
            }), 401


        # -------------------------------------------------
        # CHECK PASSWORD
        # -------------------------------------------------

        password_valid = check_password_hash(
            user["password_hash"],
            password
        )


        if not password_valid:

            return jsonify({
                "success": False,
                "message": "Invalid username or password."
            }), 401


        # -------------------------------------------------
        # SAVE USER SESSION
        # -------------------------------------------------

        session["user_id"] = user["id"]
        session["username"] = user["username"]


        print("----------------------------------------")
        print("USER LOGIN SUCCESSFUL")
        print("User ID :", user["id"])
        print("Username:", user["username"])
        print("----------------------------------------")


        # -------------------------------------------------
        # LOGIN SUCCESS
        # -------------------------------------------------

        return jsonify({
            "success": True,
            "message": "Login successful!",
            "username": user["username"]
        }), 200


    # =====================================================
    # MYSQL ERROR
    # =====================================================

    except Error as error:

        print("----------------------------------------")
        print("MYSQL LOGIN ERROR")
        print(error)
        print("----------------------------------------")


        return jsonify({
            "success": False,
            "message": "Database error occurred.",
            "error": str(error)
        }), 500


    # =====================================================
    # OTHER ERROR
    # =====================================================

    except Exception as error:

        print("----------------------------------------")
        print("LOGIN ERROR")
        print(error)
        print("----------------------------------------")


        return jsonify({
            "success": False,
            "message": "Something went wrong.",
            "error": str(error)
        }), 500


    # =====================================================
    # CLOSE DATABASE
    # =====================================================

    finally:

        if cursor:

            try:
                cursor.close()
            except:
                pass


        if db:

            try:

                if db.is_connected():
                    db.close()

            except:
                pass


# =========================================================
# LOGOUT
# =========================================================

@app.route("/logout", methods=["GET"])
def logout():

    session.clear()

    return redirect("/")


# =========================================================
# CHECK CURRENT LOGIN
# =========================================================

@app.route("/check-session", methods=["GET"])
def check_session():

    if "user_id" in session:

        return jsonify({
            "logged_in": True,
            "user_id": session["user_id"],
            "username": session["username"]
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
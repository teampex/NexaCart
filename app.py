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

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)

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

@app.route("/")
def home():

    return render_template(
        "home.html"
    )


@app.route("/home")
def home_page():

    return render_template(
        "home.html"
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

    try:

        data = request.get_json(
            silent=True
        )


        if data:

            username = data.get(
                "username"
            )

            password = data.get(
                "password"
            )

        else:

            username = request.form.get(
                "username"
            )

            password = request.form.get(
                "password"
            )


        if username:

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
                password_hash
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


        password_valid = check_password_hash(
            user["password_hash"],
            password
        )


        if not password_valid:

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


        # -------------------------------------------------
        # CUSTOMER SESSION
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
                "message": (
                    "Something went wrong."
                )
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

    try:

        data = request.get_json(
            silent=True
        )


        if data:

            username = data.get(
                "username"
            )

            email = data.get(
                "email"
            )

            phone = data.get(
                "phone"
            )

            password = data.get(
                "password"
            )

        else:

            username = request.form.get(
                "username"
            )

            email = request.form.get(
                "email"
            )

            phone = request.form.get(
                "phone"
            )

            password = request.form.get(
                "password"
            )


        if username:

            username = username.strip()


        if email:

            email = email.strip().lower()


        if phone:

            phone = phone.strip()


        if (
            not username
            or not email
            or not phone
            or not password
        ):

            return jsonify({
                "success": False,
                "message": (
                    "Please fill all fields."
                )
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
            "message": (
                "Something went wrong."
            )
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
# =========================================================
# ADMIN SYSTEM
# =========================================================
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
                error=(
                    "Passwords do not match."
                )
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


        # =================================================
        # GET ALL SELLERS
        # =================================================

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


        # =================================================
        # GET ALL USERS
        # =================================================

        cursor.execute(
            """
            SELECT
                id,
                username,
                email,
                phone,
                created_at

            FROM users

            ORDER BY id DESC
            """
        )


        users = cursor.fetchall()


        # =================================================
        # TOTAL SELLERS
        # =================================================

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM seller_users
            """
        )


        total_sellers = (
            cursor.fetchone()["total"]
        )


        # =================================================
        # ACTIVE SELLERS
        # =================================================

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM seller_users
            WHERE status = 'active'
            """
        )


        active_sellers = (
            cursor.fetchone()["total"]
        )


        # =================================================
        # BLOCKED SELLERS
        # =================================================

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM seller_users
            WHERE status = 'blocked'
            """
        )


        blocked_sellers = (
            cursor.fetchone()["total"]
        )


        # =================================================
        # TOTAL USERS
        # =================================================

        total_users = len(users)


        # =================================================
        # RENDER ADMIN DASHBOARD
        # =================================================

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

            total_users=total_users
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
# ADMIN - VIEW SINGLE SELLER
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


        return render_template(
            "admin_dashboard.html",

            admin_username=session.get(
                "admin_username",
                "Admin"
            ),

            sellers=[seller],

            users=[],

            total_sellers=1,

            active_sellers=(
                1
                if seller["status"] == "active"
                else 0
            ),

            blocked_sellers=(
                1
                if seller["status"] == "blocked"
                else 0
            ),

            total_users=0,

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
# ADMIN - VIEW SINGLE USER
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


        # -----------------------------------------------
        # Currently dashboard user section is table based.
        # Store selected user so HTML/JS can use it later.
        # -----------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                username,
                email,
                phone,
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


        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM seller_users
            """
        )


        total_sellers = (
            cursor.fetchone()["total"]
        )


        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM seller_users
            WHERE status = 'active'
            """
        )


        active_sellers = (
            cursor.fetchone()["total"]
        )


        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM seller_users
            WHERE status = 'blocked'
            """
        )


        blocked_sellers = (
            cursor.fetchone()["total"]
        )


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

            total_users=len(users),

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
# ADMIN - BLOCK / UNBLOCK SELLER
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


        print("----------------------------------------")
        print("SELLER STATUS UPDATED")
        print("Seller ID:", seller_id)
        print("Status   :", status)
        print("----------------------------------------")


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
# ADMIN - DELETE SELLER
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


        deleted_rows = cursor.rowcount


        conn.commit()


        if deleted_rows == 0:

            print("----------------------------------------")
            print("SELLER NOT FOUND")
            print("Seller ID:", seller_id)
            print("----------------------------------------")

        else:

            print("----------------------------------------")
            print("SELLER DELETED")
            print("Seller ID:", seller_id)
            print("----------------------------------------")


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
# =========================================================
# SELLER SYSTEM
# =========================================================
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


        # -------------------------------------------------
        # NEW SELLER = ACTIVE
        # -------------------------------------------------

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


        # -------------------------------------------------
        # BLOCKED SELLER
        # -------------------------------------------------

        if seller["status"] == "blocked":

            return render_template(
                "seller_login.html",
                error=(
                    "Your seller account has "
                    "been blocked by admin."
                )
            )


        # -------------------------------------------------
        # PASSWORD CHECK
        # -------------------------------------------------

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


        # -------------------------------------------------
        # SELLER SESSION
        # -------------------------------------------------

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


    return render_template(
        "seller_dashboard.html",

        seller_name=session.get(
            "seller_name",
            "Seller"
        ),

        seller_email=session.get(
            "seller_email",
            ""
        )
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
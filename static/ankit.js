document.addEventListener("DOMContentLoaded", function () {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const authWrapper = document.getElementById("authWrapper");

    const registerTrigger =
        document.getElementById("registerTrigger");

    const loginTrigger =
        document.getElementById("loginTrigger");

    const loginForm =
        document.getElementById("loginForm");

    const registerForm =
        document.getElementById("registerForm");


    // =========================================================
    // SWITCH TO REGISTER
    // =========================================================

    if (registerTrigger) {

        registerTrigger.addEventListener("click", function (event) {

            event.preventDefault();

            if (authWrapper) {
                authWrapper.classList.add("toggled");
            }

        });

    }


    // =========================================================
    // SWITCH BACK TO LOGIN
    // =========================================================

    if (loginTrigger) {

        loginTrigger.addEventListener("click", function (event) {

            event.preventDefault();

            if (authWrapper) {
                authWrapper.classList.remove("toggled");
            }

        });

    }


    // =========================================================
    // CUSTOMER LOGIN
    // =========================================================

    if (loginForm) {

        loginForm.addEventListener("submit", async function (event) {

            event.preventDefault();


            const username =
                document.getElementById("loginUsername").value.trim();

            const password =
                document.getElementById("loginPassword").value;


            if (!username || !password) {

                alert("Please enter username and password.");

                return;

            }


            try {

                const response = await fetch("/login", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        username: username,
                        password: password
                    })

                });


                const data = await response.json();


                if (data.success) {

                    alert(data.message);

                    console.log(
                        "Logged in user:",
                        data.username
                    );


                    // =================================================
                    // LOGIN SUCCESS → GO TO HOME PAGE
                    // =================================================

                    window.location.href = "/";


                } else {

                    alert(data.message);

                }


            } catch (error) {

                console.error(
                    "Login Error:",
                    error
                );

                alert(
                    "Something went wrong. Please try again."
                );

            }

        });

    }


    // =========================================================
    // CUSTOMER REGISTER
    // =========================================================

    if (registerForm) {

        registerForm.addEventListener("submit", async function (event) {

            event.preventDefault();


            const username =
                document.getElementById("registerUsername").value.trim();

            const email =
                document.getElementById("registerEmail").value.trim();

            const phone =
                document.getElementById("registerPhone").value.trim();

            const password =
                document.getElementById("registerPassword").value;


            if (
                !username ||
                !email ||
                !phone ||
                !password
            ) {

                alert("Please fill all fields.");

                return;

            }


            try {

                const response = await fetch("/register", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        username: username,

                        email: email,

                        phone: phone,

                        password: password

                    })

                });


                const data = await response.json();


                if (data.success) {

                    alert(data.message);


                    // =================================================
                    // CLEAR REGISTRATION FIELDS
                    // =================================================

                    document.getElementById(
                        "registerUsername"
                    ).value = "";

                    document.getElementById(
                        "registerEmail"
                    ).value = "";

                    document.getElementById(
                        "registerPhone"
                    ).value = "";

                    document.getElementById(
                        "registerPassword"
                    ).value = "";


                    // =================================================
                    // GO BACK TO LOGIN
                    // =================================================

                    if (authWrapper) {

                        authWrapper.classList.remove(
                            "toggled"
                        );

                    }


                } else {

                    alert(data.message);

                }


            } catch (error) {

                console.error(
                    "Registration Error:",
                    error
                );

                alert(
                    "Something went wrong. Please try again."
                );

            }

        });

    }

});
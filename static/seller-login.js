document.addEventListener("DOMContentLoaded", function () {

    const loginForm =
        document.getElementById("sellerLoginForm");

    const passwordInput =
        document.getElementById("password");

    const passwordToggle =
        document.getElementById("passwordToggle");

    const loginButton =
        document.getElementById("loginButton");

    const buttonContent =
        loginButton?.querySelector(".button-content");

    const buttonLoader =
        loginButton?.querySelector(".button-loader");

    const rememberMe =
        document.getElementById("rememberMe");

    const emailInput =
        document.getElementById("email");

    const serverError =
        document.getElementById("serverError");


    /* =========================================
       LOAD REMEMBERED EMAIL
    ========================================= */

    const savedEmail =
        localStorage.getItem("nexacart_seller_email");

    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;

        if (rememberMe) {
            rememberMe.checked = true;
        }
    }


    /* =========================================
       PASSWORD SHOW / HIDE
    ========================================= */

    if (passwordToggle && passwordInput) {

        passwordToggle.addEventListener(
            "click",
            function () {

                const isPassword =
                    passwordInput.type === "password";

                passwordInput.type =
                    isPassword
                        ? "text"
                        : "password";

                const icon =
                    passwordToggle.querySelector("i");

                if (icon) {

                    icon.classList.toggle(
                        "fa-eye",
                        !isPassword
                    );

                    icon.classList.toggle(
                        "fa-eye-slash",
                        isPassword
                    );

                }

                passwordToggle.setAttribute(
                    "aria-label",
                    isPassword
                        ? "Hide password"
                        : "Show password"
                );

            }
        );

    }


    /* =========================================
       REMOVE SERVER ERROR WHILE TYPING
    ========================================= */

    [emailInput, passwordInput].forEach(
        function (input) {

            if (!input) return;

            input.addEventListener(
                "input",
                function () {

                    if (serverError) {
                        serverError.style.display =
                            "none";
                    }

                }
            );

        }
    );


    /* =========================================
       FORM SUBMIT
    ========================================= */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            function (event) {

                const email =
                    emailInput.value.trim();

                const password =
                    passwordInput.value;

                if (!email) {

                    event.preventDefault();

                    alert(
                        "Please enter your email address."
                    );

                    emailInput.focus();

                    return;
                }


                if (!password) {

                    event.preventDefault();

                    alert(
                        "Please enter your password."
                    );

                    passwordInput.focus();

                    return;
                }


                /* Remember email */

                if (rememberMe?.checked) {

                    localStorage.setItem(
                        "nexacart_seller_email",
                        email
                    );

                } else {

                    localStorage.removeItem(
                        "nexacart_seller_email"
                    );

                }


                /* Loading state */

                if (loginButton) {

                    loginButton.classList.add(
                        "loading"
                    );

                }

                if (buttonContent) {
                    buttonContent.hidden = true;
                }

                if (buttonLoader) {
                    buttonLoader.hidden = false;
                }

            }
        );

    }


    /* =========================================
       FORGOT PASSWORD
    ========================================= */

    const forgotPassword =
        document.getElementById("forgotPassword");

    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                alert(
                    "Forgot password feature will be connected with seller OTP verification."
                );

            }
        );

    }


    /* =========================================
       AUTO FOCUS
    ========================================= */

    if (emailInput && !emailInput.value) {
        emailInput.focus();
    }

});
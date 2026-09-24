document.addEventListener("DOMContentLoaded", function () {

    const form =
        document.getElementById("sellerRegisterForm");

    const nameInput =
        document.getElementById("name");

    const phoneInput =
        document.getElementById("phone");

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const confirmPasswordInput =
        document.getElementById("confirm_password");

    const passwordToggle =
        document.getElementById("passwordToggle");

    const confirmPasswordToggle =
        document.getElementById(
            "confirmPasswordToggle"
        );


    /* =========================================
       PASSWORD TOGGLE
    ========================================= */

    function setupPasswordToggle(
        button,
        input
    ) {

        if (!button || !input) return;

        button.addEventListener(
            "click",
            function () {

                const show =
                    input.type === "password";

                input.type =
                    show
                        ? "text"
                        : "password";

                const icon =
                    button.querySelector("i");

                if (icon) {

                    icon.classList.toggle(
                        "fa-eye",
                        !show
                    );

                    icon.classList.toggle(
                        "fa-eye-slash",
                        show
                    );

                }

            }
        );

    }

    setupPasswordToggle(
        passwordToggle,
        passwordInput
    );

    setupPasswordToggle(
        confirmPasswordToggle,
        confirmPasswordInput
    );


    /* =========================================
       PHONE ONLY NUMBERS
    ========================================= */

    phoneInput.addEventListener(
        "input",
        function () {

            phoneInput.value =
                phoneInput.value
                    .replace(/\D/g, "")
                    .slice(0, 15);

        }
    );


    /* =========================================
       FORM VALIDATION
    ========================================= */

    form.addEventListener(
        "submit",
        function (event) {

            const name =
                nameInput.value.trim();

            const phone =
                phoneInput.value.trim();

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;


            if (!name) {

                event.preventDefault();

                alert(
                    "Please enter your name."
                );

                nameInput.focus();

                return;
            }


            if (!phone) {

                event.preventDefault();

                alert(
                    "Please enter your phone number."
                );

                phoneInput.focus();

                return;
            }


            if (phone.length < 10) {

                event.preventDefault();

                alert(
                    "Please enter a valid phone number."
                );

                phoneInput.focus();

                return;
            }


            if (!email) {

                event.preventDefault();

                alert(
                    "Please enter your email."
                );

                emailInput.focus();

                return;
            }


            if (!password) {

                event.preventDefault();

                alert(
                    "Please create a password."
                );

                passwordInput.focus();

                return;
            }


            if (password.length < 6) {

                event.preventDefault();

                alert(
                    "Password must be at least 6 characters."
                );

                passwordInput.focus();

                return;
            }


            if (
                password !==
                confirmPassword
            ) {

                event.preventDefault();

                alert(
                    "Passwords do not match."
                );

                confirmPasswordInput.focus();

                return;
            }

        }
    );

});
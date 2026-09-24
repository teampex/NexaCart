"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminLoginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const rememberMe = document.getElementById("rememberMe");

    const passwordToggle = document.getElementById("passwordToggle");
    const loginButton = document.getElementById("loginButton");

    const usernameStatus = document.getElementById("usernameStatus");
    const passwordStatus = document.getElementById("passwordStatus");

    const STORAGE_KEY = "nexacart_admin_username";

    /* ================================
       LOAD REMEMBERED USERNAME
    ================================= */
    try {
        const savedUsername = localStorage.getItem(STORAGE_KEY);

        if (savedUsername && usernameInput) {
            usernameInput.value = savedUsername;

            if (rememberMe) {
                rememberMe.checked = true;
            }

            updateInputStatus(usernameInput, usernameStatus, true);
        }
    } catch (error) {
        console.warn("Could not read remembered username.");
    }


    /* ================================
       PASSWORD SHOW / HIDE
    ================================= */
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener("click", () => {
            const isPassword = passwordInput.type === "password";

            passwordInput.type = isPassword ? "text" : "password";

            const icon = passwordToggle.querySelector("i");

            if (icon) {
                icon.classList.toggle("fa-eye", !isPassword);
                icon.classList.toggle("fa-eye-slash", isPassword);
            }

            passwordToggle.setAttribute(
                "aria-label",
                isPassword ? "Hide password" : "Show password"
            );

            passwordInput.focus();
        });
    }


    /* ================================
       INPUT STATUS
    ================================= */
    if (usernameInput) {
        usernameInput.addEventListener("input", () => {
            const value = usernameInput.value.trim();

            updateInputStatus(
                usernameInput,
                usernameStatus,
                value.length > 0
            );
        });

        usernameInput.addEventListener("blur", () => {
            const value = usernameInput.value.trim();

            updateInputStatus(
                usernameInput,
                usernameStatus,
                value.length > 0
            );
        });
    }


    if (passwordInput) {
        passwordInput.addEventListener("input", () => {
            const value = passwordInput.value;

            updateInputStatus(
                passwordInput,
                passwordStatus,
                value.length > 0
            );
        });

        passwordInput.addEventListener("blur", () => {
            const value = passwordInput.value;

            updateInputStatus(
                passwordInput,
                passwordStatus,
                value.length > 0
            );
        });
    }


    /* ================================
       REMOVE SERVER ERROR WHILE TYPING
    ================================= */
    const errorBox = document.querySelector(".login-error");

    if (errorBox) {
        [usernameInput, passwordInput].forEach((input) => {
            if (!input) return;

            input.addEventListener("input", () => {
                errorBox.classList.add("error-fading");

                setTimeout(() => {
                    if (errorBox) {
                        errorBox.style.display = "none";
                    }
                }, 250);
            });
        });
    }


    /* ================================
       FORM SUBMIT
    ================================= */
    if (form) {
        form.addEventListener("submit", (event) => {
            const username = usernameInput
                ? usernameInput.value.trim()
                : "";

            const password = passwordInput
                ? passwordInput.value
                : "";

            /* Basic frontend validation */
            if (!username) {
                event.preventDefault();

                showInputError(
                    usernameInput,
                    usernameStatus,
                    "Username is required."
                );

                if (usernameInput) {
                    usernameInput.focus();
                }

                return;
            }

            if (!password) {
                event.preventDefault();

                showInputError(
                    passwordInput,
                    passwordStatus,
                    "Password is required."
                );

                if (passwordInput) {
                    passwordInput.focus();
                }

                return;
            }


            /* ================================
               REMEMBER USERNAME
            ================================= */
            try {
                if (rememberMe && rememberMe.checked) {
                    localStorage.setItem(STORAGE_KEY, username);
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (error) {
                console.warn("Could not save remembered username.");
            }


            /* ================================
               LOGIN BUTTON LOADING STATE
            ================================= */
            if (loginButton) {
                loginButton.classList.add("loading");
                loginButton.disabled = true;

                loginButton.setAttribute(
                    "aria-busy",
                    "true"
                );
            }

            /*
             * IMPORTANT:
             * Form is NOT prevented here.
             * Flask will receive the normal POST request.
             */
        });
    }


    /* ================================
       ENTER KEY SUPPORT
    ================================= */
    if (usernameInput && passwordInput) {
        usernameInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                passwordInput.focus();
            }
        });
    }


    /* ================================
       HELPERS
    ================================= */

    function updateInputStatus(input, status, valid) {
        if (!input) return;

        input.classList.toggle("valid", valid);

        if (status) {
            status.classList.toggle("visible", valid);
        }
    }


    function showInputError(input, status, message) {
        if (!input) return;

        input.classList.add("input-error");

        if (status) {
            status.classList.add("visible");
            status.textContent = message;
        }

        setTimeout(() => {
            input.classList.remove("input-error");

            if (status) {
                status.textContent = "";
                status.classList.remove("visible");
            }
        }, 2200);
    }


    /* ================================
       INITIAL FOCUS
    ================================= */
    if (
        usernameInput &&
        !usernameInput.value.trim()
    ) {
        usernameInput.focus();
    }
});
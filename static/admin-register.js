"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("adminRegisterForm");

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput =
        document.getElementById("confirm_password");

    const passwordToggle =
        document.getElementById("passwordToggle");

    const confirmPasswordToggle =
        document.getElementById("confirmPasswordToggle");

    const registerButton =
        document.getElementById("registerButton");


    /* =========================================
       PASSWORD SHOW / HIDE
    ========================================= */

    function setupPasswordToggle(input, button) {

        if (!input || !button) {
            return;
        }

        button.addEventListener("click", () => {

            const icon = button.querySelector("i");

            if (input.type === "password") {

                input.type = "text";

                if (icon) {
                    icon.classList.remove("fa-eye");
                    icon.classList.add("fa-eye-slash");
                }

                button.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                input.type = "password";

                if (icon) {
                    icon.classList.remove("fa-eye-slash");
                    icon.classList.add("fa-eye");
                }

                button.setAttribute(
                    "aria-label",
                    "Show password"
                );
            }

        });
    }


    setupPasswordToggle(
        passwordInput,
        passwordToggle
    );

    setupPasswordToggle(
        confirmPasswordInput,
        confirmPasswordToggle
    );


    /* =========================================
       PASSWORD STRENGTH
    ========================================= */

    let strengthBox = document.querySelector(
        ".password-strength"
    );

    if (!strengthBox && passwordInput) {

        strengthBox = document.createElement("div");

        strengthBox.className = "password-strength";

        strengthBox.innerHTML = `
            <div class="strength-track">
                <div class="strength-bar"></div>
            </div>

            <span class="strength-text">
                Password strength
            </span>
        `;

        const passwordGroup =
            passwordInput.closest(".form-group");

        if (passwordGroup) {
            passwordGroup.appendChild(strengthBox);
        }
    }


    const strengthBar =
        strengthBox?.querySelector(".strength-bar");

    const strengthText =
        strengthBox?.querySelector(".strength-text");


    function checkPasswordStrength(password) {

        if (!strengthBox || !strengthBar || !strengthText) {
            return;
        }

        if (!password) {

            strengthBox.classList.remove("show");

            strengthBar.style.width = "0%";

            return;
        }

        strengthBox.classList.add("show");

        let score = 0;

        if (password.length >= 6) {
            score++;
        }

        if (password.length >= 10) {
            score++;
        }

        if (/[A-Z]/.test(password)) {
            score++;
        }

        if (/[a-z]/.test(password)) {
            score++;
        }

        if (/[0-9]/.test(password)) {
            score++;
        }

        if (/[^A-Za-z0-9]/.test(password)) {
            score++;
        }


        if (score <= 2) {

            strengthBar.style.width = "33%";
            strengthBar.style.background = "#ef4444";

            strengthText.textContent =
                "Weak password";

            strengthText.style.color =
                "#dc2626";

        } else if (score <= 4) {

            strengthBar.style.width = "66%";
            strengthBar.style.background = "#f59e0b";

            strengthText.textContent =
                "Medium password";

            strengthText.style.color =
                "#d97706";

        } else {

            strengthBar.style.width = "100%";
            strengthBar.style.background = "#22c55e";

            strengthText.textContent =
                "Strong password";

            strengthText.style.color =
                "#16a34a";
        }
    }


    if (passwordInput) {

        passwordInput.addEventListener(
            "input",
            () => {

                checkPasswordStrength(
                    passwordInput.value
                );

                checkPasswordMatch();
            }
        );
    }


    /* =========================================
       PASSWORD MATCH
    ========================================= */

    let matchMessage =
        document.querySelector(".password-match");

    if (!matchMessage && confirmPasswordInput) {

        matchMessage = document.createElement("div");

        matchMessage.className =
            "password-match";

        const confirmGroup =
            confirmPasswordInput.closest(".form-group");

        if (confirmGroup) {
            confirmGroup.appendChild(matchMessage);
        }
    }


    function checkPasswordMatch() {

        if (
            !passwordInput ||
            !confirmPasswordInput ||
            !matchMessage
        ) {
            return true;
        }

        const password =
            passwordInput.value;

        const confirmPassword =
            confirmPasswordInput.value;


        if (!confirmPassword) {

            matchMessage.classList.remove(
                "show",
                "success",
                "error"
            );

            return true;
        }


        matchMessage.classList.add("show");


        if (password === confirmPassword) {

            matchMessage.classList.remove("error");
            matchMessage.classList.add("success");

            matchMessage.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                Passwords match
            `;

            return true;

        } else {

            matchMessage.classList.remove("success");
            matchMessage.classList.add("error");

            matchMessage.innerHTML = `
                <i class="fa-solid fa-circle-xmark"></i>
                Passwords do not match
            `;

            return false;
        }
    }


    if (confirmPasswordInput) {

        confirmPasswordInput.addEventListener(
            "input",
            checkPasswordMatch
        );
    }


    /* =========================================
       USERNAME CLEANUP
    ========================================= */

    if (usernameInput) {

        usernameInput.addEventListener(
            "input",
            () => {

                usernameInput.value =
                    usernameInput.value
                        .replace(/\s+/g, "")
                        .slice(0, 50);
            }
        );
    }


    /* =========================================
       FORM SUBMIT
    ========================================= */

    if (form) {

        form.addEventListener(
            "submit",
            (event) => {

                const username =
                    usernameInput
                        ? usernameInput.value.trim()
                        : "";

                const password =
                    passwordInput
                        ? passwordInput.value
                        : "";

                const confirmPassword =
                    confirmPasswordInput
                        ? confirmPasswordInput.value
                        : "";


                /* Username validation */

                if (!username) {

                    event.preventDefault();

                    showFieldError(
                        usernameInput,
                        "Please enter a username."
                    );

                    return;
                }


                if (username.length < 3) {

                    event.preventDefault();

                    showFieldError(
                        usernameInput,
                        "Username must be at least 3 characters."
                    );

                    return;
                }


                /* Password validation */

                if (!password) {

                    event.preventDefault();

                    showFieldError(
                        passwordInput,
                        "Please create a password."
                    );

                    return;
                }


                if (password.length < 6) {

                    event.preventDefault();

                    showFieldError(
                        passwordInput,
                        "Password must be at least 6 characters."
                    );

                    return;
                }


                /* Confirm password */

                if (
                    !confirmPassword ||
                    password !== confirmPassword
                ) {

                    event.preventDefault();

                    showFieldError(
                        confirmPasswordInput,
                        "Passwords do not match."
                    );

                    return;
                }


                /* =================================
                   ALLOW FLASK POST
                ================================= */

                if (registerButton) {

                    registerButton.disabled = true;

                    registerButton.innerHTML = `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        Creating Account...
                    `;
                }

            }
        );
    }


    /* =========================================
       FIELD ERROR
    ========================================= */

    function showFieldError(input, message) {

        if (!input) {
            return;
        }

        input.focus();

        input.style.borderColor = "#dc2626";

        input.style.boxShadow =
            "0 0 0 4px rgba(220, 38, 38, 0.08)";


        let error =
            input.parentElement
                ?.parentElement
                ?.querySelector(
                    ".field-error"
                );


        if (!error) {

            error = document.createElement("div");

            error.className = "field-error";

            error.style.marginTop = "7px";
            error.style.color = "#dc2626";
            error.style.fontSize = "11px";
            error.style.fontWeight = "600";

            input.parentElement
                ?.parentElement
                ?.appendChild(error);
        }


        error.innerHTML = `
            <i class="fa-solid fa-circle-exclamation"></i>
            ${message}
        `;


        setTimeout(() => {

            input.style.borderColor = "";
            input.style.boxShadow = "";

            if (error) {
                error.remove();
            }

        }, 2500);
    }


    /* =========================================
       CLEAR ERROR ON TYPING
    ========================================= */

    [
        usernameInput,
        passwordInput,
        confirmPasswordInput
    ].forEach((input) => {

        if (!input) {
            return;
        }

        input.addEventListener(
            "input",
            () => {

                input.style.borderColor = "";
                input.style.boxShadow = "";

                const parent =
                    input.parentElement
                        ?.parentElement;

                const error =
                    parent?.querySelector(
                        ".field-error"
                    );

                if (error) {
                    error.remove();
                }
            }
        );
    });


    /* =========================================
       AUTO FOCUS
    ========================================= */

    if (
        usernameInput &&
        !usernameInput.value
    ) {
        setTimeout(() => {
            usernameInput.focus();
        }, 400);
    }

});
/* =========================================================
   ELEMENTS
========================================================= */

const authWrapper =
    document.getElementById("authWrapper");

const registerTrigger =
    document.getElementById("registerTrigger");

const loginTrigger =
    document.getElementById("loginTrigger");

const loginForm =
    document.getElementById("loginForm");


/* Send seller and admin choices to their dedicated login pages. */
document
    .querySelectorAll('input[name="role"]')
    .forEach(function (roleInput) {

        roleInput.addEventListener(
            "change",
            function () {

                if (this.value === "seller") {
                    window.location.href = "/seller/login";
                } else if (this.value === "admin") {
                    window.location.href = "/admin/login";
                }
            }
        );
    });

const registerForm =
    document.getElementById("registerForm");


/* =========================================================
   OPEN REGISTER
========================================================= */

if (registerTrigger) {

    registerTrigger.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            authWrapper.classList.add("toggled");

        }
    );

}


/* =========================================================
   OPEN LOGIN
========================================================= */

if (loginTrigger) {

    loginTrigger.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            authWrapper.classList.remove("toggled");

        }
    );

}


/* =========================================================
   NORMAL LOGIN
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* GET SELECTED LOGIN ROLE */

            const selectedRole =
                document.querySelector(
                    'input[name="role"]:checked'
                );

            if (!selectedRole) {

                alert("Please select a login role.");

                return;
            }


            const role =
                selectedRole.value;


            /* GET USERNAME */

            const username =
                document
                    .getElementById("loginUsername")
                    .value
                    .trim();


            /* GET PASSWORD */

            const password =
                document
                    .getElementById("loginPassword")
                    .value;


            /* VALIDATION */

            if (
                username === "" ||
                password === ""
            ) {

                alert(
                    "Please enter Username and Password."
                );

                return;
            }


            try {

                /* SEND LOGIN REQUEST */

                const response =
                    await fetch(
                        `${window.location.pathname}${window.location.search}`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    username:
                                        username,

                                    password:
                                        password,

                                    role:
                                        role

                                })
                        }
                    );


                const result =
                    await response.json();


                console.log(
                    "LOGIN RESPONSE:",
                    result
                );


                /* =================================================
                   LOGIN SUCCESS
                ================================================= */

                if (result.success === true) {


                    /* SAVE USERNAME */

                    localStorage.setItem(
                        "nexacartUsername",
                        result.username
                    );


                    /* SAVE USER */

                    localStorage.setItem(
                        "nexacartUser",
                        JSON.stringify({

                            username:
                                result.username,

                            email:
                                result.email || "",

                            phone:
                                result.phone || "",

                            role:
                                result.role || role,

                            location:
                                "India"

                        })
                    );


                    /* SUCCESS MESSAGE */

                    alert(
                        "Login Successful!\nWelcome " +
                        result.username
                    );


                    /* =================================================
                       ROLE-BASED REDIRECT
                    ================================================= */

                    if (
                        result.role === "admin"
                    ) {

                        window.location.href =
                            "/admin";

                    }

                    else if (
                        result.role === "seller"
                    ) {

                        window.location.href =
                            "/seller";

                    }

                    else {

                        window.location.href =
                            result.next_url || "/";

                    }

                }

                else {

                    alert(
                        result.message ||
                        "Invalid username, password, or role."
                    );

                }

            }

            catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );

                alert(
                    "Server connection failed.\n" +
                    "Please make sure Flask is running."
                );

            }

        }
    );

}



/* =========================================================
   REGISTER
========================================================= */

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const username =
                document
                    .getElementById("registerUsername")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("registerEmail")
                    .value
                    .trim();


            const phone =
                document
                    .getElementById("registerPhone")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("registerPassword")
                    .value
                    .trim();


            if (
                username === "" ||
                email === "" ||
                phone === "" ||
                password === ""
            ) {

                alert(
                    "Please fill all fields."
                );

                return;
            }


            if (password.length < 6) {

                alert(
                    "Password must be at least 6 characters."
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        "/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    username:
                                        username,

                                    email:
                                        email,

                                    phone:
                                        phone,

                                    password:
                                        password

                                })
                        }
                    );


                const result =
                    await response.json();


                console.log(
                    "REGISTER RESPONSE:",
                    result
                );


                if (result.success === true) {

                    /* Save registered user */

                    localStorage.setItem(
                        "nexacartUser",
                        JSON.stringify({

                            username:
                                username,

                            email:
                                email,

                            phone:
                                phone,

                            location:
                                "India"

                        })
                    );


                    localStorage.setItem(
                        "nexacartUsername",
                        username
                    );


                    alert(
                        "Registration Successful!\nWelcome " +
                        username
                    );


                    /* Open Login */

                    authWrapper.classList.remove(
                        "toggled"
                    );

                }

                else {

                    alert(
                        result.message ||
                        "Registration failed."
                    );

                }

            }

            catch (error) {

                console.error(
                    "REGISTER ERROR:",
                    error
                );

                alert(
                    "Server connection failed.\n" +
                    "Please make sure Flask is running."
                );

            }

        }
    );

}


/* =========================================================
   OTP ELEMENTS
========================================================= */

const otpLoginTrigger =
    document.getElementById(
        "otpLoginTrigger"
    );

const otpPanel =
    document.getElementById(
        "otpPanel"
    );

const phoneStep =
    document.getElementById(
        "phoneStep"
    );

const otpStep =
    document.getElementById(
        "otpStep"
    );

const otpPhone =
    document.getElementById(
        "otpPhone"
    );

const sendOtpBtn =
    document.getElementById(
        "sendOtpBtn"
    );

const verifyOtpBtn =
    document.getElementById(
        "verifyOtpBtn"
    );

const backLoginBtn =
    document.getElementById(
        "backLoginBtn"
    );

const resendOtpBtn =
    document.getElementById(
        "resendOtpBtn"
    );

const maskedPhone =
    document.getElementById(
        "maskedPhone"
    );

const otpTimer =
    document.getElementById(
        "otpTimer"
    );

const otpBoxes =
    document.querySelectorAll(
        ".otp-box"
    );


let otpInterval = null;

let otpSeconds = 60;


/* =========================================================
   OPEN OTP LOGIN
========================================================= */

if (otpLoginTrigger) {

    otpLoginTrigger.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            loginForm.style.display =
                "none";


            otpPanel.classList.add(
                "otp-active"
            );


            phoneStep.hidden =
                false;

            otpStep.hidden =
                true;


            otpPhone.focus();

        }
    );

}


/* =========================================================
   START TIMER
========================================================= */

function startTimer() {

    clearInterval(
        otpInterval
    );


    otpSeconds = 60;

    resendOtpBtn.disabled =
        true;


    updateTimer();


    otpInterval =
        setInterval(
            function () {

                otpSeconds--;

                updateTimer();


                if (otpSeconds <= 0) {

                    clearInterval(
                        otpInterval
                    );

                    resendOtpBtn.disabled =
                        false;

                }

            },
            1000
        );

}


/* =========================================================
   UPDATE TIMER
========================================================= */

function updateTimer() {

    const seconds =
        otpSeconds
            .toString()
            .padStart(2, "0");


    otpTimer.textContent =
        "00:" + seconds;

}


/* =========================================================
   CLEAR OTP BOXES
========================================================= */

function clearOTPBoxes() {

    otpBoxes.forEach(
        box => {

            box.value = "";

            box.classList.remove(
                "otp-error"
            );

        }
    );

}


/* =========================================================
   SEND OTP
========================================================= */

if (sendOtpBtn) {

    sendOtpBtn.addEventListener(
        "click",
        async function () {

            const phone =
                otpPhone.value
                    .trim()
                    .replace(/\D/g, "");


            if (phone.length !== 10) {

                otpPhone.focus();


                otpPhone.parentElement
                    .classList.add(
                        "otp-error"
                    );


                setTimeout(
                    function () {

                        otpPhone.parentElement
                            .classList.remove(
                                "otp-error"
                            );

                    },
                    500
                );


                alert(
                    "Please enter a valid 10-digit mobile number."
                );

                return;

            }


            sendOtpBtn.disabled = true;
            try {
                const response = await fetch("/api/send-login-otp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone })
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.message || "Could not send the code.");

                maskedPhone.textContent = `${result.delivery.method} to ${result.delivery.destination}`;
                phoneStep.hidden = true;
                otpStep.hidden = false;
                clearOTPBoxes();
                startTimer();
                setTimeout(() => otpBoxes[0]?.focus(), 150);
            } catch (error) {
                alert(error.message);
            } finally {
                sendOtpBtn.disabled = false;
            }

        }
    );

}


/* =========================================================
   OTP BOX AUTO MOVE
========================================================= */

otpBoxes.forEach(
    function (box, index) {


        box.addEventListener(
            "input",
            function () {

                this.value =
                    this.value
                        .replace(/\D/g, "")
                        .slice(0, 1);


                if (
                    this.value &&
                    index < otpBoxes.length - 1
                ) {

                    otpBoxes[index + 1]
                        .focus();

                }

            }
        );


        box.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Backspace" &&
                    this.value === "" &&
                    index > 0
                ) {

                    otpBoxes[index - 1]
                        .focus();

                }

            }
        );


        box.addEventListener(
            "paste",
            function (event) {

                event.preventDefault();


                const pasted =
                    (
                        event.clipboardData
                            .getData("text") || ""
                    )
                        .replace(/\D/g, "")
                        .slice(0, 6);


                pasted
                    .split("")
                    .forEach(
                        function (digit, i) {

                            if (otpBoxes[i]) {

                                otpBoxes[i].value =
                                    digit;

                            }

                        }
                    );


                if (
                    pasted.length === 6
                ) {

                    otpBoxes[5].focus();

                }

            }
        );

    }
);


/* =========================================================
   GET ENTERED OTP
========================================================= */

function getEnteredOTP() {

    let otp = "";


    otpBoxes.forEach(
        function (box) {

            otp += box.value;

        }
    );


    return otp;

}


/* =========================================================
   VERIFY OTP
========================================================= */

if (verifyOtpBtn) {

    verifyOtpBtn.addEventListener(
        "click",
        async function () {

            const enteredOTP =
                getEnteredOTP();


            if (
                enteredOTP.length !== 6
            ) {

                otpBoxes.forEach(
                    function (box) {

                        box.classList.add(
                            "otp-error"
                        );

                    }
                );


                setTimeout(
                    function () {

                        otpBoxes.forEach(
                            function (box) {

                                box.classList.remove(
                                    "otp-error"
                                );

                            }
                        );

                    },
                    500
                );


                alert(
                    "Please enter the complete 6-digit OTP."
                );

                return;

            }


            verifyOtpBtn.disabled = true;
            try {
                const response = await fetch("/api/verify-login-otp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ otp: enteredOTP })
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.message || "Code verification failed.");
                otpPanel.classList.add("otp-success");
                window.location.href = result.next_url || "/";
            } catch (error) {
                alert(error.message);
            } finally {
                verifyOtpBtn.disabled = false;
            }

        }
    );

}


/* =========================================================
   RESEND OTP
========================================================= */

if (resendOtpBtn) {

    resendOtpBtn.addEventListener(
        "click",
        function () {

            if (
                resendOtpBtn.disabled
            ) {

                return;

            }


            clearOTPBoxes();
            sendOtpBtn.click();

        }
    );

}


/* =========================================================
   BACK TO NORMAL LOGIN
========================================================= */

if (backLoginBtn) {

    backLoginBtn.addEventListener(
        "click",
        function () {

            clearInterval(
                otpInterval
            );


            otpPanel.classList.remove(
                "otp-active",
                "otp-success"
            );


            phoneStep.hidden =
                false;

            otpStep.hidden =
                true;


            clearOTPBoxes();


            otpPhone.value = "";


            loginForm.style.display =
                "block";


            document
                .getElementById(
                    "loginUsername"
                )
                .focus();

        }
    );

}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

const forgotPassword =
    document.getElementById(
        "forgotPassword"
    );


if (forgotPassword) {

    forgotPassword.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            alert(
                "Forgot Password feature will be connected with OTP verification."
            );

        }
    );

}


/* =========================================================
   END
========================================================= */

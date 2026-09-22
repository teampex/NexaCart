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

            const username =
                document
                    .getElementById("loginUsername")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("loginPassword")
                    .value;

            if (username === "" || password === "") {

                alert(
                    "Please enter Username and Password."
                );

                return;
            }


            try {

                const response = await fetch(
                    "/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            username: username,
                            password: password
                        })
                    }
                );


                const result =
                    await response.json();


                console.log(
                    "LOGIN RESPONSE:",
                    result
                );


                /* =========================================
                   LOGIN SUCCESS
                ========================================= */

                if (result.success === true) {

                    /* Save username */

                    localStorage.setItem(
                        "nexacartUsername",
                        result.username
                    );


                    /* Save user */

                    localStorage.setItem(
                        "nexacartUser",
                        JSON.stringify({

                            username:
                                result.username,

                            email:
                                result.email || "",

                            phone:
                                result.phone || "",

                            location:
                                "India"

                        })
                    );


                    alert(
                        "Login Successful!\nWelcome " +
                        result.username
                    );


                    /* =====================================
                       GO TO FLASK HOME PAGE
                    ===================================== */

                    window.location.href = "/";

                }

                else {

                    alert(
                        result.message ||
                        "Invalid username or password."
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


let generatedOTP = "";

let otpInterval = null;

let otpSeconds = 30;

let currentPhone = "";


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
   GENERATE OTP
========================================================= */

function generateOTP() {

    generatedOTP =
        Math.floor(
            100000 +
            Math.random() * 900000
        ).toString();


    console.log(
        "NexaCart Demo OTP:",
        generatedOTP
    );


    /*
       DEMO ONLY

       Real SMS ke liye backend +
       SMS service/API required.
    */


    alert(
        "Demo OTP: " +
        generatedOTP
    );

}


/* =========================================================
   MASK PHONE
========================================================= */

function maskPhone(phone) {

    return (
        "******" +
        phone.slice(-4)
    );

}


/* =========================================================
   START TIMER
========================================================= */

function startTimer() {

    clearInterval(
        otpInterval
    );


    otpSeconds = 30;

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
        function () {

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


            currentPhone = phone;


            /* Generate demo OTP */

            generateOTP();


            /* Mask number */

            maskedPhone.textContent =
                maskPhone(phone);


            /* Change screen */

            phoneStep.hidden =
                true;

            otpStep.hidden =
                false;


            clearOTPBoxes();


            startTimer();


            setTimeout(
                function () {

                    otpBoxes[0].focus();

                },
                150
            );

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
        function () {

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


            if (
                enteredOTP !== generatedOTP
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
                    "Invalid OTP. Please try again."
                );

                return;

            }


            /* ================= SUCCESS ================= */

            otpPanel.classList.add(
                "otp-success"
            );


            /* =================================================
               FIND REGISTERED USER USING PHONE NUMBER
            ================================================= */

            let savedUser = null;


            const storedUser =
                localStorage.getItem(
                    "nexacartUser"
                );


            if (storedUser) {

                try {

                    savedUser =
                        JSON.parse(
                            storedUser
                        );

                }

                catch (error) {

                    savedUser = null;

                }

            }


            /* =================================================
               CHECK REGISTERED PHONE
            ================================================= */

            if (
                !savedUser ||
                !savedUser.phone
            ) {

                alert(
                    "No registered account found with this phone number."
                );


                otpPanel.classList.remove(
                    "otp-success"
                );

                return;

            }


            /* Remove spaces / +91 / non-numbers */

            const registeredPhone =
                savedUser.phone
                    .replace(/\D/g, "")
                    .slice(-10);


            const enteredPhone =
                currentPhone
                    .replace(/\D/g, "")
                    .slice(-10);


            /* =================================================
               PHONE MATCH
            ================================================= */

            if (
                registeredPhone !== enteredPhone
            ) {

                alert(
                    "This phone number is not registered with NexaCart."
                );


                otpPanel.classList.remove(
                    "otp-success"
                );

                return;

            }


            /* =================================================
               USERNAME FROM REGISTERED ACCOUNT
            ================================================= */

            const username =
                savedUser.username;


            /* Save username separately */

            localStorage.setItem(
                "nexacartUsername",
                username
            );


            /* Keep complete registered user data */

            localStorage.setItem(
                "nexacartUser",
                JSON.stringify({

                    ...savedUser,

                    phone:
                        savedUser.phone

                })
            );


            /* =================================================
               OTP LOGIN SUCCESS
            ================================================= */

            alert(
                "OTP Verified Successfully! 🎉\nWelcome " +
                username
            );


            setTimeout(
                function () {

                    /* Flask Home route */

                    window.location.href =
                        "/";

                },
                700
            );

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


            generateOTP();


            clearOTPBoxes();


            startTimer();


            otpBoxes[0].focus();

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
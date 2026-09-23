/* =========================================================
   NEXACART - PROFILE PAGE JS
   ========================================================= */

"use strict";


/* ---------------------------------------------------------
   STORAGE KEYS
--------------------------------------------------------- */

const CART_KEY = "nexacart_cart_v1";
const WISH_KEY = "nexacart_wishlist_v1";
const ORDERS_KEY = "nexacartOrders";


/* ---------------------------------------------------------
   DEFAULT USER
--------------------------------------------------------- */

const defaultUser = {
    username: "User",
    email: "user@example.com",
    location: "India"
};


/* ---------------------------------------------------------
   PAGE LOAD
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    loadCart();
    loadWishlist();
    loadOrders();
    updateCounts();
});


/* ---------------------------------------------------------
   USER DATA
--------------------------------------------------------- */

function getUserData() {
    try {
        const savedUser = localStorage.getItem("nexacartUser");

        if (savedUser) {
            const user = JSON.parse(savedUser);

            return {
                username: user.username || "User",
                email: user.email || "user@example.com",
                location: user.location || "India"
            };
        }
    } catch (error) {
        console.error("Error reading nexacartUser:", error);
    }

    return {
        username:
            localStorage.getItem("nexacartUsername") || defaultUser.username,

        email:
            localStorage.getItem("nexacartEmail") || defaultUser.email,

        location:
            localStorage.getItem("nexacartLocation") || defaultUser.location
    };
}


function saveUserData(user) {
    localStorage.setItem(
        "nexacartUser",
        JSON.stringify(user)
    );

    localStorage.setItem(
        "nexacartUsername",
        user.username
    );

    localStorage.setItem(
        "nexacartEmail",
        user.email
    );

    localStorage.setItem(
        "nexacartLocation",
        user.location
    );
}


/* ---------------------------------------------------------
   HELPER
--------------------------------------------------------- */

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


/* ---------------------------------------------------------
   LOAD PROFILE
--------------------------------------------------------- */

function loadProfile() {
    const user = getUserData();

    const username = user.username || "User";
    const email = user.email || "user@example.com";
    const location = user.location || "India";

    setText("navUsername", username);
    setText("sidebarUsername", username);
    setText("profileUsername", username);
    setText("infoUsername", username);

    setText("profileEmail", email);
    setText("infoEmail", email);

    setText("infoLocation", location);

    const firstLetter =
        username.charAt(0).toUpperCase() || "U";

    setText("navAvatar", firstLetter);
    setText("sidebarAvatar", firstLetter);
    setText("profileAvatar", firstLetter);
}


/* ---------------------------------------------------------
   PROFILE SECTION NAVIGATION
--------------------------------------------------------- */

function showSection(sectionId, button) {

    const sections =
        document.querySelectorAll(".content-section");

    sections.forEach(section => {
        section.classList.remove("active-section");
        section.classList.add("hidden-section");
    });

    const selected =
        document.getElementById(sectionId);

    if (selected) {
        selected.classList.remove("hidden-section");
        selected.classList.add("active-section");
    }

    document
        .querySelectorAll(".side-item")
        .forEach(item => {
            item.classList.remove("active");
        });

    if (button) {
        button.classList.add("active");
    }

    if (sectionId === "cartSection") {
        loadCart();
    }

    if (sectionId === "wishlistSection") {
        loadWishlist();
    }

    if (sectionId === "ordersSection") {
        loadOrders();
    }
}


/* ---------------------------------------------------------
   QUICK NAVIGATION
--------------------------------------------------------- */

function showSectionById(id) {

    const buttons =
        document.querySelectorAll(".side-item");

    let targetButton = null;

    buttons.forEach(button => {

        const onclickValue =
            button.getAttribute("onclick") || "";

        if (onclickValue.includes(id)) {
            targetButton = button;
        }
    });

    showSection(id, targetButton);
}


function goCart() {
    showSectionById("cartSection");
}


function goWishlist() {
    showSectionById("wishlistSection");
}


/* ---------------------------------------------------------
   EDIT PROFILE
--------------------------------------------------------- */

function openEditProfile() {

    const user = getUserData();

    const usernameInput =
        document.getElementById("editUsername");

    const emailInput =
        document.getElementById("editEmail");

    const locationInput =
        document.getElementById("editLocation");

    const modal =
        document.getElementById("editModal");

    if (!modal) return;

    if (usernameInput) {
        usernameInput.value = user.username;
    }

    if (emailInput) {
        emailInput.value = user.email;
    }

    if (locationInput) {
        locationInput.value = user.location;
    }

    modal.classList.add("show");
}


function closeEditProfile() {

    const modal =
        document.getElementById("editModal");

    if (modal) {
        modal.classList.remove("show");
    }
}


/* ---------------------------------------------------------
   SAVE PROFILE
--------------------------------------------------------- */

function saveProfile() {

    const usernameInput =
        document.getElementById("editUsername");

    const emailInput =
        document.getElementById("editEmail");

    const locationInput =
        document.getElementById("editLocation");

    if (!usernameInput || !emailInput || !locationInput) {
        return;
    }

    const username =
        usernameInput.value.trim();

    const email =
        emailInput.value.trim();

    const location =
        locationInput.value.trim();

    if (!username) {
        showToast("Username is required");
        return;
    }

    if (!email || !email.includes("@")) {
        showToast("Enter a valid email");
        return;
    }

    if (!location) {
        showToast("Location is required");
        return;
    }

    const user = {
        username,
        email,
        location
    };

    saveUserData(user);

    loadProfile();

    closeEditProfile();

    showToast("Profile updated successfully");
}


/* =========================================================
   CART SYSTEM
   SAME STORAGE AS HOME.JS
   ========================================================= */


/* ---------------------------------------------------------
   GET CART
--------------------------------------------------------- */

function getCart() {

    try {

        const savedCart =
            localStorage.getItem(CART_KEY);

        if (!savedCart) {
            return {};
        }

        const cart = JSON.parse(savedCart);

        if (
            cart &&
            typeof cart === "object" &&
            !Array.isArray(cart)
        ) {
            return cart;
        }

        return {};

    } catch (error) {

        console.error("Cart error:", error);

        return {};
    }
}


/* ---------------------------------------------------------
   SAVE CART
--------------------------------------------------------- */

function saveCart(cart) {

    try {

        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

    } catch (error) {

        console.error("Cart save error:", error);
    }
}


/* ---------------------------------------------------------
   CART QUANTITY
--------------------------------------------------------- */

function getCartQuantity() {

    const cart = getCart();

    return Object.values(cart).reduce(
        (total, quantity) =>
            total + Number(quantity || 0),
        0
    );
}


/* ---------------------------------------------------------
   LOAD CART
--------------------------------------------------------- */

function loadCart() {

    const container =
        document.getElementById("profileCart");

    if (!container) return;

    const cart = getCart();

    const entries =
        Object.entries(cart)
            .filter(
                ([name, quantity]) =>
                    name &&
                    Number(quantity) > 0
            );

    container.innerHTML = "";

    if (entries.length === 0) {

        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">

                <i class="fa-solid fa-cart-shopping"></i>

                <h3>Your Cart is Empty</h3>

                <p>
                    Add products from NexaCart.
                </p>

                <a href="/#products">
                    Shop Products
                </a>

            </div>
        `;

        setText(
            "profileCartTotal",
            "₹0"
        );

        return;
    }


    /*
       IMPORTANT:

       Home.js stores:

       {
           "Product Name": quantity
       }

       Profile page therefore displays
       product name + quantity.

       Price information is not stored
       inside the cart object.
    */

    entries.forEach(([name, quantity]) => {

        const qty =
            Number(quantity) || 1;

        const product =
            document.createElement("div");

        product.className =
            "mini-product";

        product.innerHTML = `
            <h4>
                ${escapeHTML(name)}
            </h4>

            <p>
                Quantity: ${qty}
            </p>

            <button
                type="button"
                class="remove-mini"
                data-cart-name="${escapeHTML(name)}">
                Remove
            </button>
        `;

        const removeButton =
            product.querySelector(".remove-mini");

        if (removeButton) {

            removeButton.addEventListener(
                "click",
                () => {
                    removeCartItem(name);
                }
            );
        }

        container.appendChild(product);
    });


    /*
       Home.js stores quantity only,
       so exact cart price cannot be calculated
       on profile page from this storage format.
    */

    setText(
        "profileCartTotal",
        "Price shown on checkout"
    );
}


/* ---------------------------------------------------------
   REMOVE CART ITEM
--------------------------------------------------------- */

function removeCartItem(name) {

    const cart = getCart();

    if (
        Object.prototype.hasOwnProperty.call(
            cart,
            name
        )
    ) {
        delete cart[name];
    }

    saveCart(cart);

    loadCart();

    updateCounts();

    showToast(
        "Item removed from cart"
    );
}


/* =========================================================
   WISHLIST SYSTEM
   SAME STORAGE AS HOME.JS
   ========================================================= */


/* ---------------------------------------------------------
   GET WISHLIST
--------------------------------------------------------- */

function getWishlist() {

    try {

        const savedWishlist =
            localStorage.getItem(WISH_KEY);

        if (!savedWishlist) {
            return [];
        }

        const wishlist =
            JSON.parse(savedWishlist);

        return Array.isArray(wishlist)
            ? wishlist
            : [];

    } catch (error) {

        console.error(
            "Wishlist error:",
            error
        );

        return [];
    }
}


/* ---------------------------------------------------------
   SAVE WISHLIST
--------------------------------------------------------- */

function saveWishlist(wishlist) {

    try {

        localStorage.setItem(
            WISH_KEY,
            JSON.stringify(wishlist)
        );

    } catch (error) {

        console.error(
            "Wishlist save error:",
            error
        );
    }
}


/* ---------------------------------------------------------
   LOAD WISHLIST
--------------------------------------------------------- */

function loadWishlist() {

    const container =
        document.getElementById("profileWishlist");

    if (!container) return;

    const wishlist =
        getWishlist();

    container.innerHTML = "";

    if (wishlist.length === 0) {

        container.innerHTML = `
            <div
                class="empty-state"
                style="grid-column:1/-1">

                <i class="fa-regular fa-heart"></i>

                <h3>Your Wishlist is Empty</h3>

                <p>
                    Save your favourite products here.
                </p>

                <a href="/#products">
                    Explore Products
                </a>

            </div>
        `;

        return;
    }


    wishlist.forEach(name => {

        const product =
            document.createElement("div");

        product.className =
            "mini-product";

        product.innerHTML = `
            <h4>
                ${escapeHTML(name)}
            </h4>

            <p>
                Saved to wishlist
            </p>

            <button
                type="button"
                class="remove-mini"
                data-wishlist-name="${escapeHTML(name)}">
                Remove
            </button>
        `;

        const removeButton =
            product.querySelector(".remove-mini");

        if (removeButton) {

            removeButton.addEventListener(
                "click",
                () => {
                    removeWishlistItem(name);
                }
            );
        }

        container.appendChild(product);
    });
}


/* ---------------------------------------------------------
   REMOVE WISHLIST ITEM
--------------------------------------------------------- */

function removeWishlistItem(name) {

    let wishlist =
        getWishlist();

    wishlist =
        wishlist.filter(
            item => item !== name
        );

    saveWishlist(wishlist);

    loadWishlist();

    updateCounts();

    showToast(
        "Removed from wishlist"
    );
}


/* =========================================================
   ORDERS
   ========================================================= */


/* ---------------------------------------------------------
   GET ORDERS
--------------------------------------------------------- */

function getOrders() {

    try {

        const orders =
            JSON.parse(
                localStorage.getItem(
                    ORDERS_KEY
                )
            );

        return Array.isArray(orders)
            ? orders
            : [];

    } catch (error) {

        console.error(
            "Orders error:",
            error
        );

        return [];
    }
}


/* ---------------------------------------------------------
   ORDER COUNT
--------------------------------------------------------- */

function getOrderCount() {

    return getOrders().length;
}


/* ---------------------------------------------------------
   LOAD ORDERS
--------------------------------------------------------- */

function loadOrders() {

    const container =
        document.getElementById("ordersList");

    if (!container) return;

    const orders =
        getOrders();

    container.innerHTML = "";

    if (orders.length === 0) {

        container.innerHTML = `
            <div class="empty-state">

                <i class="fa-solid fa-box-open"></i>

                <h3>No Orders Yet</h3>

                <p>
                    Your placed orders will appear here.
                </p>

                <a href="/#products">
                    Start Shopping
                </a>

            </div>
        `;

        return;
    }


    orders.forEach((order, index) => {

        const orderDiv =
            document.createElement("div");

        orderDiv.className =
            "mini-product";

        const total =
            order && order.total
                ? Number(order.total)
                : 0;

        orderDiv.innerHTML = `
            <h4>
                Order #${index + 1}
            </h4>

            <p>
                ${
                    total
                        ? "Total: ₹" +
                          total.toLocaleString("en-IN")
                        : "Order placed successfully"
                }
            </p>
        `;

        container.appendChild(orderDiv);
    });
}


/* =========================================================
   COUNTS
   ========================================================= */

function updateCounts() {

    const cartQuantity =
        getCartQuantity();

    const wishlist =
        getWishlist();

    const orders =
        getOrders();

    setText(
        "cartCount",
        cartQuantity
    );

    setText(
        "wishlistCount",
        wishlist.length
    );

    setText(
        "wishlistStat",
        wishlist.length
    );

    setText(
        "orderStat",
        orders.length
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logoutUser() {

    localStorage.removeItem(
        "nexacartUsername"
    );

    localStorage.removeItem(
        "nexacartEmail"
    );

    localStorage.removeItem(
        "nexacartLocation"
    );

    localStorage.removeItem(
        "nexacartUser"
    );

    showToast(
        "Logged out successfully"
    );

    setTimeout(() => {

        window.location.href =
            "/logout";

    }, 700);
}


/* =========================================================
   PREMIUM
   ========================================================= */

function premiumMessage() {

    showToast(
        "NexaCart Premium coming soon!"
    );
}


/* =========================================================
   COMING SOON
   ========================================================= */

function showComingSoon(name) {

    showToast(
        name + " will be available soon"
    );
}


/* =========================================================
   CHANGE AVATAR
   ========================================================= */

function changeAvatar() {

    showToast(
        "Profile photo upload coming soon"
    );
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "profileToast"
        );

    const messageElement =
        document.getElementById(
            "toastMessage"
        );

    if (!toast || !messageElement) {
        return;
    }

    messageElement.textContent =
        message;

    toast.classList.add("show");

    clearTimeout(
        window.profileToastTimer
    );

    window.profileToastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2500);
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   EDIT MODAL - CLICK OUTSIDE
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "editModal"
            );

        if (!modal) return;

        if (event.target === modal) {
            closeEditProfile();
        }
    }
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }

        closeEditProfile();
    }
);
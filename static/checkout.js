/* NexaCart Checkout JavaScript */

document.addEventListener("DOMContentLoaded", () => {
    loadOrderSummary();
    setupPaymentToggle();
    setupCheckoutForm();
});

/* ---------- Cart helpers ---------- */

function getCart() {
    try {
        return JSON.parse(localStorage.getItem("cart")) || [];
    } catch (error) {
        console.error("Could not read cart:", error);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function loadOrderSummary() {
    const cart = getCart();

    const itemsContainer =
        document.getElementById("checkoutItems") ||
        document.getElementById("orderItems");

    const subtotalElement = document.getElementById("subtotal");
    const shippingElement = document.getElementById("shipping");
    const totalElement = document.getElementById("total");

    if (!itemsContainer) return;

    if (!cart.length) {
        itemsContainer.innerHTML = `
            <div class="empty-checkout">
                <p>Your cart is empty.</p>
                <a href="home.html">Continue Shopping</a>
            </div>
        `;

        if (subtotalElement) subtotalElement.textContent = "₹0";
        if (shippingElement) shippingElement.textContent = "₹0";
        if (totalElement) totalElement.textContent = "₹0";
        return;
    }

    let subtotal = 0;

    itemsContainer.innerHTML = cart.map((item, index) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity || item.qty || 1);
        subtotal += price * quantity;

        return `
            <div class="checkout-item">
                <img src="${item.image || ""}" alt="${escapeHtml(item.name || "Product")}"
                     onerror="this.style.display='none'">
                <div class="checkout-item-info">
                    <h4>${escapeHtml(item.name || "Product")}</h4>
                    <p>Qty: ${quantity}</p>
                </div>
                <strong>₹${formatMoney(price * quantity)}</strong>
            </div>
        `;
    }).join("");

    const shipping = subtotal >= 999 ? 0 : 49;
    const total = subtotal + shipping;

    if (subtotalElement) subtotalElement.textContent = `₹${formatMoney(subtotal)}`;
    if (shippingElement) {
        shippingElement.textContent = shipping === 0 ? "FREE" : `₹${formatMoney(shipping)}`;
    }
    if (totalElement) totalElement.textContent = `₹${formatMoney(total)}`;
}

/* ---------- Payment ---------- */

function setupPaymentToggle() {
    const paymentRadios = document.querySelectorAll('input[name="payment"]');

    paymentRadios.forEach(radio => {
        radio.addEventListener("change", updatePaymentUI);
    });

    updatePaymentUI();
}

function updatePaymentUI() {
    const selected = document.querySelector('input[name="payment"]:checked');
    const razorpayBox = document.getElementById("razorpayBox");

    if (razorpayBox) {
        razorpayBox.style.display =
            selected && selected.value === "razorpay" ? "block" : "none";
    }
}

/* ---------- Form ---------- */

function setupCheckoutForm() {
    const form =
        document.getElementById("checkoutForm") ||
        document.getElementById("orderForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const cart = getCart();

        if (!cart.length) {
            showMessage("Your cart is empty.", "error");
            return;
        }

        const name = getValue(["name", "fullName", "customerName"]);
        const email = getValue(["email", "customerEmail"]);
        const phone = getValue(["phone", "mobile", "customerPhone"]);
        const address = getValue(["address", "deliveryAddress"]);
        const city = getValue(["city"]);
        const state = getValue(["state"]);
        const pincode = getValue(["pincode", "pinCode", "zip"]);

        if (!name || !email || !phone || !address || !city || !state || !pincode) {
            showMessage("Please fill all required delivery details.", "error");
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            showMessage("Please enter a valid 10-digit mobile number.", "error");
            return;
        }

        if (!/^\d{6}$/.test(pincode)) {
            showMessage("Please enter a valid 6-digit PIN code.", "error");
            return;
        }

        const selectedPayment = document.querySelector('input[name="payment"]:checked');
        const paymentMethod = selectedPayment ? selectedPayment.value : "cod";

        const subtotal = cart.reduce((sum, item) => {
            return sum + (Number(item.price) || 0) *
                Number(item.quantity || item.qty || 1);
        }, 0);

        const shipping = subtotal >= 999 ? 0 : 49;
        const total = subtotal + shipping;

        const order = {
            orderId: "NC" + Date.now(),
            customer: {
                name,
                email,
                phone,
                address,
                city,
                state,
                pincode
            },
            items: cart,
            subtotal,
            shipping,
            total,
            paymentMethod,
            status: paymentMethod === "cod" ? "Confirmed" : "Payment Pending",
            createdAt: new Date().toISOString()
        };

        if (paymentMethod === "razorpay") {
            await startRazorpayPayment(order);
        } else {
            completeCODOrder(order);
        }
    });
}

/* ---------- COD ---------- */

function completeCODOrder(order) {
    saveOrder(order);
    saveCart([]);

    localStorage.setItem("lastOrder", JSON.stringify(order));

    alert(
        `Order placed successfully!\\n\\n` +
        `Order ID: ${order.orderId}\\n` +
        `Payment: Cash on Delivery\\n` +
        `Total: ₹${formatMoney(order.total)}`
    );

    window.location.href = "home.html";
}

/* ---------- Razorpay ---------- */

async function startRazorpayPayment(order) {
    /*
     * IMPORTANT:
     * For a real Razorpay payment, your Flask backend should create
     * a Razorpay order and return its order_id.
     *
     * Replace the endpoint below with your backend endpoint.
     */

    const razorpayKey = window.RAZORPAY_KEY_ID || "";

    if (!razorpayKey) {
        showMessage(
            "Razorpay is selected, but the Razorpay Key ID is not configured yet. " +
            "Use Cash on Delivery or connect your Flask/Razorpay backend.",
            "error"
        );
        return;
    }

    if (typeof Razorpay === "undefined") {
        showMessage("Razorpay checkout script is not loaded.", "error");
        return;
    }

    try {
        const response = await fetch("/api/create-razorpay-order", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: order.total,
                orderId: order.orderId
            })
        });

        if (!response.ok) {
            throw new Error("Backend could not create Razorpay order.");
        }

        const data = await response.json();

        const options = {
            key: razorpayKey,
            amount: data.amount,
            currency: data.currency || "INR",
            name: "NexaCart",
            description: "NexaCart Order",
            order_id: data.order_id,

            prefill: {
                name: order.customer.name,
                email: order.customer.email,
                contact: order.customer.phone
            },

            theme: {
                color: "#6c5ce7"
            },

            handler: function (paymentResponse) {
                order.payment = paymentResponse;
                order.status = "Paid";

                saveOrder(order);
                saveCart([]);
                localStorage.setItem("lastOrder", JSON.stringify(order));

                alert(
                    `Payment successful!\\n\\n` +
                    `Order ID: ${order.orderId}`
                );

                window.location.href = "home.html";
            },

            modal: {
                ondismiss: function () {
                    showMessage("Payment window closed.", "error");
                }
            }
        };

        const payment = new Razorpay(options);
        payment.open();

    } catch (error) {
        console.error(error);
        showMessage(
            "Unable to start Razorpay payment. Please check your backend configuration.",
            "error"
        );
    }
}

/* ---------- Orders ---------- */

function saveOrder(order) {
    const orders = JSON.parse(localStorage.getItem("nexacartOrders") || "[]");
    orders.push(order);
    localStorage.setItem("nexacartOrders", JSON.stringify(orders));
}

/* ---------- Utilities ---------- */

function getValue(ids) {
    for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.value.trim()) {
            return element.value.trim();
        }
    }
    return "";
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString("en-IN");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showMessage(message, type = "error") {
    let box = document.getElementById("checkoutMessage");

    if (!box) {
        box = document.createElement("div");
        box.id = "checkoutMessage";
        box.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 360px;
            padding: 14px 18px;
            border-radius: 12px;
            background: ${type === "error" ? "#ffe8e8" : "#e8fff0"};
            color: ${type === "error" ? "#a40000" : "#08752c"};
            box-shadow: 0 8px 30px rgba(0,0,0,.15);
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(box);
    }

    box.textContent = message;

    clearTimeout(window.checkoutMessageTimer);
    window.checkoutMessageTimer = setTimeout(() => {
        box.remove();
    }, 4500);
}
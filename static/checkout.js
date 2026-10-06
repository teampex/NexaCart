document.addEventListener("DOMContentLoaded", () => {
    // Checkout page cart load/render karta hai aur form submit par order API ko request bhejta hai.
    let cart = [];
    const list = document.getElementById("checkoutItems");
    const message = document.getElementById("checkoutMessage");
    const submitButton = document.getElementById("placeOrder");
    const form = document.getElementById("checkoutForm");
    const paymentInputs = document.querySelectorAll('input[name="payment"]');

    function updateSubmitLabel() {
        const method = document.querySelector('input[name="payment"]:checked')?.value;
        submitButton.textContent = method === "COD" ? "Place Order" : "Pay & Place Order";
    }
    paymentInputs.forEach(input => input.addEventListener("change", updateSubmitLabel));

    function money(value) {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
    }
    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    }

    function renderCart() {
        // Cart rows, item totals, shipping aur final amount checkout UI mein dikhata hai.
        const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
        const shipping = subtotal === 0 || subtotal >= 999 ? 0 : 49;
        document.getElementById("count").textContent = `(${cart.reduce((sum, item) => sum + item.quantity, 0)})`;
        document.getElementById("subtotal").textContent = money(subtotal);
        document.getElementById("shipping").textContent = shipping ? money(shipping) : "FREE";
        document.getElementById("total").textContent = money(subtotal + shipping);
        list.innerHTML = cart.length ? cart.map(item => `
            <div class="checkout-item">
                ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : ""}
                <div class="checkout-item-info"><h4>${escapeHtml(item.name)}</h4><p>${money(item.price)} each · Qty ${item.quantity}</p>
                <button type="button" data-remove="${item.id}" style="border:0;background:none;color:#b42318;cursor:pointer;padding:4px 0">Remove</button></div>
                <strong>${money(Number(item.price) * item.quantity)}</strong>
            </div>`).join("") : `<p>Your cart is empty. <a href="/products">Browse products</a></p>`;
        submitButton.disabled = cart.length === 0;
        list.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", async () => {
            await cartRequest({ action: "remove", product_id: Number(button.dataset.remove) });
        }));
    }

    async function cartRequest(payload) {
        // /api/cart se items load ya remove karta hai, phir checkout view refresh karta hai.
        try {
            const response = await fetch("/api/cart", payload ? {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            } : {});
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Could not load cart.");
            cart = result.items || [];
            renderCart();
        } catch (error) {
            message.textContent = error.message;
            message.hidden = false;
            submitButton.disabled = true;
        }
    }

    form.addEventListener("submit", async event => {
        // Customer/payment details /api/place-order ko bhejta aur response ke baad redirect karta hai.
        event.preventDefault();
        if (!cart.length) return;
        message.hidden = true;
        submitButton.disabled = true;
        submitButton.textContent = "Processing order…";
        const payload = {
            payment_method: document.querySelector('input[name="payment"]:checked')?.value || "COD",
            name: document.getElementById("customerName").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            address: document.getElementById("address").value.trim(),
            city: document.getElementById("city").value.trim(),
            state: document.getElementById("state").value.trim(),
            pincode: document.getElementById("pincode").value.trim()
        };
        try {
            const response = await fetch("/api/place-order", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Order could not be placed.");
            window.location.href = result.redirect;
        } catch (error) {
            message.textContent = error.message;
            message.hidden = false;
            submitButton.disabled = false;
            updateSubmitLabel();
        }
    });

    updateSubmitLabel();
    cartRequest();
});

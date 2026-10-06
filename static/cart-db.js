/* The cart UI uses MySQL as its source of truth through /api/cart. */
/* Is file mein homepage cart/wishlist API requests, UI sync aur quantity buttons ke handlers hain. */
(() => {
    async function requestCart(payload) {
        // Payload ho to cart update hota hai; bina payload ke current cart load hota hai.
        const response = await fetch("/api/cart", payload ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        } : {});
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not update the database cart.");
        return result.items || [];
    }

    function applyCart(items) {
        cart = {};
        items.forEach(item => { cart[item.name] = (Number(cart[item.name]) || 0) + Number(item.quantity || 0); });
        renderCart();
        updateCounts();
    }

    async function refreshCart() {
        try { applyCart(await requestCart()); }
        catch (error) { showToast(error.message); }
    }

    async function wishlistRequest(payload) {
        // Wishlist ko server se load/update karke local UI state aur counters refresh karta hai.
        const response = await fetch("/api/wishlist", payload ? {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        } : {});
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not update wishlist.");
        wishlist = new Set((result.items || []).map(item => item.name));
        renderWishlist(); renderProducts(getCurrentProductList()); updateCounts();
    }

    async function changeCart(payload, successText) {
        try {
            applyCart(await requestCart(payload));
            if (successText) showToast(successText);
        } catch (error) { showToast(error.message); }
    }

    window.addToCart = async function (name) {
        // Home page ke Add to Cart button ko database-backed cart request se connect karta hai.
        const product = productByName(name);
        if (!product) return;
        await changeCart({ action: "add", product_id: product.id }, `${name} added to cart`);
    };

    window.toggleWishlist = async function (name) {
        // Home page ke heart button se server par wishlist toggle karta hai.
        const product = productByName(name);
        if (!product) return;
        try {
            await wishlistRequest({ action: "toggle", product_id: product.id });
            showToast(wishlist.has(name) ? `${name} saved to wishlist` : `${name} removed from wishlist`);
        } catch (error) { showToast(error.message); }
    };

    window.persist = function () {
        // Wishlist and cart are both stored in MySQL.
    };

    // Intercept cart quantity controls before the old browser-only handlers.
    document.addEventListener("click", event => {
        const button = event.target.closest("#cartItems [data-action]");
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const name = button.dataset.name;
        const product = productByName(name);
        const quantity = Number(cart[name] || 0);
        if (!product) return;
        if (button.dataset.action === "increase") changeCart({ action: "add", product_id: product.id });
        if (button.dataset.action === "decrease") changeCart({ action: "set", product_id: product.id, quantity: quantity - 1 });
        if (button.dataset.action === "remove-cart") changeCart({ action: "remove", product_id: product.id });
    }, true);

    document.addEventListener("click", event => {
        const button = event.target.closest('#wishlistItems [data-action="remove-wish"]');
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const product = productByName(button.dataset.name);
        if (product) wishlistRequest({ action: "remove", product_id: product.id }).catch(error => showToast(error.message));
    }, true);

    // Replace the in-memory view with MySQL data; the database remains authoritative.
    cart = {};
    refreshCart();
    wishlistRequest().catch(error => showToast(error.message));
})();

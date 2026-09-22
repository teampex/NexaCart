/* NexaCart home interactions. Keeps index.html/login page untouched. */
const products = [
    { name: "Premium Backpack", price: 3499, oldPrice: 4999, discount: "-30%", rating: 4.8, reviews: 88, badge: "sale", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85" },
    { name: "White Sneakers", price: 5299, oldPrice: 6999, discount: "-24%", rating: 4.7, reviews: 72, badge: "sale", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85" },
    { name: "Classic Watch", price: 8999, oldPrice: 11999, discount: "-26%", rating: 4.9, reviews: 54, badge: "sale", image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=700&q=85" },
    { name: "Leather Handbag", price: 4799, oldPrice: 6499, discount: "-26%", rating: 4.8, reviews: 46, badge: "sale", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=85" },
    { name: "Wireless Headphones", price: 6499, oldPrice: 8999, discount: "-28%", rating: 4.8, reviews: 91, badge: "sale", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85" },
    { name: "Smart Laptop", price: 54999, oldPrice: 62999, discount: "", rating: 4.9, reviews: 63, badge: "NEW", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85" },
    { name: "Minimal Sneakers", price: 4199, oldPrice: 5499, discount: "-23%", rating: 4.7, reviews: 41, badge: "sale", image: "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=700&q=85" },
    { name: "Urban Sunglasses", price: 1999, oldPrice: 2799, discount: "-28%", rating: 4.6, reviews: 35, badge: "sale", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=85" },
    { name: "Smart Watch Pro", price: 7499, oldPrice: 9999, discount: "", rating: 4.8, reviews: 88, badge: "NEW", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=700&q=85" },
    { name: "Everyday Hoodie", price: 2499, oldPrice: 3499, discount: "-29%", rating: 4.7, reviews: 29, badge: "sale", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=700&q=85" },
    { name: "Aether Earbuds", price: 3299, oldPrice: 4499, discount: "-27%", rating: 4.8, reviews: 67, badge: "sale", image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=700&q=85" },
    { name: "Urban Travel Bag", price: 3999, oldPrice: 5499, discount: "-27%", rating: 4.7, reviews: 31, badge: "sale", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85" }
];

const $ = id => document.getElementById(id);
const productGrid = $("productGrid"), cartCountElement = $("cartCount"), wishlistCountElement = $("wishlistCount");
const toast = $("toast"), toastMessage = $("toastMessage");
const CART_KEY = "nexacart_cart_v1", WISH_KEY = "nexacart_wishlist_v1";
let cart = readJSON(CART_KEY, {}), wishlist = new Set(readJSON(WISH_KEY, []));
let toastTimer;

function readJSON(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
function persist() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); localStorage.setItem(WISH_KEY, JSON.stringify([...wishlist])); } catch { /* Storage may be disabled; current session still works. */ } }
function formatPrice(price) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price); }
function productByName(name) { return products.find(p => p.name === name); }
function cartQuantity() { return Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0); }
function cartTotal() { return Object.entries(cart).reduce((sum, [name, qty]) => sum + (productByName(name)?.price || 0) * qty, 0); }
function showToast(message) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}
function stars(rating) { return Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(rating) ? "fa-solid" : "fa-regular"} fa-star"></i>`).join(""); }

function renderProducts(list = products) {
    if (!productGrid) return;
    productGrid.innerHTML = "";
    if (!list.length) { productGrid.innerHTML = `<div class="no-products" style="grid-column:1/-1;text-align:center;padding:42px 12px;color:#718091"><i class="fa-solid fa-magnifying-glass" style="font-size:28px"></i><h3 style="margin:10px 0 4px;color:#172d40">No products found</h3><p>Try another product name.</p></div>`; return; }
    list.forEach(product => {
        const card = document.createElement("article"); card.className = "product-card"; card.dataset.product = product.name;
        const wished = wishlist.has(product.name);
        card.innerHTML = `<div class="product-image">${product.badge ? `<span class="product-badge ${product.badge === "NEW" ? "new" : ""}">${product.badge}</span>` : ""}<button class="product-wishlist ${wished ? "active" : ""}" data-action="wishlist" data-name="${product.name}" aria-label="${wished ? "Remove from" : "Add to"} wishlist"><i class="${wished ? "fa-solid" : "fa-regular"} fa-heart"></i></button><img src="${product.image}" alt="${product.name}" loading="lazy"></div><div class="product-info"><h3 class="product-name">${product.name}</h3><div class="price-row"><span class="current-price">${formatPrice(product.price)}</span><span class="old-price">${formatPrice(product.oldPrice)}</span></div><div class="rating"><span class="rating-stars">${stars(product.rating)}</span><span>(${product.reviews})</span></div><div class="product-actions"><button class="add-cart-btn" data-action="add-cart" data-name="${product.name}"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button><button class="quick-view-btn" data-action="quick-view" data-name="${product.name}" aria-label="View ${product.name}"><i class="fa-regular fa-eye"></i></button></div></div>`;
        productGrid.appendChild(card);
    });
}
function updateCounts() {
    if (cartCountElement) cartCountElement.textContent = cartQuantity();
    if (wishlistCountElement) wishlistCountElement.textContent = wishlist.size;
    if ($("cartPanelCount")) $("cartPanelCount").textContent = `(${cartQuantity()})`;
    if ($("wishlistPanelCount")) $("wishlistPanelCount").textContent = `(${wishlist.size})`;
    if ($("profileCartCount")) $("profileCartCount").textContent = cartQuantity();
    if ($("profileWishlistCount")) $("profileWishlistCount").textContent = wishlist.size;
}
function addToCart(name) { if (!productByName(name)) return; cart[name] = (Number(cart[name]) || 0) + 1; persist(); updateCounts(); renderCart(); showToast(`${name} added to cart 🛍️`); }
function toggleWishlist(name) {
    if (wishlist.has(name)) { wishlist.delete(name); showToast(`${name} removed from wishlist`); }
    else { wishlist.add(name); showToast(`${name} added to wishlist ❤️`); }
    persist(); updateCounts(); renderProducts(getCurrentProductList()); renderWishlist();
}
function getCurrentProductList() { const q = $("searchInput")?.value.trim().toLowerCase() || ""; return products.filter(p => p.name.toLowerCase().includes(q)); }

function openPanel(panelId) {
    closePanels(); const panel = $(panelId); if (!panel) return;
    $("panelBackdrop").hidden = false; panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); document.body.classList.add("panel-open");
}
function closePanels() {
    document.querySelectorAll(".side-panel").forEach(p => { p.classList.remove("open"); p.setAttribute("aria-hidden", "true"); });
    if ($("panelBackdrop")) $("panelBackdrop").hidden = true; document.body.classList.remove("panel-open");
}
function renderCart() {
    const container = $("cartItems"); if (!container) return;
    const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
    container.innerHTML = entries.length ? "" : `<div class="panel-empty"><i class="fa-solid fa-bag-shopping"></i><strong>Your cart is empty</strong><span>Add something you love to get started.</span></div>`;
    entries.forEach(([name, qty]) => {
        const p = productByName(name); if (!p) return; const row = document.createElement("div"); row.className = "cart-item";
        row.innerHTML = `<img src="${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><div class="cart-item-price">${formatPrice(p.price)}</div><div class="quantity-control"><button data-action="decrease" data-name="${name}" aria-label="Decrease quantity">−</button><span>${qty}</span><button data-action="increase" data-name="${name}" aria-label="Increase quantity">+</button></div><button class="remove-item" data-action="remove-cart" data-name="${name}">Remove</button></div><strong class="cart-item-price">${formatPrice(p.price * qty)}</strong>`; container.appendChild(row);
    });
    if ($("cartSubtotal")) $("cartSubtotal").textContent = formatPrice(cartTotal()); updateCounts();
}
function renderWishlist() {
    const container = $("wishlistItems"); if (!container) return;
    const items = [...wishlist].map(productByName).filter(Boolean);
    container.innerHTML = items.length ? "" : `<div class="panel-empty"><i class="fa-regular fa-heart"></i><strong>Your wishlist is empty</strong><span>Tap the heart on a product to save it here.</span></div>`;
    items.forEach(p => { const row = document.createElement("div"); row.className = "wishlist-item"; row.innerHTML = `<img src="${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><strong class="cart-item-price">${formatPrice(p.price)}</strong><div class="wishlist-item-actions"><button data-action="wish-add-cart" data-name="${p.name}">Add to Cart</button><button class="remove-wish" data-action="remove-wish" data-name="${p.name}">Remove</button></div></div>`; container.appendChild(row); }); updateCounts();
}

/* Account detection supports common login form storage conventions without changing login/index.html. */
function getLoggedInUser() {
    const stores = [localStorage, sessionStorage];
    const keys = ["loggedInUser", "currentUser", "userData", "user", "nexacart_user", "authUser", "loginUser", "loggedUser"];
    for (const store of stores) for (const key of keys) {
        try {
            const raw = store.getItem(key); if (!raw) continue; let data; try { data = JSON.parse(raw); } catch { data = raw; }
            if (data && typeof data === "object") {
                if (data.user && typeof data.user === "object") data = data.user;
                if (data.isLoggedIn === false || data.loggedIn === false) continue;
                const name = data.name || data.username || data.fullName || data.displayName || data.firstName || data.email;
                if (name) return { name: String(name), email: String(data.email || data.userEmail || "") };
            } else if (typeof data === "string" && data.trim() && !["true", "false", "1"].includes(data.trim().toLowerCase()) && /name|user|email/i.test(key)) return { name: data.trim(), email: "" };
        } catch { }
    }
    // Some projects store simple username/email values separately.
    for (const store of stores) for (const key of ["username", "userName", "name", "email"]) { try { const val = store.getItem(key); if (val && val.trim()) return { name: val.trim(), email: key.toLowerCase() === "email" ? val.trim() : "" }; } catch { } }
    return null;
}
function updateAccountUI() {
    const user = getLoggedInUser(), label = $("accountLabel"), welcome = $("dropdownUsername"), email = $("dropdownEmail"), loginLink = $("dropdownLoginLink"), logout = $("logoutBtn"), mobileLogin = $("mobileLoginLink");
    if (label) label.textContent = user ? user.name.split(" ")[0] : "Login";
    if (welcome) welcome.textContent = user ? `Hi, ${user.name}` : "Welcome, Guest";
    if (email) email.textContent = user?.email || (user ? "Signed in" : "Sign in to your account");
    if (loginLink) loginLink.hidden = !!user;
    if (logout) logout.hidden = !user;
    if (mobileLogin) { mobileLogin.innerHTML = user ? `<i class="fa-regular fa-user"></i> ${user.name}` : `<i class="fa-regular fa-user"></i> Login`; }
    if ($("profileName")) $("profileName").textContent = user?.name || "Guest";
    if ($("profileEmail")) $("profileEmail").textContent = user?.email || (user ? "Signed in to NexaCart" : "You are browsing as a guest");
    if ($("profileStatus")) $("profileStatus").textContent = user ? "Logged in" : "Guest";
}
function closeProfile() { if ($("profileModal")) $("profileModal").hidden = true; }
function openProfile() { updateAccountUI(); if ($("profileModal")) $("profileModal").hidden = false; if ($("accountDropdown")) $("accountDropdown").hidden = true; $("accountBtn")?.setAttribute("aria-expanded", "false"); }

// Product interactions are delegated so search re-renders do not break event handlers.
productGrid?.addEventListener("click", e => {
    const btn = e.target.closest("[data-action]"); if (!btn) return; const { action, name } = btn.dataset;
    if (action === "add-cart") addToCart(name); else if (action === "wishlist") toggleWishlist(name); else if (action === "quick-view") { const p = productByName(name); if (p) showToast(`${p.name} · ${formatPrice(p.price)} · ${p.rating}★`); }
});
$("cartItems")?.addEventListener("click", e => {
    const b = e.target.closest("[data-action]"); if (!b) return; const name = b.dataset.name;
    if (b.dataset.action === "increase") cart[name] = (cart[name] || 0) + 1;
    if (b.dataset.action === "decrease") { cart[name] = (cart[name] || 0) - 1; if (cart[name] <= 0) delete cart[name]; }
    if (b.dataset.action === "remove-cart") delete cart[name]; persist(); renderCart(); showToast("Cart updated");
});     
$("wishlistItems")?.addEventListener("click", e => {
    const b = e.target.closest("[data-action]"); if (!b) return; const name = b.dataset.name;
    if (b.dataset.action === "wish-add-cart") addToCart(name);
    if (b.dataset.action === "remove-wish") { wishlist.delete(name); persist(); renderProducts(getCurrentProductList()); renderWishlist(); showToast("Removed from wishlist"); }
});
$("cartOpenBtn")?.addEventListener("click", () => { renderCart(); openPanel("cartPanel"); });
$("wishlistOpenBtn")?.addEventListener("click", () => { renderWishlist(); openPanel("wishlistPanel"); });
$("panelBackdrop")?.addEventListener("click", closePanels);
document.querySelectorAll("[data-close-panel]").forEach(b => b.addEventListener("click", closePanels));
$("checkoutBtn")?.addEventListener("click", () => {
    if (!cartQuantity()) {
        showToast("Your cart is empty");
        return;
    }

    window.location.href = "checkout.html";
});

$("accountBtn")?.addEventListener("click", () => { const dd = $("accountDropdown"), open = dd.hidden; dd.hidden = !open; $("accountBtn").setAttribute("aria-expanded", String(open)); });
document.addEventListener("click", e => { if (!$("accountWrap")?.contains(e.target)) { if ($("accountDropdown")) $("accountDropdown").hidden = true; $("accountBtn")?.setAttribute("aria-expanded", "false"); } });
$("myProfileBtn")?.addEventListener("click", openProfile);
$("dropdownWishlistBtn")?.addEventListener("click", () => { renderWishlist(); openPanel("wishlistPanel"); $("accountDropdown").hidden = true; });
$("dropdownCartBtn")?.addEventListener("click", () => { renderCart(); openPanel("cartPanel"); $("accountDropdown").hidden = true; });
document.querySelectorAll("[data-close-profile]").forEach(b => b.addEventListener("click", closeProfile));
$("profileModal")?.addEventListener("click", e => { if (e.target === $("profileModal")) closeProfile(); });
$("logoutBtn")?.addEventListener("click", () => {
    // Remove only likely authentication/session keys; preserve cart, wishlist and unrelated app data.
    const authKeys = ["loggedInUser", "currentUser", "userData", "user", "nexacart_user", "authUser", "loginUser", "loggedUser", "username", "userName", "isLoggedIn", "loggedIn"];
    [localStorage, sessionStorage].forEach(store => authKeys.forEach(key => { try { store.removeItem(key); } catch { } }));
    showToast("Logged out successfully"); updateAccountUI(); $("accountDropdown").hidden = true;
    setTimeout(() => { window.location.href = "home.html"; }, 450);
});

$("searchInput")?.addEventListener("input", e => renderProducts(products.filter(p => p.name.toLowerCase().includes(e.target.value.trim().toLowerCase()))));
$("mobileMenuBtn")?.addEventListener("click", function () { const menu = $("mobileMenu"); menu?.classList.toggle("show"); const icon = this.querySelector("i"); if (icon) { icon.classList.toggle("fa-bars"); icon.classList.toggle("fa-xmark"); } });
document.querySelectorAll(".mobile-menu a").forEach(a => a.addEventListener("click", () => $("mobileMenu")?.classList.remove("show")));
$("newsletterForm")?.addEventListener("submit", e => { e.preventDefault(); const email = $("emailInput")?.value.trim(); if (email) { showToast("You're subscribed to NexaCart ✨"); e.target.reset(); } });
window.addEventListener("scroll", () => { const nav = document.querySelector(".navbar"); if (nav) nav.style.boxShadow = window.scrollY > 20 ? "0 5px 20px rgba(20,40,60,.07)" : "none"; }, { passive: true });
document.querySelectorAll(".category-card").forEach(category => category.addEventListener("click", () => { const name = category.querySelector("h3")?.textContent.trim().toLowerCase() || ""; const map = { shoes: ["sneaker"], bags: ["bag", "backpack", "handbag"], watches: ["watch"], accessories: ["sunglasses", "earbuds", "headphones"], electronics: ["laptop", "headphones", "watch", "earbuds"], men: ["hoodie", "backpack"], women: ["handbag", "sunglasses"], beauty: [] }; const terms = map[name] || [name]; const filtered = products.filter(p => terms.some(term => p.name.toLowerCase().includes(term))); $("searchInput").value = ""; renderProducts(filtered.length ? filtered : products); $("products")?.scrollIntoView({ behavior: "smooth" }); showToast(`${category.querySelector("h3")?.textContent.trim()} collection`); }));
document.querySelectorAll(".small-btn").forEach(button => button.addEventListener("click", () => { $("products")?.scrollIntoView({ behavior: "smooth" }); showToast("Explore our collection ✨"); }));

// Reveal elements, including product cards rendered on first load.
function observeReveal() { if (!("IntersectionObserver" in window)) return; const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.style.opacity = "1"; entry.target.style.transform = "translateY(0)"; observer.unobserve(entry.target); } }), { threshold: .08 }); document.querySelectorAll(".category-card,.promo-card,.product-card,.service-item").forEach(el => { if (el.dataset.revealed) return; el.dataset.revealed = "1"; el.style.opacity = "0"; el.style.transform = "translateY(15px)"; el.style.transition = "opacity .5s ease, transform .5s ease"; observer.observe(el); }); }
const revealObserver = new MutationObserver(observeReveal); if (productGrid) revealObserver.observe(productGrid, { childList: true });

renderProducts(); renderCart(); renderWishlist(); updateCounts(); updateAccountUI(); observeReveal();
console.log("NexaCart homepage loaded successfully 🚀");
const savedUsername = localStorage.getItem("nexacartUsername");

const loginButton = document.querySelector(".login-btn");
const userMenu = document.querySelector(".user-menu");
const usernameDisplay = document.getElementById("accountLabel");
const dropdownUsername = document.getElementById("dropdownUsername");

if (savedUsername) {

    // Login button hide
    if (loginButton) {
        loginButton.style.display = "flex";
    }

    // Logged-in user show
    if (userMenu) {
        userMenu.style.display = "block";
    }

    // Username show
    if (usernameDisplay) {
        usernameDisplay.textContent = savedUsername;
    }

    if (dropdownUsername) {
        dropdownUsername.textContent = savedUsername;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("nexacartUsername");
    if (username) {
        document.getElementById("accountLabel").textContent = username;
        document.getElementById("dropdownUsername").textContent = username;

        document.getElementById("dropdownLoginLink").hidden = true;
        document.getElementById("logoutBtn").hidden = false;
    }

    document.getElementById("logoutBtn").onclick = () => {
        localStorage.removeItem("nexacartUsername");
        location.reload();
    };
});

document.addEventListener("click", function (e) {
    if (e.target.closest(".dropdown-item")) {
        const item = e.target.closest(".dropdown-item");

        if (item.textContent.includes("My Profile")) {
            window.location.href = "profile.html";
        }
    }
});

document.addEventListener("DOMContentLoaded", function () {

    const myProfileBtn =
        document.getElementById("myProfileBtn");

    if (myProfileBtn) {

        myProfileBtn.addEventListener("click", function () {

            window.location.href = "profile.html";

        });

    }

});
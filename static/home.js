/* NexaCart home interactions. Keeps index.html/login page untouched. */
const homeProductsData = document.getElementById("homeProductsData");
const products = homeProductsData
    ? JSON.parse(homeProductsData.textContent || "[]")
    : [];

const $ = id => document.getElementById(id);
const productGrid = $("productGrid"), cartCountElement = $("cartCount"), wishlistCountElement = $("wishlistCount");
const toast = $("toast"), toastMessage = $("toastMessage");
let cart = {}, wishlist = new Set();
let toastTimer;

function persist() { /* Cart and wishlist are stored in MySQL. */ }
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
        card.innerHTML = `<div class="product-image">${product.badge ? `<span class="product-badge ${product.badge === "NEW" ? "new" : ""}">${product.badge}</span>` : ""}<button class="product-wishlist ${wished ? "active" : ""}" data-action="wishlist" data-name="${product.name}" aria-label="${wished ? "Remove from" : "Add to"} wishlist"><i class="${wished ? "fa-solid" : "fa-regular"} fa-heart"></i></button><a href="${product.detailUrl}" aria-label="View ${product.name}">${product.image ? `<img src="${product.image}" alt="${product.name}" loading="lazy">` : `<div class="product-image-placeholder" aria-label="No product image available"><i class="fa-regular fa-image" aria-hidden="true"></i></div>`}</a></div><div class="product-info"><h3 class="product-name"><a href="${product.detailUrl}">${product.name}</a></h3><div class="price-row"><span class="current-price">${formatPrice(product.price)}</span>${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ""}</div><div class="rating"><span class="rating-stars">${stars(product.rating)}</span><span>(${product.reviews})</span></div><div class="product-actions"><button class="add-cart-btn" data-action="add-cart" data-name="${product.name}"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button><button class="quick-view-btn" data-action="quick-view" data-name="${product.name}" aria-label="View ${product.name}"><i class="fa-regular fa-eye"></i></button></div></div>`;
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

/* Use the Flask session as the source of truth for login state. */
async function updateAccountUI() {
    let user = null;
    try {
        const response = await fetch("/check-session", { credentials: "same-origin", cache: "no-store" });
        const currentSession = await response.json();
        if (currentSession.logged_in) user = { name: currentSession.username || "Customer", email: currentSession.email || "" };
    } catch { }
    const label = $("accountLabel"), welcome = $("dropdownUsername"), email = $("dropdownEmail"), loginLink = $("dropdownLoginLink"), logout = $("logoutBtn"), mobileLogin = $("mobileLoginLink");
    if (label) label.textContent = user ? user.name.split(" ")[0] : "Login";
    if (welcome) welcome.textContent = user ? `Hi, ${user.name}` : "Welcome, Guest";
    if (email) email.textContent = user?.email || (user ? "Signed in" : "Sign in to your account");
    if (loginLink) loginLink.hidden = !!user;
    if (logout) logout.hidden = !user;
    if (mobileLogin) mobileLogin.hidden = !!user;
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

    window.location.href = "/checkout";
});

$("accountBtn")?.addEventListener("click", () => { const dd = $("accountDropdown"), open = dd.hidden; dd.hidden = !open; $("accountBtn").setAttribute("aria-expanded", String(open)); });
document.addEventListener("click", e => { if (!$("accountWrap")?.contains(e.target)) { if ($("accountDropdown")) $("accountDropdown").hidden = true; $("accountBtn")?.setAttribute("aria-expanded", "false"); } });
$("myProfileBtn")?.addEventListener("click", openProfile);
$("dropdownWishlistBtn")?.addEventListener("click", () => { renderWishlist(); openPanel("wishlistPanel"); $("accountDropdown").hidden = true; });
$("dropdownCartBtn")?.addEventListener("click", () => { renderCart(); openPanel("cartPanel"); $("accountDropdown").hidden = true; });
document.querySelectorAll("[data-close-profile]").forEach(b => b.addEventListener("click", closeProfile));
$("profileModal")?.addEventListener("click", e => { if (e.target === $("profileModal")) closeProfile(); });
$("logoutBtn")?.addEventListener("click", () => {
    window.location.href = "/logout";
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

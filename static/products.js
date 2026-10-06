/* Products listing page: catalog render, search/filter/sort aur cart/wishlist actions. */
const allProducts = JSON.parse(document.getElementById("catalogProductsData")?.textContent || "[]");
const grid = document.getElementById("productsGrid");
const searchInput = document.getElementById("productSearch");
const categoryFilter = document.getElementById("categoryFilter");
const priceFilter = document.getElementById("priceFilter");
const ratingFilter = document.getElementById("ratingFilter");
const sortProducts = document.getElementById("sortProducts");
const pageTitle = document.getElementById("pageTitle");
const productCount = document.getElementById("productCount");
const noResults = document.getElementById("noResults");
const categories = [...new Set(allProducts.map(product => product.category).filter(Boolean))].sort();

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
});

const selectedCategory = new URLSearchParams(window.location.search).get("category");
if (selectedCategory && categories.includes(selectedCategory)) {
    categoryFilter.value = selectedCategory;
    pageTitle.textContent = selectedCategory;
}

function renderProducts() {
    // Search, category, price, rating aur sorting selections apply karke product grid banata hai.
    let products = [...allProducts];
    const search = searchInput.value.trim().toLowerCase();
    if (search) products = products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search));

    if (categoryFilter.value !== "all") products = products.filter(p => p.category === categoryFilter.value);
    const price = priceFilter.value;
    if (price === "0-1000") products = products.filter(p => p.price < 1000);
    if (price === "1000-2000") products = products.filter(p => p.price >= 1000 && p.price <= 2000);
    if (price === "2000-5000") products = products.filter(p => p.price > 2000 && p.price <= 5000);
    if (price === "5000+") products = products.filter(p => p.price > 5000);
    if (ratingFilter.value !== "all") products = products.filter(p => Number(p.rating || 0) >= Number(ratingFilter.value));

    if (sortProducts.value === "low") products.sort((a, b) => a.price - b.price);
    if (sortProducts.value === "high") products.sort((a, b) => b.price - a.price);
    if (sortProducts.value === "rating") products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortProducts.value === "newest") products.sort((a, b) => b.id - a.id);

    productCount.textContent = `${products.length} products found`;
    noResults.style.display = products.length ? "none" : "block";
    grid.innerHTML = products.map(createProductCard).join("");
    updateWishlistUI();
}

function createProductCard(product) {
    // Ek catalog product ka HTML card banata hai, jisme detail, wishlist aur cart controls hote hain.
    const name = escapeHtml(product.name);
    const image = escapeHtml(product.image);
    const rating = Number(product.rating || 0);
    const price = Number(product.price || 0);
    return `<article class="product-card">
        <div class="product-image">
            <button class="wishlist" onclick="toggleWishlist(${product.id})" aria-label="Toggle wishlist"><i class="fa-regular fa-heart"></i></button>
            <a href="/products/${product.id}" aria-label="View ${name}">${image ? `<img src="${image}" alt="${name}" loading="lazy">` : `<div class="product-image-placeholder"><i class="fa-regular fa-image"></i></div>`}</a>
        </div>
        <div class="product-info">
            <span class="product-category">${escapeHtml(product.category)}</span>
            <h3><a href="/products/${product.id}">${name}</a></h3>
            <div class="rating">${rating ? `⭐ ${rating}` : "No ratings yet"}<span>(${Number(product.reviews || 0)})</span></div>
            <div class="price-row"><span class="price">₹${price.toLocaleString("en-IN")}</span></div>
            <div class="card-actions">
                <button class="add-cart" onclick="addToCart(${product.id})"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
                <a class="quick-view" href="/products/${product.id}" aria-label="View product details"><i class="fa-regular fa-eye"></i></a>
            </div>
        </div>
    </article>`;
}

function addToCart(id) {
    // Product ID ko /api/cart par bhej kar database cart mein ek quantity add karta hai.
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", product_id: product.id })
    }).then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not add to cart.");
        alert(`${product.name} added to cart!`);
    }).catch(error => alert(error.message));
}

function toggleWishlist(id) {
    // Product ID ko /api/wishlist par bhej kar saved state toggle karta hai.
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", product_id: product.id })
    }).then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not update wishlist.");
        updateWishlistUI(result.items || []);
    }).catch(error => alert(error.message));
}

function updateWishlistUI(items = null) {
    // Wishlist response ya server se loaded items ke mutabik heart icons ko active/inactive karta hai.
    const readFromDatabase = items ? Promise.resolve(items) : fetch("/api/wishlist").then(response => response.json()).then(result => {
        if (!result.success) throw new Error(result.message || "Could not load wishlist.");
        return result.items || [];
    });
    readFromDatabase.then(wishlistItems => {
    const wishlist = new Set(wishlistItems.map(item => item.name));
    document.querySelectorAll(".wishlist").forEach(button => {
        const card = button.closest(".product-card");
        const product = allProducts.find(p => p.name === card.querySelector("h3").textContent);
        const active = product && wishlist.has(product.name);
        button.classList.toggle("active", Boolean(active));
        button.innerHTML = `<i class="${active ? "fa-solid" : "fa-regular"} fa-heart"></i>`;
    });
    }).catch(error => console.error(error));
}

function quickView(id) {
    const product = allProducts.find(p => p.id === id);
    if (product) alert(`${product.name}\n\nCategory: ${product.category}\nPrice: ₹${Number(product.price).toLocaleString("en-IN")}\nStock: ${product.stock}\n\n${product.description || ""}`);
}

[searchInput, categoryFilter, priceFilter, ratingFilter, sortProducts].forEach(control => control.addEventListener("input", renderProducts));
renderProducts();

const grid = document.getElementById("productsGrid");

const searchInput =
    document.getElementById("productSearch");

const categoryFilter =
    document.getElementById("categoryFilter");

const priceFilter =
    document.getElementById("priceFilter");

const ratingFilter =
    document.getElementById("ratingFilter");

const sortProducts =
    document.getElementById("sortProducts");

const pageTitle =
    document.getElementById("pageTitle");

const productCount =
    document.getElementById("productCount");

const noResults =
    document.getElementById("noResults");


/* ==============================
   CATEGORY DROPDOWN
============================== */

categories.forEach(category => {

    const option =
        document.createElement("option");

    option.value = category;

    option.textContent = category;

    categoryFilter.appendChild(option);

});


/* ==============================
   URL CATEGORY
============================== */

const params =
    new URLSearchParams(window.location.search);

const selectedCategory =
    params.get("category");


if (selectedCategory &&
    categories.includes(selectedCategory)) {

    categoryFilter.value =
        selectedCategory;

    pageTitle.textContent =
        selectedCategory;

}


/* ==============================
   RENDER
============================== */

function renderProducts() {

    let products =
        [...allProducts];


    /* SEARCH */

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    if (search) {

        products =
            products.filter(product =>

                product.name
                    .toLowerCase()
                    .includes(search)

                ||

                product.category
                    .toLowerCase()
                    .includes(search)
            );
    }


    /* CATEGORY */

    const category =
        categoryFilter.value;

    if (category !== "all") {

        products =
            products.filter(product =>
                product.category === category
            );
    }


    /* PRICE */

    const price =
        priceFilter.value;

    if (price === "0-1000") {

        products =
            products.filter(p =>
                p.price < 1000
            );

    }

    if (price === "1000-2000") {

        products =
            products.filter(p =>
                p.price >= 1000 &&
                p.price <= 2000
            );

    }

    if (price === "2000-5000") {

        products =
            products.filter(p =>
                p.price > 2000 &&
                p.price <= 5000
            );

    }

    if (price === "5000+") {

        products =
            products.filter(p =>
                p.price > 5000
            );
    }


    /* RATING */

    const rating =
        ratingFilter.value;

    if (rating !== "all") {

        products =
            products.filter(p =>
                p.rating >= Number(rating)
            );
    }


    /* SORT */

    const sort =
        sortProducts.value;

    if (sort === "low") {

        products.sort(
            (a,b) => a.price - b.price
        );
    }

    if (sort === "high") {

        products.sort(
            (a,b) => b.price - a.price
        );
    }

    if (sort === "rating") {

        products.sort(
            (a,b) => b.rating - a.rating
        );
    }

    if (sort === "newest") {

        products.sort(
            (a,b) => b.id - a.id
        );
    }


    /* COUNT */

    productCount.textContent =
        `${products.length} products found`;


    /* EMPTY */

    if (products.length === 0) {

        grid.innerHTML = "";

        noResults.style.display =
            "block";

        return;
    }

    noResults.style.display =
        "none";


    /* CARDS */

    grid.innerHTML =
        products.map(product =>
            createProductCard(product)
        ).join("");


    updateWishlistUI();
}


/* ==============================
   PRODUCT CARD
============================== */

function createProductCard(product) {

    return `

        <article class="product-card">

            <div class="product-image">

                ${
                    product.badge
                    ?
                    `<span class="badge">
                        ${product.badge}
                    </span>`
                    :
                    ""
                }

                <button
                    class="wishlist"
                    onclick="toggleWishlist(${product.id})">

                    <i class="fa-regular fa-heart"></i>

                </button>

                <img
                    src="${product.image}"
                    alt="${product.name}"
                    loading="lazy">

            </div>


            <div class="product-info">

                <span class="product-category">
                    ${product.category}
                </span>

                <h3>
                    ${product.name}
                </h3>

                <div class="rating">

                    ⭐ ${product.rating}

                    <span>
                        (${product.reviews})
                    </span>

                </div>


                <div class="price-row">

                    <span class="price">
                        ₹${product.price.toLocaleString("en-IN")}
                    </span>

                    <span class="old-price">
                        ₹${product.oldPrice.toLocaleString("en-IN")}
                    </span>

                    <span class="discount">
                        ${product.discount}% OFF
                    </span>

                </div>


                <div class="card-actions">

                    <button
                        class="add-cart"
                        onclick="addToCart(${product.id})">

                        <i class="fa-solid fa-bag-shopping"></i>
                        Add to Cart

                    </button>


                    <button
                        class="quick-view"
                        onclick="quickView(${product.id})">

                        <i class="fa-regular fa-eye"></i>

                    </button>

                </div>

            </div>

        </article>

    `;
}


/* ==============================
   CART
============================== */

function addToCart(id) {

    const product =
        allProducts.find(
            p => p.id === id
        );

    if (!product) return;


    let cart =
        JSON.parse(
            localStorage.getItem("nexaCart")
        ) || [];


    const existing =
        cart.find(
            item => item.id === id
        );


    if (existing) {

        existing.quantity++;

    } else {

        cart.push({

            id: product.id,

            name: product.name,

            price: product.price,

            image: product.image,

            quantity: 1

        });

    }


    localStorage.setItem(
        "nexaCart",
        JSON.stringify(cart)
    );


    alert(
        `${product.name} added to cart!`
    );
}


/* ==============================
   WISHLIST
============================== */

function toggleWishlist(id) {

    let wishlist =
        JSON.parse(
            localStorage.getItem("nexaWishlist")
        ) || [];


    if (wishlist.includes(id)) {

        wishlist =
            wishlist.filter(
                item => item !== id
            );

    } else {

        wishlist.push(id);

    }


    localStorage.setItem(
        "nexaWishlist",
        JSON.stringify(wishlist)
    );


    updateWishlistUI();
}


function updateWishlistUI() {

    const wishlist =
        JSON.parse(
            localStorage.getItem("nexaWishlist")
        ) || [];


    document
        .querySelectorAll(".wishlist")
        .forEach((button, index) => {

            const card =
                button.closest(".product-card");

            const productName =
                card.querySelector("h3")
                    .textContent;

            const product =
                allProducts.find(
                    p => p.name === productName
                );

            if (!product) return;


            if (wishlist.includes(product.id)) {

                button.classList.add("active");

                button.innerHTML =
                    `<i class="fa-solid fa-heart"></i>`;

            } else {

                button.classList.remove("active");

                button.innerHTML =
                    `<i class="fa-regular fa-heart"></i>`;
            }

        });
}


/* ==============================
   QUICK VIEW
============================== */

function quickView(id) {

    const product =
        allProducts.find(
            p => p.id === id
        );

    if (!product) return;


    alert(
`${product.name}

Category: ${product.category}
Rating: ⭐ ${product.rating}
Price: ₹${product.price.toLocaleString("en-IN")}

${product.description}`
    );
}


/* ==============================
   FILTER EVENTS
============================== */

searchInput.addEventListener(
    "input",
    renderProducts
);

categoryFilter.addEventListener(
    "change",
    renderProducts
);

priceFilter.addEventListener(
    "change",
    renderProducts
);

ratingFilter.addEventListener(
    "change",
    renderProducts
);

sortProducts.addEventListener(
    "change",
    renderProducts
);


/* ==============================
   FIRST LOAD
============================== */

renderProducts();
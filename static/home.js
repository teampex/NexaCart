const products = [

    {
        name: "Premium Backpack",
        price: 3499,
        oldPrice: 4999,
        discount: "-30%",
        rating: 4.8,
        reviews: 88,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "White Sneakers",
        price: 5299,
        oldPrice: 6999,
        discount: "-24%",
        rating: 4.7,
        reviews: 72,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Classic Watch",
        price: 8999,
        oldPrice: 11999,
        discount: "-26%",
        rating: 4.9,
        reviews: 54,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Leather Handbag",
        price: 4799,
        oldPrice: 6499,
        discount: "-26%",
        rating: 4.8,
        reviews: 46,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Wireless Headphones",
        price: 6499,
        oldPrice: 8999,
        discount: "-28%",
        rating: 4.8,
        reviews: 91,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Smart Laptop",
        price: 54999,
        oldPrice: 62999,
        discount: "",
        rating: 4.9,
        reviews: 63,
        badge: "NEW",
        image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Minimal Sneakers",
        price: 4199,
        oldPrice: 5499,
        discount: "-23%",
        rating: 4.7,
        reviews: 41,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Urban Sunglasses",
        price: 1999,
        oldPrice: 2799,
        discount: "-28%",
        rating: 4.6,
        reviews: 35,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Smart Watch Pro",
        price: 7499,
        oldPrice: 9999,
        discount: "",
        rating: 4.8,
        reviews: 88,
        badge: "NEW",
        image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Everyday Hoodie",
        price: 2499,
        oldPrice: 3499,
        discount: "-29%",
        rating: 4.7,
        reviews: 29,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Aether Earbuds",
        price: 3299,
        oldPrice: 4499,
        discount: "-27%",
        rating: 4.8,
        reviews: 67,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=700&q=85"
    },

    {
        name: "Urban Travel Bag",
        price: 3999,
        oldPrice: 5499,
        discount: "-27%",
        rating: 4.7,
        reviews: 31,
        badge: "sale",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85"
    }

];


/* =========================================================
   ELEMENTS
========================================================= */

const productGrid = document.getElementById("productGrid");

const cartCountElement =
    document.getElementById("cartCount");

const wishlistCountElement =
    document.getElementById("wishlistCount");

const toast =
    document.getElementById("toast");

const toastMessage =
    document.getElementById("toastMessage");

let cartCount = 0;
let wishlistCount = 0;


/* =========================================================
   FORMAT PRICE
========================================================= */

function formatPrice(price) {

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(price);

}


/* =========================================================
   STAR RATING
========================================================= */

function createStars(rating) {

    let stars = "";

    for (let i = 1; i <= 5; i++) {

        if (i <= Math.round(rating)) {

            stars += `
                <i class="fa-solid fa-star"></i>
            `;

        } else {

            stars += `
                <i class="fa-regular fa-star"></i>
            `;

        }

    }

    return stars;
}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts(list = products) {

    productGrid.innerHTML = "";

    list.forEach((product, index) => {

        const card = document.createElement("article");

        card.className = "product-card";

        card.innerHTML = `

            <div class="product-image">

                ${
                    product.badge
                    ?
                    `<span class="product-badge ${
                        product.badge === "NEW"
                        ? "new"
                        : ""
                    }">
                        ${product.badge}
                    </span>`
                    : ""
                }

                <button
                    class="product-wishlist"
                    data-index="${index}"
                    aria-label="Add to wishlist"
                >
                    <i class="fa-regular fa-heart"></i>
                </button>

                <img
                    src="${product.image}"
                    alt="${product.name}"
                    loading="lazy"
                >

            </div>


            <div class="product-info">

                <h3 class="product-name">
                    ${product.name}
                </h3>


                <div class="price-row">

                    <span class="current-price">
                        ${formatPrice(product.price)}
                    </span>

                    <span class="old-price">
                        ${formatPrice(product.oldPrice)}
                    </span>

                </div>


                <div class="rating">

                    <span class="rating-stars">
                        ${createStars(product.rating)}
                    </span>

                    <span>
                        (${product.reviews})
                    </span>

                </div>

            </div>

        `;


        productGrid.appendChild(card);

    });


    attachProductEvents();

}


/* =========================================================
   PRODUCT EVENTS
========================================================= */

function attachProductEvents() {

    const wishlistButtons =
        document.querySelectorAll(".product-wishlist");


    wishlistButtons.forEach(button => {

        button.addEventListener("click", function () {

            const icon = this.querySelector("i");

            const active =
                this.classList.toggle("active");


            if (active) {

                icon.classList.remove(
                    "fa-regular"
                );

                icon.classList.add(
                    "fa-solid"
                );

                wishlistCount++;

                showToast(
                    "Added to wishlist ❤️"
                );

            } else {

                icon.classList.remove(
                    "fa-solid"
                );

                icon.classList.add(
                    "fa-regular"
                );

                wishlistCount--;

                showToast(
                    "Removed from wishlist"
                );

            }


            wishlistCountElement.textContent =
                wishlistCount;

        });

    });

}


/* =========================================================
   ADD TO CART — PRODUCT CARD CLICK
========================================================= */

productGrid.addEventListener("click", function (event) {

    const card =
        event.target.closest(".product-card");

    if (!card) return;

    if (
        event.target.closest(".product-wishlist")
    ) {
        return;
    }

    cartCount++;

    cartCountElement.textContent =
        cartCount;

    const name =
        card.querySelector(".product-name")
            ?.textContent
            .trim();

    showToast(
        `${name} added to cart 🛍️`
    );

});


/* =========================================================
   TOAST
========================================================= */

let toastTimer;

function showToast(message) {

    toastMessage.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2200);

}


/* =========================================================
   SEARCH
========================================================= */

const searchInput =
    document.getElementById("searchInput");


if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            const query =
                this.value
                    .toLowerCase()
                    .trim();


            if (!query) {

                renderProducts(products);

                return;

            }


            const filtered =
                products.filter(product =>

                    product.name
                        .toLowerCase()
                        .includes(query)

                );


            renderProducts(filtered);


            if (filtered.length === 0) {

                productGrid.innerHTML = `

                    <div style="
                        grid-column:1/-1;
                        padding:50px;
                        text-align:center;
                    ">

                        <i
                            class="fa-solid fa-magnifying-glass"
                            style="
                                font-size:30px;
                                color:#9ca5ab;
                                margin-bottom:12px;
                            "
                        ></i>

                        <h3>No products found</h3>

                        <p style="
                            margin-top:5px;
                            color:#89929a;
                            font-size:12px;
                        ">
                            Try another product name.
                        </p>

                    </div>

                `;

            }

        }
    );

}


/* =========================================================
   MOBILE MENU
========================================================= */

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const mobileMenu =
    document.getElementById("mobileMenu");


if (mobileMenuBtn) {

    mobileMenuBtn.addEventListener(
        "click",
        function () {

            mobileMenu.classList.toggle(
                "show"
            );


            const icon =
                this.querySelector("i");


            if (
                mobileMenu.classList.contains("show")
            ) {

                icon.classList.remove(
                    "fa-bars"
                );

                icon.classList.add(
                    "fa-xmark"
                );

            } else {

                icon.classList.remove(
                    "fa-xmark"
                );

                icon.classList.add(
                    "fa-bars"
                );

            }

        }
    );

}


/* Close mobile menu after clicking link */

document.querySelectorAll(
    ".mobile-menu a"
).forEach(link => {

    link.addEventListener("click", () => {

        mobileMenu.classList.remove("show");

    });

});


/* =========================================================
   NEWSLETTER
========================================================= */

const newsletterForm =
    document.getElementById("newsletterForm");


if (newsletterForm) {

    newsletterForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const email =
                document.getElementById(
                    "emailInput"
                ).value.trim();


            if (!email) return;


            showToast(
                "You're subscribed to NexaCart ✨"
            );


            this.reset();

        }
    );

}


/* =========================================================
   NAVBAR SHADOW
========================================================= */

window.addEventListener("scroll", () => {

    const navbar =
        document.querySelector(".navbar");


    if (window.scrollY > 20) {

        navbar.style.boxShadow =
            "0 5px 20px rgba(20,40,60,.07)";

    } else {

        navbar.style.boxShadow = "none";

    }

});


/* =========================================================
   CATEGORY CLICK
========================================================= */

document.querySelectorAll(
    ".category-card"
).forEach(category => {

    category.addEventListener(
        "click",
        () => {

            const categoryName =
                category.querySelector("h3")
                    ?.textContent
                    .trim();


            showToast(
                `${categoryName} category selected`
            );


            document
                .getElementById("products")
                ?.scrollIntoView({
                    behavior: "smooth"
                });

        }
    );

});


/* =========================================================
   BUTTON FEEDBACK
========================================================= */

document.querySelectorAll(
    ".small-btn"
).forEach(button => {

    button.addEventListener(
        "click",
        () => {

            showToast(
                "Opening collection ✨"
            );

        }
    );

});


/* =========================================================
   REVEAL ANIMATION
========================================================= */

const revealElements =
    document.querySelectorAll(
        ".category-card, .promo-card, .product-card, .service-item"
    );


const observer =
    new IntersectionObserver(
        entries => {

            entries.forEach(entry => {

                if (
                    entry.isIntersecting
                ) {

                    entry.target.style.opacity = "1";

                    entry.target.style.transform =
                        "translateY(0)";

                    observer.unobserve(
                        entry.target
                    );

                }

            });

        },
        {
            threshold: .08
        }
    );


revealElements.forEach(element => {

    element.style.opacity = "0";

    element.style.transform =
        "translateY(15px)";

    element.style.transition =
        "opacity .5s ease, transform .5s ease";

    observer.observe(element);

});


/* =========================================================
   INITIAL LOAD
========================================================= */

renderProducts();

console.log(
    "NexaCart homepage loaded successfully 🚀"
);
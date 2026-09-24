/* =========================================
   NEXACART SELLER CENTER
========================================= */

const SELLER_PRODUCTS_KEY =
    "nexacartSellerProducts";

const SELLER_KEY =
    "nexacartSeller";


/* =========================================
   SELLER DATA
========================================= */

function getSeller() {

    return JSON.parse(
        localStorage.getItem(SELLER_KEY) ||
        JSON.stringify({
            name: "Demo Seller",
            email: "seller@nexacart.com"
        })
    );

}


function getProducts() {

    return JSON.parse(
        localStorage.getItem(SELLER_PRODUCTS_KEY) ||
        "[]"
    );

}


function saveProducts(products) {

    localStorage.setItem(
        SELLER_PRODUCTS_KEY,
        JSON.stringify(products)
    );

}


/* =========================================
   LOAD SELLER
========================================= */

function loadSeller() {

    const seller = getSeller();

    const name =
        seller.name || "Seller";


    document
        .querySelectorAll("#sellerName")
        .forEach(element => {

            element.textContent = name;

        });


    const topName =
        document.getElementById("topSellerName");

    if (topName) {

        topName.textContent = name;

    }


    const dashboardName =
        document.getElementById(
            "dashboardSellerName"
        );

    if (dashboardName) {

        dashboardName.textContent = name;

    }


    const firstLetter =
        name.charAt(0).toUpperCase();


    const avatar =
        document.getElementById("sellerAvatar");

    if (avatar) {

        avatar.textContent =
            firstLetter;

    }


    const topAvatar =
        document.getElementById("topAvatar");

    if (topAvatar) {

        topAvatar.textContent =
            firstLetter;

    }

}


/* =========================================
   SECTION NAVIGATION
========================================= */

function openSection(sectionId) {

    document
        .querySelectorAll(".seller-section")
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });


    const section =
        document.getElementById(sectionId);


    if (section) {

        section.classList.add(
            "active-section"
        );

    }


    document
        .querySelectorAll(".seller-nav-item")
        .forEach(button => {

            button.classList.remove("active");

        });


    const activeButton =
        document.querySelector(
            `[data-section="${sectionId}"]`
        );


    if (activeButton) {

        activeButton.classList.add("active");

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================
   NAV BUTTONS
========================================= */

document
    .querySelectorAll(".seller-nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const section =
                    button.dataset.section;

                openSection(section);

            }
        );

    });


document
    .querySelectorAll("[data-open-section]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openSection(
                    button.dataset.openSection
                );

            }
        );

    });


/* =========================================
   PRODUCT PREVIEW
========================================= */

const productName =
    document.getElementById(
        "productName"
    );

const productPrice =
    document.getElementById(
        "productPrice"
    );

const productDescription =
    document.getElementById(
        "productDescription"
    );


if (productName) {

    productName.addEventListener(
        "input",
        () => {

            document.getElementById(
                "previewName"
            ).textContent =
                productName.value ||
                "Your Product";

        }
    );

}


if (productPrice) {

    productPrice.addEventListener(
        "input",
        () => {

            const value =
                Number(
                    productPrice.value || 0
                );

            document.getElementById(
                "previewPrice"
            ).textContent =
                "₹" +
                value.toLocaleString(
                    "en-IN"
                );

        }
    );

}


if (productDescription) {

    productDescription.addEventListener(
        "input",
        () => {

            document.getElementById(
                "previewDescription"
            ).textContent =
                productDescription.value ||
                "Product description will appear here.";

        }
    );

}


/* =========================================
   IMAGE PREVIEW
========================================= */

const productImage =
    document.getElementById(
        "productImage"
    );


if (productImage) {

    productImage.addEventListener(
        "change",
        () => {

            const file =
                productImage.files[0];

            if (!file) return;


            const reader =
                new FileReader();


            reader.onload =
                function () {

                    document.getElementById(
                        "previewImage"
                    ).src =
                        reader.result;

                };


            reader.readAsDataURL(file);

        }
    );

}


/* =========================================
   ADD PRODUCT
========================================= */

const addProductForm =
    document.getElementById(
        "addProductForm"
    );


if (addProductForm) {

    addProductForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const name =
                document
                    .getElementById(
                        "productName"
                    )
                    .value
                    .trim();


            const category =
                document
                    .getElementById(
                        "productCategory"
                    )
                    .value;


            const price =
                Number(
                    document
                        .getElementById(
                            "productPrice"
                        )
                        .value
                );


            const stock =
                Number(
                    document
                        .getElementById(
                            "productStock"
                        )
                        .value
                );


            const description =
                document
                    .getElementById(
                        "productDescription"
                    )
                    .value
                    .trim();


            const image =
                document.getElementById(
                    "previewImage"
                ).src;


            if (
                !name ||
                !category ||
                !price
            ) {

                alert(
                    "Please fill Product Name, Category and Price."
                );

                return;

            }


            const product = {

                id:
                    "P" +
                    Date.now(),

                name,

                category,

                price,

                stock,

                description,

                image,

                status:
                    "Active",

                createdAt:
                    new Date().toISOString()

            };


            const products =
                getProducts();


            products.unshift(
                product
            );


            saveProducts(
                products
            );


            alert(
                "Product added successfully! 🎉"
            );


            addProductForm.reset();


            document.getElementById(
                "previewName"
            ).textContent =
                "Your Product";


            document.getElementById(
                "previewPrice"
            ).textContent =
                "₹0";


            document.getElementById(
                "previewDescription"
            ).textContent =
                "Product description will appear here.";


            document.getElementById(
                "previewImage"
            ).src =
                "https://placehold.co/600x400?text=Product+Preview";


            renderProducts();

            updateDashboard();

            openSection(
                "products"
            );

        }
    );

}


/* =========================================
   RENDER PRODUCTS
========================================= */

function renderProducts() {

    const table =
        document.getElementById(
            "productsTable"
        );


    if (!table) return;


    const search =
        (
            document.getElementById(
                "productSearch"
            )?.value || ""
        )
        .toLowerCase();


    const category =
        document.getElementById(
            "categoryFilter"
        )?.value || "";


    const products =
        getProducts()
        .filter(product => {

            const matchSearch =
                product.name
                    .toLowerCase()
                    .includes(search);


            const matchCategory =
                !category ||
                product.category ===
                category;


            return (
                matchSearch &&
                matchCategory
            );

        });


    document.getElementById(
        "productCount"
    ).textContent =
        products.length;


    if (!products.length) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        padding:45px;
                        color:#7b849c;
                    "
                >

                    No products found.<br><br>

                    Add your first product
                    from <b>Add Product</b>.

                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        products.map(product => {

            return `

                <tr>

                    <td>

                        <div
                            style="
                                display:flex;
                                align-items:center;
                                gap:10px;
                            "
                        >

                            <img
                                src="${
                                    product.image ||
                                    "https://placehold.co/70x70"
                                }"
                                style="
                                    width:45px;
                                    height:45px;
                                    object-fit:cover;
                                    border-radius:9px;
                                "
                            >

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        product.name
                                    )}
                                </strong>

                                <small
                                    style="
                                        display:block;
                                        color:#8a92a8;
                                    "
                                >
                                    ${product.id}
                                </small>

                            </div>

                        </div>

                    </td>


                    <td>
                        ₹${product.price.toLocaleString("en-IN")}
                    </td>


                    <td>
                        ${product.stock}
                    </td>


                    <td>

                        <span class="status delivered">
                            ${product.status}
                        </span>

                    </td>


                    <td>

                        <button
                            class="small-btn"
                            onclick="
                                editProduct('${product.id}')
                            "
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>


                        <button
                            class="small-btn"
                            onclick="
                                deleteProduct('${product.id}')
                            "
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </td>

                </tr>

            `;

        })
        .join("");

}


/* =========================================
   RECENT PRODUCTS
========================================= */

function renderRecentProducts() {

    const container =
        document.getElementById(
            "recentProducts"
        );


    if (!container) return;


    const products =
        getProducts()
        .slice(0, 5);


    if (!products.length) {

        container.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#7b849c;
                    "
                >
                    No products added yet.
                </td>

            </tr>

        `;

        return;

    }


    container.innerHTML =
        products.map(product => {

            return `

                <tr>

                    <td>
                        ${escapeHTML(
                            product.name
                        )}
                    </td>

                    <td>
                        ₹${product.price.toLocaleString("en-IN")}
                    </td>

                    <td>
                        ${product.stock}
                    </td>

                    <td>
                        <span class="status delivered">
                            Active
                        </span>
                    </td>

                </tr>

            `;

        })
        .join("");

}


/* =========================================
   EDIT PRODUCT
========================================= */

function editProduct(id) {

    const products =
        getProducts();


    const product =
        products.find(
            item =>
                item.id === id
        );


    if (!product) return;


    const newName =
        prompt(
            "Product Name:",
            product.name
        );


    if (newName === null) return;


    const newPrice =
        prompt(
            "Price:",
            product.price
        );


    if (newPrice === null) return;


    const newStock =
        prompt(
            "Stock:",
            product.stock
        );


    if (newStock === null) return;


    product.name =
        newName.trim() ||
        product.name;


    product.price =
        Number(newPrice) ||
        product.price;


    product.stock =
        Number(newStock);


    saveProducts(
        products
    );


    renderProducts();

    renderRecentProducts();

    updateDashboard();


    alert(
        "Product updated successfully! ✅"
    );

}


/* =========================================
   DELETE PRODUCT
========================================= */

function deleteProduct(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this product?"
        );


    if (!confirmDelete) return;


    const products =
        getProducts()
        .filter(
            product =>
                product.id !== id
        );


    saveProducts(
        products
    );


    renderProducts();

    renderRecentProducts();

    updateDashboard();


    alert(
        "Product deleted successfully."
    );

}


/* =========================================
   DASHBOARD COUNT
========================================= */

function updateDashboard() {

    const count =
        getProducts().length;


    const total =
        document.getElementById(
            "totalProducts"
        );


    if (total) {

        total.textContent =
            count;

    }

}


/* =========================================
   SEARCH + FILTER
========================================= */

const productSearch =
    document.getElementById(
        "productSearch"
    );


if (productSearch) {

    productSearch.addEventListener(
        "input",
        renderProducts
    );

}


const categoryFilter =
    document.getElementById(
        "categoryFilter"
    );


if (categoryFilter) {

    categoryFilter.addEventListener(
        "change",
        renderProducts
    );

}


/* =========================================
   SETTINGS
========================================= */

const settingsForm =
    document.getElementById(
        "settingsForm"
    );


if (settingsForm) {

    settingsForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            alert(
                "Settings saved successfully! ✅"
            );

        }
    );

}


/* =========================================
   TOGGLE
========================================= */

document
    .querySelectorAll(".toggle")
    .forEach(toggle => {

        toggle.addEventListener(
            "click",
            () => {

                toggle.classList.toggle(
                    "active"
                );

            }
        );

    });


/* =========================================
   LOGOUT
========================================= */

const logoutButton =
    document.getElementById(
        "sellerLogout"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            const yes =
                confirm(
                    "Logout from Seller Center?"
                );


            if (!yes) return;


            localStorage.removeItem(
                SELLER_KEY
            );


            window.location.href =
                "home.html";

        }
    );

}


/* =========================================
   SECURITY HELPER
========================================= */

function escapeHTML(value) {

    return String(value)
        .replace(
            /[&<>"']/g,
            character => {

                const map = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"

                };

                return map[
                    character
                ];

            }
        );

}


/* =========================================
   INITIAL LOAD
========================================= */

loadSeller();

renderProducts();

renderRecentProducts();

updateDashboard();
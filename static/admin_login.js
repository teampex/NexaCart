/* =========================================================
   NEXACART ADMIN PANEL
   PRODUCT MANAGEMENT JS
   ========================================================= */

"use strict";

/* =========================================================
   STORAGE KEY
========================================================= */

const PRODUCT_STORAGE_KEY = "nexacartProducts";


/* =========================================================
   DEFAULT PRODUCTS
========================================================= */

const defaultProducts = [
    {
        id: 1,
        name: "Wireless Headphones",
        category: "Electronics",
        price: 2499,
        oldPrice: 3499,
        stock: 25,
        image: "",
        description: "Premium wireless headphones with clear sound.",
        status: "active"
    },

    {
        id: 2,
        name: "Smart Watch",
        category: "Electronics",
        price: 1999,
        oldPrice: 2999,
        stock: 18,
        image: "",
        description: "Stylish smartwatch with fitness tracking.",
        status: "active"
    },

    {
        id: 3,
        name: "Casual Sneakers",
        category: "Fashion",
        price: 1799,
        oldPrice: 2499,
        stock: 30,
        image: "",
        description: "Comfortable everyday sneakers.",
        status: "active"
    }
];


/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeProducts();

    loadProducts();

    updateDashboard();

    setupImagePreview();

});


/* =========================================================
   INITIALIZE PRODUCTS
========================================================= */

function initializeProducts() {

    const existingProducts =
        localStorage.getItem(PRODUCT_STORAGE_KEY);

    if (!existingProducts) {

        localStorage.setItem(
            PRODUCT_STORAGE_KEY,
            JSON.stringify(defaultProducts)
        );

    }

}


/* =========================================================
   GET PRODUCTS
========================================================= */

function getProducts() {

    try {

        const products =
            JSON.parse(
                localStorage.getItem(PRODUCT_STORAGE_KEY)
            );

        return Array.isArray(products)
            ? products
            : [];

    } catch (error) {

        console.error(
            "Error loading products:",
            error
        );

        return [];

    }

}


/* =========================================================
   SAVE PRODUCTS
========================================================= */

function saveProducts(products) {

    localStorage.setItem(
        PRODUCT_STORAGE_KEY,
        JSON.stringify(products)
    );

}


/* =========================================================
   ADD PRODUCT
========================================================= */

function addProduct(event) {

    if (event) {
        event.preventDefault();
    }

    const name =
        getInputValue("productName");

    const category =
        getInputValue("productCategory");

    const price =
        Number(getInputValue("productPrice"));

    const oldPrice =
        Number(getInputValue("productOldPrice"));

    const stock =
        Number(getInputValue("productStock"));

    const image =
        getInputValue("productImage");

    const description =
        getInputValue("productDescription");


    /* ---------------- VALIDATION ---------------- */

    if (!name) {

        showAdminToast(
            "Product name is required"
        );

        return;

    }


    if (!category) {

        showAdminToast(
            "Please select a category"
        );

        return;

    }


    if (!price || price <= 0) {

        showAdminToast(
            "Enter a valid product price"
        );

        return;

    }


    if (stock < 0 || isNaN(stock)) {

        showAdminToast(
            "Enter a valid stock quantity"
        );

        return;

    }


    /* ---------------- PRODUCT ---------------- */

    const products =
        getProducts();


    const newProduct = {

        id: Date.now(),

        name: name,

        category: category,

        price: price,

        oldPrice:
            oldPrice > 0
                ? oldPrice
                : price,

        stock: stock,

        image: image,

        description:
            description ||
            "No description available.",

        status:
            stock > 0
                ? "active"
                : "out-of-stock"

    };


    products.unshift(
        newProduct
    );


    saveProducts(products);


    /* ---------------- RESET FORM ---------------- */

    resetProductForm();


    /* ---------------- REFRESH ---------------- */

    loadProducts();

    updateDashboard();


    showAdminToast(
        "Product added successfully!"
    );

}


/* =========================================================
   GET INPUT VALUE
========================================================= */

function getInputValue(id) {

    const element =
        document.getElementById(id);

    if (!element) {
        return "";
    }

    return element.value.trim();

}


/* =========================================================
   LOAD PRODUCTS
========================================================= */

function loadProducts() {

    const container =
        document.getElementById(
            "productsTableBody"
        );


    if (!container) {
        return;
    }


    const products =
        getProducts();


    container.innerHTML = "";


    if (products.length === 0) {

        container.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty-table"
                >

                    <i class="fa-solid fa-box-open"></i>

                    <h3>No Products Found</h3>

                    <p>
                        Add your first product.
                    </p>

                </td>

            </tr>

        `;

        return;

    }


    products.forEach(
        product => {

            const row =
                document.createElement("tr");


            const image =
                product.image
                    ? product.image
                    : "";


            row.innerHTML = `

                <td>

                    <div class="admin-product">

                        ${
                            image
                                ? `
                                    <img
                                        src="${escapeHTML(image)}"
                                        alt="${escapeHTML(product.name)}"
                                    >
                                  `
                                : `
                                    <div class="product-placeholder">
                                        <i class="fa-solid fa-box"></i>
                                    </div>
                                  `
                        }

                        <div>

                            <strong>
                                ${escapeHTML(product.name)}
                            </strong>

                            <small>
                                #${product.id}
                            </small>

                        </div>

                    </div>

                </td>


                <td>
                    ${escapeHTML(product.category)}
                </td>


                <td>
                    ₹${Number(product.price).toLocaleString("en-IN")}
                </td>


                <td>
                    ₹${Number(product.oldPrice).toLocaleString("en-IN")}
                </td>


                <td>

                    <span
                        class="
                            stock-badge
                            ${
                                product.stock > 0
                                    ? "in-stock"
                                    : "out-stock"
                            }
                        "
                    >

                        ${product.stock}

                    </span>

                </td>


                <td>

                    <span
                        class="
                            status-badge
                            ${
                                product.status === "active"
                                    ? "active"
                                    : "inactive"
                            }
                        "
                    >

                        ${
                            product.status === "active"
                                ? "Active"
                                : "Out of Stock"
                        }

                    </span>

                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="edit-product"
                            onclick="editProduct(${product.id})"
                            title="Edit Product"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="delete-product"
                            onclick="deleteProduct(${product.id})"
                            title="Delete Product"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </td>

            `;


            container.appendChild(row);

        }
    );

}


/* =========================================================
   EDIT PRODUCT
========================================================= */

function editProduct(id) {

    const products =
        getProducts();


    const product =
        products.find(
            item => item.id === id
        );


    if (!product) {

        showAdminToast(
            "Product not found"
        );

        return;

    }


    setInputValue(
        "productName",
        product.name
    );


    setInputValue(
        "productCategory",
        product.category
    );


    setInputValue(
        "productPrice",
        product.price
    );


    setInputValue(
        "productOldPrice",
        product.oldPrice
    );


    setInputValue(
        "productStock",
        product.stock
    );


    setInputValue(
        "productImage",
        product.image
    );


    setInputValue(
        "productDescription",
        product.description
    );


    /* Store editing ID */

    const form =
        document.getElementById(
            "productForm"
        );


    if (form) {

        form.dataset.editingId =
            String(product.id);

    }


    /* Change button */

    const submitButton =
        document.querySelector(
            "#productForm button[type='submit']"
        );


    if (submitButton) {

        submitButton.innerHTML = `

            <i class="fa-solid fa-check"></i>

            Update Product

        `;

    }


    /* Scroll */

    const formSection =
        document.getElementById(
            "productForm"
        );


    if (formSection) {

        formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    showAdminToast(
        "Editing product..."
    );

}


/* =========================================================
   UPDATE PRODUCT
========================================================= */

function updateProduct(id) {

    const products =
        getProducts();


    const index =
        products.findIndex(
            item => item.id === id
        );


    if (index === -1) {

        showAdminToast(
            "Product not found"
        );

        return;

    }


    const name =
        getInputValue("productName");

    const category =
        getInputValue("productCategory");

    const price =
        Number(getInputValue("productPrice"));

    const oldPrice =
        Number(getInputValue("productOldPrice"));

    const stock =
        Number(getInputValue("productStock"));

    const image =
        getInputValue("productImage");

    const description =
        getInputValue("productDescription");


    if (!name || !category || price <= 0) {

        showAdminToast(
            "Please fill all required fields"
        );

        return;

    }


    products[index] = {

        ...products[index],

        name,

        category,

        price,

        oldPrice:
            oldPrice > 0
                ? oldPrice
                : price,

        stock,

        image,

        description,

        status:
            stock > 0
                ? "active"
                : "out-of-stock"

    };


    saveProducts(products);


    resetProductForm();

    loadProducts();

    updateDashboard();


    showAdminToast(
        "Product updated successfully!"
    );

}


/* =========================================================
   FORM SUBMIT
========================================================= */

function handleProductSubmit(event) {

    event.preventDefault();


    const form =
        document.getElementById(
            "productForm"
        );


    const editingId =
        form
            ? form.dataset.editingId
            : "";


    if (editingId) {

        updateProduct(
            Number(editingId)
        );

    } else {

        addProduct(event);

    }

}


/* =========================================================
   DELETE PRODUCT
========================================================= */

function deleteProduct(id) {

    const products =
        getProducts();


    const product =
        products.find(
            item => item.id === id
        );


    if (!product) {
        return;
    }


    const confirmed =
        confirm(
            `Delete "${product.name}"?`
        );


    if (!confirmed) {
        return;
    }


    const updatedProducts =
        products.filter(
            item => item.id !== id
        );


    saveProducts(
        updatedProducts
    );


    loadProducts();

    updateDashboard();


    showAdminToast(
        "Product deleted successfully"
    );

}


/* =========================================================
   RESET FORM
========================================================= */

function resetProductForm() {

    const form =
        document.getElementById(
            "productForm"
        );


    if (!form) {
        return;
    }


    form.reset();


    delete form.dataset.editingId;


    const submitButton =
        form.querySelector(
            "button[type='submit']"
        );


    if (submitButton) {

        submitButton.innerHTML = `

            <i class="fa-solid fa-plus"></i>

            Add Product

        `;

    }


    const preview =
        document.getElementById(
            "imagePreview"
        );


    if (preview) {

        preview.innerHTML = `

            <i class="fa-regular fa-image"></i>

            <span>Image Preview</span>

        `;

    }

}


/* =========================================================
   INPUT SETTER
========================================================= */

function setInputValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.value =
            value ?? "";

    }

}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

    const products =
        getProducts();


    const totalProducts =
        products.length;


    const activeProducts =
        products.filter(
            product =>
                product.status === "active"
        ).length;


    const outOfStock =
        products.filter(
            product =>
                Number(product.stock) <= 0
        ).length;


    const totalStock =
        products.reduce(
            (total, product) =>
                total +
                Number(product.stock || 0),
            0
        );


    setText(
        "totalProducts",
        totalProducts
    );


    setText(
        "activeProducts",
        activeProducts
    );


    setText(
        "outOfStock",
        outOfStock
    );


    setText(
        "totalStock",
        totalStock
    );

}


/* =========================================================
   SEARCH PRODUCTS
========================================================= */

function searchProducts() {

    const searchInput =
        document.getElementById(
            "productSearch"
        );


    const tableBody =
        document.getElementById(
            "productsTableBody"
        );


    if (!searchInput || !tableBody) {
        return;
    }


    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    const products =
        getProducts();


    const filtered =
        products.filter(
            product =>

                product.name
                    .toLowerCase()
                    .includes(search)

                ||

                product.category
                    .toLowerCase()
                    .includes(search)

        );


    tableBody.innerHTML = "";


    if (filtered.length === 0) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty-table"
                >

                    <i class="fa-solid fa-magnifying-glass"></i>

                    <h3>
                        No matching products
                    </h3>

                </td>

            </tr>

        `;

        return;

    }


    filtered.forEach(
        product => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>

                    <div class="admin-product">

                        ${
                            product.image
                                ? `
                                    <img
                                        src="${escapeHTML(product.image)}"
                                        alt="${escapeHTML(product.name)}"
                                    >
                                  `
                                : `
                                    <div class="product-placeholder">

                                        <i class="fa-solid fa-box"></i>

                                    </div>
                                  `
                        }

                        <div>

                            <strong>
                                ${escapeHTML(product.name)}
                            </strong>

                            <small>
                                #${product.id}
                            </small>

                        </div>

                    </div>

                </td>


                <td>
                    ${escapeHTML(product.category)}
                </td>


                <td>
                    ₹${Number(product.price).toLocaleString("en-IN")}
                </td>


                <td>
                    ₹${Number(product.oldPrice).toLocaleString("en-IN")}
                </td>


                <td>
                    ${product.stock}
                </td>


                <td>

                    <span class="status-badge active">
                        ${
                            product.status === "active"
                                ? "Active"
                                : "Out of Stock"
                        }
                    </span>

                </td>


                <td>

                    <div class="product-actions">

                        <button
                            type="button"
                            class="edit-product"
                            onclick="editProduct(${product.id})"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="delete-product"
                            onclick="deleteProduct(${product.id})"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </td>

            `;


            tableBody.appendChild(row);

        }
    );

}


/* =========================================================
   IMAGE PREVIEW
========================================================= */

function setupImagePreview() {

    const imageInput =
        document.getElementById(
            "productImage"
        );


    const preview =
        document.getElementById(
            "imagePreview"
        );


    if (!imageInput || !preview) {
        return;
    }


    imageInput.addEventListener(
        "input",
        () => {

            const url =
                imageInput.value.trim();


            if (!url) {

                preview.innerHTML = `

                    <i class="fa-regular fa-image"></i>

                    <span>
                        Image Preview
                    </span>

                `;

                return;

            }


            preview.innerHTML = `

                <img
                    src="${escapeHTML(url)}"
                    alt="Product Preview"
                    onerror="this.style.display='none'"
                >

            `;

        }
    );

}


/* =========================================================
   TOAST
========================================================= */

function showAdminToast(message) {

    const toast =
        document.getElementById(
            "adminToast"
        );


    const messageElement =
        document.getElementById(
            "adminToastMessage"
        );


    if (!toast || !messageElement) {

        alert(message);

        return;

    }


    messageElement.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.adminToastTimer
    );


    window.adminToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

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
   CLEAR ALL PRODUCTS
========================================================= */

function clearAllProducts() {

    const confirmed =
        confirm(
            "Are you sure you want to delete ALL products?"
        );


    if (!confirmed) {
        return;
    }


    localStorage.removeItem(
        PRODUCT_STORAGE_KEY
    );


    localStorage.setItem(
        PRODUCT_STORAGE_KEY,
        JSON.stringify([])
    );


    loadProducts();

    updateDashboard();


    showAdminToast(
        "All products deleted"
    );

}


/* =========================================================
   EXPORT PRODUCTS
========================================================= */

function exportProducts() {

    const products =
        getProducts();


    const data =
        JSON.stringify(
            products,
            null,
            2
        );


    const blob =
        new Blob(
            [data],
            {
                type: "application/json"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        "nexacart-products.json";


    link.click();


    URL.revokeObjectURL(url);

}


/* =========================================================
   IMPORT PRODUCTS
========================================================= */

function importProducts(event) {

    const file =
        event.target.files[0];


    if (!file) {
        return;
    }


    const reader =
        new FileReader();


    reader.onload =
        function () {

            try {

                const products =
                    JSON.parse(
                        reader.result
                    );


                if (
                    !Array.isArray(products)
                ) {

                    throw new Error(
                        "Invalid product file"
                    );

                }


                saveProducts(
                    products
                );


                loadProducts();

                updateDashboard();


                showAdminToast(
                    "Products imported successfully"
                );


            } catch (error) {

                console.error(error);


                showAdminToast(
                    "Invalid product JSON file"
                );

            }

        };


    reader.readAsText(file);

}


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.addProduct =
    addProduct;

window.handleProductSubmit =
    handleProductSubmit;

window.editProduct =
    editProduct;

window.updateProduct =
    updateProduct;

window.deleteProduct =
    deleteProduct;

window.removeProduct =
    deleteProduct;

window.loadProducts =
    loadProducts;

window.searchProducts =
    searchProducts;

window.resetProductForm =
    resetProductForm;

window.clearAllProducts =
    clearAllProducts;

window.exportProducts =
    exportProducts;

window.importProducts =
    importProducts;

window.showAdminToast =
    showAdminToast;
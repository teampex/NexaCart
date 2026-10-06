/* =========================================================
   NexaCart Seller Dashboard
   ========================================================= */

"use strict";


/* =========================================================
   Storage Keys
   ========================================================= */

const SELLER_PRODUCTS_KEY = "nexacartSellerProducts";
const SELLER_KEY = "nexacartSeller";


/* =========================================================
   Seller Information
   ========================================================= */

function getSeller() {

    try {

        const savedSeller =
            localStorage.getItem(SELLER_KEY);

        if (savedSeller) {

            const seller =
                JSON.parse(savedSeller);

            if (
                seller &&
                typeof seller === "object"
            ) {
                return seller;
            }
        }

    } catch (error) {

        console.error(
            "SELLER DATA ERROR:",
            error
        );
    }

    return {
        name: "Seller",
        email: ""
    };
}


/* =========================================================
   Existing Local Products
   ---------------------------------------------------------
   Kept only to protect old localStorage data.
   New products are stored in MySQL through Flask.
   ========================================================= */

function getLocalProducts() {

    try {

        const savedProducts =
            localStorage.getItem(
                SELLER_PRODUCTS_KEY
            );

        if (!savedProducts) {
            return [];
        }

        const products =
            JSON.parse(savedProducts);

        if (!Array.isArray(products)) {
            return [];
        }

        return products;

    } catch (error) {

        console.error(
            "LOCAL PRODUCT DATA ERROR:",
            error
        );

        return [];
    }
}


/* =========================================================
   Safe HTML
   ========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   Seller Profile
   ========================================================= */

function loadSeller() {

    const seller = getSeller();

    const sellerProfile =
        document.querySelector(
            ".seller-profile"
        );

    let sellerName =
        seller.name || "Seller";

    let sellerEmail =
        seller.email || "";


    if (sellerProfile) {

        const serverName =
            sellerProfile.dataset.sellerName;

        const serverEmail =
            sellerProfile.dataset.sellerEmail;


        if (
            serverName &&
            serverName.trim() !== ""
        ) {

            sellerName =
                serverName.trim();
        }


        if (
            serverEmail &&
            serverEmail.trim() !== ""
        ) {

            sellerEmail =
                serverEmail.trim();
        }
    }


    document
        .querySelectorAll(
            ".seller-name, #sellerName, #topSellerName"
        )
        .forEach(
            (element) => {

                element.textContent =
                    sellerName;
            }
        );


    document
        .querySelectorAll(
            ".seller-email, #sellerEmail, #topSellerEmail"
        )
        .forEach(
            (element) => {

                element.textContent =
                    sellerEmail;
            }
        );


    document
        .querySelectorAll(
            ".seller-avatar, #sellerAvatar, #topSellerAvatar"
        )
        .forEach(
            (element) => {

                element.textContent =
                    sellerName
                        .charAt(0)
                        .toUpperCase();
            }
        );
}


/* =========================================================
   Section Navigation
   ========================================================= */

function openSection(sectionId) {

    const sections =
        document.querySelectorAll(
            ".dashboard-section"
        );


    sections.forEach(
        (section) => {

            section.classList.remove(
                "active"
            );
        }
    );


    const selectedSection =
        document.getElementById(
            sectionId
        );


    if (selectedSection) {

        selectedSection.classList.add(
            "active"
        );
    }


    const navLinks =
        document.querySelectorAll(
            ".sidebar-link"
        );


    navLinks.forEach(
        (link) => {

            link.classList.remove(
                "active"
            );
        }
    );


    const activeLink =
        document.querySelector(
            `[data-section="${sectionId}"]`
        );


    if (activeLink) {

        activeLink.classList.add(
            "active"
        );
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   Sidebar Navigation
   ========================================================= */

function setupNavigation() {

    const navLinks =
        document.querySelectorAll(
            ".sidebar-link[data-section]"
        );


    navLinks.forEach(
        (link) => {

            link.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    const sectionId =
                        this.dataset.section;


                    if (sectionId) {

                        openSection(
                            sectionId
                        );
                    }
                }
            );
        }
    );
}


/* =========================================================
   Image Preview
   ========================================================= */

function setupImagePreview() {

    const imageInput =
        document.getElementById(
            "productImage"
        );

    const imagePreview =
        document.getElementById(
            "imagePreview"
        );


    if (
        !imageInput ||
        !imagePreview
    ) {
        return;
    }


    imageInput.addEventListener(
        "change",
        function () {

            const file =
                this.files &&
                this.files[0];


            if (!file) {

                imagePreview
                    .removeAttribute("src");

                imagePreview.style.display =
                    "none";

                return;
            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                alert(
                    "Please select a valid image file."
                );

                this.value = "";

                imagePreview
                    .removeAttribute("src");

                imagePreview.style.display =
                    "none";

                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    imagePreview.src =
                        event.target.result;

                    imagePreview.style.display =
                        "block";
                };


            reader.readAsDataURL(file);
        }
    );
}


/* =========================================================
   Product Preview
   ========================================================= */

function setupProductPreview() {

    const nameInput =
        document.getElementById(
            "productName"
        );

    const priceInput =
        document.getElementById(
            "productPrice"
        );

    const stockInput =
        document.getElementById(
            "productStock"
        );

    const categoryInput =
        document.getElementById(
            "productCategory"
        );


    const previewName =
        document.getElementById(
            "previewProductName"
        );

    const previewPrice =
        document.getElementById(
            "previewProductPrice"
        );

    const previewStock =
        document.getElementById(
            "previewProductStock"
        );

    const previewCategory =
        document.getElementById(
            "previewProductCategory"
        );


    if (
        nameInput &&
        previewName
    ) {

        nameInput.addEventListener(
            "input",
            function () {

                previewName.textContent =
                    this.value.trim() ||
                    "Product Name";
            }
        );
    }


    if (
        priceInput &&
        previewPrice
    ) {

        priceInput.addEventListener(
            "input",
            function () {

                const price =
                    parseFloat(
                        this.value
                    );


                previewPrice.textContent =
                    !isNaN(price)
                        ? `₹${price.toLocaleString("en-IN")}`
                        : "₹0";
            }
        );
    }


    if (
        stockInput &&
        previewStock
    ) {

        stockInput.addEventListener(
            "input",
            function () {

                previewStock.textContent =
                    this.value || "0";
            }
        );
    }


    if (
        categoryInput &&
        previewCategory
    ) {

        categoryInput.addEventListener(
            "change",
            function () {

                previewCategory.textContent =
                    this.value ||
                    "Category";
            }
        );
    }
}


/* =========================================================
   Add Product
   ---------------------------------------------------------
   Product goes directly to Flask/MySQL.
   ========================================================= */

function setupAddProductForm() {

    const form =
        document.getElementById(
            "addProductForm"
        );


    if (!form) {
        return;
    }


    /*
     * Set the correct Flask route.
     */

    form.action =
        "/seller/add-product";


    form.method =
        "POST";


    /*
     * Required for product image upload.
     */

    form.enctype =
        "multipart/form-data";


    form.addEventListener(
        "submit",
        function (event) {

            const nameInput =
                document.getElementById(
                    "productName"
                );

            const categoryInput =
                document.getElementById(
                    "productCategory"
                );

            const priceInput =
                document.getElementById(
                    "productPrice"
                );

            const stockInput =
                document.getElementById(
                    "productStock"
                );


            const name =
                nameInput
                    ? nameInput.value.trim()
                    : "";


            const category =
                categoryInput
                    ? categoryInput.value.trim()
                    : "";


            const price =
                priceInput
                    ? parseFloat(
                        priceInput.value
                    )
                    : NaN;


            const stock =
                stockInput
                    ? parseInt(
                        stockInput.value,
                        10
                    )
                    : NaN;


            if (!name) {

                event.preventDefault();

                alert(
                    "Please enter product name."
                );

                return;
            }


            if (!category) {

                event.preventDefault();

                alert(
                    "Please select product category."
                );

                return;
            }


            if (
                isNaN(price) ||
                price < 0
            ) {

                event.preventDefault();

                alert(
                    "Please enter a valid product price."
                );

                return;
            }


            if (
                isNaN(stock) ||
                stock < 0
            ) {

                event.preventDefault();

                alert(
                    "Please enter a valid stock quantity."
                );

                return;
            }


            /*
             * Do not use event.preventDefault()
             * after validation.
             *
             * The browser now submits the form
             * to Flask.
             */
        }
    );
}


/* =========================================================
   Reset Product Preview
   ========================================================= */

function resetProductPreview() {

    const previewName =
        document.getElementById(
            "previewProductName"
        );

    const previewPrice =
        document.getElementById(
            "previewProductPrice"
        );

    const previewStock =
        document.getElementById(
            "previewProductStock"
        );

    const previewCategory =
        document.getElementById(
            "previewProductCategory"
        );


    if (previewName) {

        previewName.textContent =
            "Product Name";
    }


    if (previewPrice) {

        previewPrice.textContent =
            "₹0";
    }


    if (previewStock) {

        previewStock.textContent =
            "0";
    }


    if (previewCategory) {

        previewCategory.textContent =
            "Category";
    }
}


/* =========================================================
   Product Search
   ========================================================= */

function setupProductSearch() {

    const searchInput =
        document.getElementById(
            "productSearch"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        function () {

            renderProducts();
        }
    );
}


/* =========================================================
   Product Category Filter
   ========================================================= */

function setupCategoryFilter() {

    const categoryFilter =
        document.getElementById(
            "categoryFilter"
        );


    if (!categoryFilter) {
        return;
    }


    categoryFilter.addEventListener(
        "change",
        function () {

            renderProducts();
        }
    );
}


/* =========================================================
   Render / Filter Database Products
   ========================================================= */

function renderProducts() {

    const productsTable =
        document.getElementById(
            "productsTable"
        );


    if (!productsTable) {
        return;
    }


    const rows =
        productsTable.querySelectorAll(
            "tr[data-product-id]"
        );


    const searchInput =
        document.getElementById(
            "productSearch"
        );


    const categoryFilter =
        document.getElementById(
            "categoryFilter"
        );


    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const selectedCategory =
        categoryFilter
            ? categoryFilter.value
            : "all";


    let visibleCount = 0;


    rows.forEach(
        (row) => {

            const productName =
                String(
                    row.dataset.productName ||
                    row.textContent ||
                    ""
                ).toLowerCase();


            const productCategory =
                String(
                    row.dataset.productCategory ||
                    ""
                ).toLowerCase();


            const matchesSearch =
                !searchTerm ||
                productName.includes(
                    searchTerm
                ) ||
                productCategory.includes(
                    searchTerm
                );


            const matchesCategory =
                !selectedCategory ||
                selectedCategory === "all" ||
                productCategory ===
                    selectedCategory.toLowerCase();


            if (
                matchesSearch &&
                matchesCategory
            ) {

                row.style.display =
                    "";

                visibleCount++;

            } else {

                row.style.display =
                    "none";
            }
        }
    );


    const productCount =
        document.getElementById(
            "productCount"
        );


    if (productCount) {

        productCount.textContent =
            visibleCount;
    }
}


/* =========================================================
   View Product Details
   ========================================================= */

function viewProductDetails(productId) {

    const row =
        document.querySelector(
            `#productsTable tr[data-product-id="${productId}"]`
        );


    if (!row) {

        alert(
            "Product details could not be found."
        );

        return;
    }


    const productName =
        row.dataset.productName ||
        "Product";


    const category =
        row.dataset.productCategory ||
        "N/A";


    const price =
        Number(
            row.dataset.productPrice ||
            0
        );


    const stock =
        Number(
            row.dataset.productStock ||
            0
        );


    alert(
        "Product Details\n\n" +
        "Name: " +
        productName +
        "\nCategory: " +
        category +
        "\nPrice: ₹" +
        price.toLocaleString("en-IN") +
        "\nStock: " +
        stock
    );
}


/* =========================================================
   Edit Product
   ---------------------------------------------------------
   Normal Flask POST.
   ========================================================= */

function editProduct(productId) {

    const row =
        document.querySelector(
            `#productsTable tr[data-product-id="${productId}"]`
        );


    if (!row) {

        alert(
            "Product not found."
        );

        return;
    }


    const productName =
        row.dataset.productName ||
        "";


    const productPrice =
        row.dataset.productPrice ||
        "0";


    const productStock =
        row.dataset.productStock ||
        "0";


    const newName =
        prompt(
            "Enter product name:",
            productName
        );


    if (newName === null) {
        return;
    }


    const cleanName =
        newName.trim();


    if (!cleanName) {

        alert(
            "Product name cannot be empty."
        );

        return;
    }


    const newPrice =
        prompt(
            "Enter product price:",
            productPrice
        );


    if (newPrice === null) {
        return;
    }


    const parsedPrice =
        parseFloat(newPrice);


    if (
        isNaN(parsedPrice) ||
        parsedPrice < 0
    ) {

        alert(
            "Please enter a valid price."
        );

        return;
    }


    const newStock =
        prompt(
            "Enter product stock:",
            productStock
        );


    if (newStock === null) {
        return;
    }


    const parsedStock =
        parseInt(
            newStock,
            10
        );


    if (
        isNaN(parsedStock) ||
        parsedStock < 0
    ) {

        alert(
            "Please enter a valid stock quantity."
        );

        return;
    }


    /*
     * Create normal HTML POST form.
     */

    const form =
        document.createElement(
            "form"
        );


    form.method =
        "POST";


    form.action =
        `/seller/product/${encodeURIComponent(productId)}/edit`;


    const fields = {

        name: cleanName,

        price: parsedPrice,

        stock: parsedStock
    };


    Object.keys(fields).forEach(
        (key) => {

            const input =
                document.createElement(
                    "input"
                );


            input.type =
                "hidden";


            input.name =
                key;


            input.value =
                fields[key];


            form.appendChild(
                input
            );
        }
    );


    document.body.appendChild(
        form
    );


    form.submit();
}


/* =========================================================
   Delete Product
   ---------------------------------------------------------
   Normal Flask POST.
   ========================================================= */

function deleteProduct(productId) {

    const row =
        document.querySelector(
            `#productsTable tr[data-product-id="${productId}"]`
        );


    if (!row) {

        alert(
            "Product not found."
        );

        return;
    }


    const productName =
        row.dataset.productName ||
        "this product";


    const confirmed =
        confirm(
            `Are you sure you want to delete "${productName}"?`
        );


    if (!confirmed) {
        return;
    }


    const form =
        document.createElement(
            "form"
        );


    form.method =
        "POST";


    form.action =
        `/seller/product/${encodeURIComponent(productId)}/delete`;


    document.body.appendChild(
        form
    );


    form.submit();
}


/* =========================================================
   Dashboard Statistics
   ========================================================= */

function updateDashboard() {

    const rows =
        document.querySelectorAll(
            "#productsTable tr[data-product-id]"
        );


    const totalProducts =
        rows.length;


    const totalProductsElement =
        document.getElementById(
            "totalProducts"
        );


    if (totalProductsElement) {

        totalProductsElement.textContent =
            totalProducts;
    }


    let totalStock = 0;

    let totalProductValue = 0;


    rows.forEach(
        (row) => {

            const stock =
                Number(
                    row.dataset.productStock ||
                    0
                );


            const price =
                Number(
                    row.dataset.productPrice ||
                    0
                );


            totalStock +=
                stock;


            totalProductValue +=
                price * stock;
        }
    );


    const totalStockElement =
        document.getElementById(
            "totalStock"
        );


    if (totalStockElement) {

        totalStockElement.textContent =
            totalStock;
    }


    const totalProductValueElement =
        document.getElementById(
            "totalProductValue"
        );


    if (
        totalProductValueElement
    ) {

        totalProductValueElement.textContent =
            `₹${totalProductValue.toLocaleString("en-IN")}`;
    }
}


/* =========================================================
   Category Options
   ========================================================= */

function setupCategoryOptions() {

    const categoryFilter =
        document.getElementById(
            "categoryFilter"
        );


    if (!categoryFilter) {
        return;
    }


    /*
     * Existing 24 product categories.
     */

    const existingCategories = [

        "Electronics",

        "Mobile Phones",

        "Laptops & Computers",

        "Tablets",

        "Audio & Headphones",

        "Cameras & Photography",

        "Televisions",

        "Home Appliances",

        "Kitchen Appliances",

        "Furniture",

        "Home & Decor",

        "Fashion – Men",

        "Fashion – Women",

        "Footwear",

        "Watches",

        "Jewellery & Accessories",

        "Beauty & Personal Care",

        "Sports & Fitness",

        "Toys & Games",

        "Books",

        "Groceries",

        "Baby Products",

        "Automotive Accessories",

        "Pet Supplies"
    ];


    /*
     * Existing Add Product categories.
     */

    const addProductCategories = [

        "Electronics",

        "Fashion",

        "Shoes",

        "Bags",

        "Beauty",

        "Gaming",

        "Sports",

        "Books",

        "Home & Living"
    ];


    const currentValue =
        categoryFilter.value;


    const allCategories = [

        ...existingCategories,

        ...addProductCategories
    ];


    const uniqueCategories =
        [
            ...new Set(
                allCategories
            )
        ];


    categoryFilter.innerHTML = `
        <option value="all">
            All Categories
        </option>
    `;


    uniqueCategories.forEach(
        (category) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                category;


            option.textContent =
                category;


            categoryFilter.appendChild(
                option
            );
        }
    );


    const matchingOption =
        [
            ...categoryFilter.options
        ].find(
            (option) =>

                option.value.toLowerCase() ===
                String(
                    currentValue
                ).toLowerCase()
        );


    if (matchingOption) {

        categoryFilter.value =
            matchingOption.value;
    }
}


/* =========================================================
   Settings
   ========================================================= */

function setupSettings() {

    const settingsForm =
        document.getElementById(
            "sellerSettingsForm"
        );


    if (!settingsForm) {
        return;
    }


    settingsForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            alert(
                "Settings saved successfully."
            );
        }
    );
}


/* =========================================================
   Toggle Switches
   ========================================================= */

function setupToggles() {

    const toggles =
        document.querySelectorAll(
            'input[type="checkbox"][data-toggle]'
        );


    toggles.forEach(
        (toggle) => {

            toggle.addEventListener(
                "change",
                function () {

                    const settingName =
                        this.dataset.toggle ||
                        "Setting";


                    console.log(
                        `${settingName}:`,
                        this.checked
                    );
                }
            );
        }
    );
}


/* =========================================================
   Global Search
   ========================================================= */

function setupGlobalSearch() {

    const globalSearch =
        document.getElementById(
            "globalSearch"
        );


    if (!globalSearch) {
        return;
    }


    globalSearch.addEventListener(
        "input",
        function () {

            const value =
                this.value.trim();


            const productSearch =
                document.getElementById(
                    "productSearch"
                );


            if (productSearch) {

                productSearch.value =
                    value;
            }


            if (value) {

                openSection(
                    "products"
                );
            }


            renderProducts();
        }
    );
}


/* =========================================================
   Notifications
   ========================================================= */

function setupNotifications() {

    const notificationButtons =
        document.querySelectorAll(
            ".notification-btn, #notificationBtn"
        );


    notificationButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                function () {

                    alert(
                        "No new notifications."
                    );
                }
            );
        }
    );
}


/* =========================================================
   Quick Actions
   ========================================================= */

function setupQuickActions() {

    const addProductButtons =
        document.querySelectorAll(
            '[data-action="add-product"]'
        );


    addProductButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openSection(
                        "add-product"
                    );
                }
            );
        }
    );


    const viewProductsButtons =
        document.querySelectorAll(
            '[data-action="view-products"]'
        );


    viewProductsButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openSection(
                        "products"
                    );
                }
            );
        }
    );


    const viewOrdersButtons =
        document.querySelectorAll(
            '[data-action="view-orders"]'
        );


    viewOrdersButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openSection(
                        "orders"
                    );
                }
            );
        }
    );
}


/* =========================================================
   Image Error Handling
   ========================================================= */

function setupImageErrorHandling() {

    document.addEventListener(
        "error",
        function (event) {

            const element =
                event.target;


            if (
                element &&
                element.tagName === "IMG"
            ) {

                if (
                    element.classList.contains(
                        "product-image"
                    ) ||
                    element.classList.contains(
                        "product-table-image"
                    )
                ) {

                    element.style.display =
                        "none";
                }
            }
        },
        true
    );
}


/* =========================================================
   Dashboard Load
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadSeller();

        setupNavigation();

        setupImagePreview();

        setupProductPreview();

        setupAddProductForm();

        setupProductSearch();

        setupCategoryFilter();

        setupCategoryOptions();

        setupSettings();

        setupToggles();

        setupGlobalSearch();

        setupNotifications();

        setupQuickActions();

        setupImageErrorHandling();

        renderProducts();

        updateDashboard();


        /*
         * Dashboard is the default section.
         */

        const dashboardSection =
            document.getElementById(
                "dashboard"
            );


        if (dashboardSection) {

            openSection(
                "dashboard"
            );
        }
    }
);


/* =========================================================
   Global Functions
   ========================================================= */

window.openSection =
    openSection;


window.renderProducts =
    renderProducts;


window.viewProductDetails =
    viewProductDetails;


window.editProduct =
    editProduct;


window.deleteProduct =
    deleteProduct;
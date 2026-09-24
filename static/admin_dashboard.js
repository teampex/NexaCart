document.addEventListener("DOMContentLoaded", () => {

    const navItems = document.querySelectorAll(".admin-nav-item");
    const sections = document.querySelectorAll(".admin-section");

    const pageTitle = document.getElementById("pageTitle");

    const sellerSearch = document.getElementById("sellerSearch");
    const sellerStatusFilter =
        document.getElementById("sellerStatusFilter");

    const sellersTable =
        document.getElementById("sellersTable");

    const sellerModal =
        document.getElementById("sellerModal");

    const deleteModal =
        document.getElementById("deleteModal");

    let sellers = [];
    let selectedSeller = null;


    // =========================================================
    // NAVIGATION
    // =========================================================

    const titles = {
        dashboard: "Dashboard",
        sellers: "Sellers",
        users: "Users",
        products: "Products",
        orders: "Orders",
        categories: "Categories",
        analytics: "Analytics",
        settings: "Settings"
    };


    function openSection(sectionId) {

        navItems.forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.section === sectionId
            );

        });


        sections.forEach(section => {

            section.classList.toggle(
                "active-section",
                section.id === sectionId
            );

        });


        pageTitle.textContent =
            titles[sectionId] || "Dashboard";

    }


    navItems.forEach(item => {

        item.addEventListener("click", () => {

            openSection(item.dataset.section);

        });

    });


    document
        .querySelectorAll("[data-section-target]")
        .forEach(button => {

            button.addEventListener("click", () => {

                openSection(
                    button.dataset.sectionTarget
                );

            });

        });


    // =========================================================
    // LOAD DASHBOARD STATS
    // =========================================================

    async function loadStats() {

        try {

            const response =
                await fetch("/api/admin/stats");

            const data =
                await response.json();

            if (!data.success) {
                return;
            }


            const stats = data.stats;


            document.getElementById("totalUsers")
                .textContent =
                stats.total_users;


            document.getElementById("totalSellers")
                .textContent =
                stats.total_sellers;


            document.getElementById("totalProducts")
                .textContent =
                stats.total_products;


            document.getElementById("activeSellers")
                .textContent =
                stats.active_sellers;


            document.getElementById("activeSellerCount")
                .textContent =
                stats.active_sellers;


            document.getElementById("blockedSellerCount")
                .textContent =
                stats.blocked_sellers;

        } catch (error) {

            console.error(
                "Stats error:",
                error
            );

        }

    }


    // =========================================================
    // LOAD SELLERS
    // =========================================================

    async function loadSellers() {

        try {

            const response =
                await fetch("/api/admin/sellers");

            const data =
                await response.json();

            if (!data.success) {

                sellersTable.innerHTML = `
                    <tr>
                        <td colspan="7">
                            Unable to load sellers.
                        </td>
                    </tr>
                `;

                return;
            }


            sellers = data.sellers;

            renderSellers();

        } catch (error) {

            console.error(
                "Seller loading error:",
                error
            );

            sellersTable.innerHTML = `
                <tr>
                    <td colspan="7">
                        Server error while loading sellers.
                    </td>
                </tr>
            `;

        }

    }


    // =========================================================
    // RENDER SELLERS
    // =========================================================

    function renderSellers() {

        const search =
            sellerSearch.value
                .trim()
                .toLowerCase();

        const status =
            sellerStatusFilter.value;


        const filtered =
            sellers.filter(seller => {

                const matchesSearch =
                    seller.name
                        .toLowerCase()
                        .includes(search) ||

                    seller.email
                        .toLowerCase()
                        .includes(search) ||

                    seller.phone
                        .toLowerCase()
                        .includes(search);


                const matchesStatus =
                    !status ||
                    seller.status === status;


                return matchesSearch &&
                       matchesStatus;

            });


        if (filtered.length === 0) {

            sellersTable.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        No sellers found.
                    </td>
                </tr>
            `;

            return;
        }


        sellersTable.innerHTML =
            filtered.map(seller => {

                const initials =
                    seller.name
                        .charAt(0)
                        .toUpperCase();


                const date =
                    seller.created_at
                        ? new Date(
                            seller.created_at
                          ).toLocaleDateString(
                            "en-IN"
                          )
                        : "-";


                return `

                    <tr>

                        <td>

                            <div class="seller-cell">

                                <div class="table-avatar">
                                    ${initials}
                                </div>

                                <div>

                                    <strong>
                                        ${escapeHtml(
                                            seller.name
                                        )}
                                    </strong>

                                    <small>
                                        Seller #${seller.id}
                                    </small>

                                </div>

                            </div>

                        </td>


                        <td>
                            ${escapeHtml(
                                seller.email
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                seller.phone
                            )}
                        </td>


                        <td>
                            ${seller.product_count || 0}
                        </td>


                        <td>

                            <span
                                class="status-badge
                                ${seller.status}"
                            >
                                ${seller.status}
                            </span>

                        </td>


                        <td>
                            ${date}
                        </td>


                        <td>

                            <div class="action-buttons">

                                <button
                                    class="icon-btn view-btn"
                                    data-id="${seller.id}"
                                    title="View Seller"
                                >
                                    <i class="fa-solid fa-eye"></i>
                                </button>


                                <button
                                    class="icon-btn
                                    ${seller.status === "active"
                                        ? "block-btn"
                                        : "activate-btn"}"
                                    data-id="${seller.id}"
                                    title="${
                                        seller.status === "active"
                                        ? "Block Seller"
                                        : "Activate Seller"
                                    }"
                                >
                                    <i class="fa-solid ${
                                        seller.status === "active"
                                        ? "fa-ban"
                                        : "fa-check"
                                    }"></i>
                                </button>


                                <button
                                    class="icon-btn delete-btn"
                                    data-id="${seller.id}"
                                    title="Delete Seller"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>

                            </div>

                        </td>

                    </tr>

                `;

            }).join("");


        attachSellerActions();

    }


    // =========================================================
    // SELLER ACTIONS
    // =========================================================

    function attachSellerActions() {

        document
            .querySelectorAll(".view-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        openSeller(
                            Number(button.dataset.id)
                        );

                    }
                );

            });


        document
            .querySelectorAll(".block-btn, .activate-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const seller =
                            sellers.find(
                                s =>
                                s.id ===
                                Number(button.dataset.id)
                            );


                        if (!seller) {
                            return;
                        }


                        changeSellerStatus(
                            seller.id,
                            seller.status === "active"
                                ? "blocked"
                                : "active"
                        );

                    }
                );

            });


        document
            .querySelectorAll(".delete-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        selectedSeller =
                            sellers.find(
                                s =>
                                s.id ===
                                Number(button.dataset.id)
                            );


                        if (selectedSeller) {

                            deleteModal.classList.add(
                                "show"
                            );

                        }

                    }
                );

            });

    }


    // =========================================================
    // VIEW SELLER
    // =========================================================

    async function openSeller(sellerId) {

        try {

            const response =
                await fetch(
                    `/api/admin/sellers/${sellerId}`
                );

            const data =
                await response.json();


            if (!data.success) {

                alert(data.message);

                return;

            }


            selectedSeller = data.seller;


            const seller =
                data.seller;


            document.getElementById(
                "modalAvatar"
            ).textContent =
                seller.name
                    .charAt(0)
                    .toUpperCase();


            document.getElementById(
                "modalSellerName"
            ).textContent =
                seller.name;


            document.getElementById(
                "modalSellerEmail"
            ).textContent =
                seller.email;


            document.getElementById(
                "modalSellerPhone"
            ).textContent =
                seller.phone;


            document.getElementById(
                "modalSellerStatus"
            ).textContent =
                seller.status;


            document.getElementById(
                "modalSellerJoined"
            ).textContent =
                seller.created_at
                    ? new Date(
                        seller.created_at
                      ).toLocaleDateString(
                        "en-IN"
                      )
                    : "-";


            document.getElementById(
                "modalProductCount"
            ).textContent =
                data.products.length;


            document.getElementById(
                "modalToggleStatus"
            ).textContent =
                seller.status === "active"
                    ? "Block Seller"
                    : "Activate Seller";


            const productsList =
                document.getElementById(
                    "modalProductsList"
                );


            if (data.products.length === 0) {

                productsList.innerHTML = `
                    <div class="no-products">
                        No products added by this seller.
                    </div>
                `;

            } else {

                productsList.innerHTML =
                    data.products.map(product => {

                        return `

                            <div class="modal-product">

                                <div>

                                    <strong>
                                        ${escapeHtml(
                                            product.name
                                        )}
                                    </strong>

                                    <small>
                                        Stock:
                                        ${product.stock ?? 0}
                                    </small>

                                </div>

                                <strong>
                                    ₹${Number(
                                        product.price || 0
                                    ).toLocaleString("en-IN")}
                                </strong>

                            </div>

                        `;

                    }).join("");

            }


            sellerModal.classList.add("show");

        } catch (error) {

            console.error(error);

            alert(
                "Unable to load seller details."
            );

        }

    }


    // =========================================================
    // CHANGE STATUS
    // =========================================================

    async function changeSellerStatus(
        sellerId,
        status
    ) {

        try {

            const response =
                await fetch(
                    `/api/admin/sellers/${sellerId}/status`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            status: status
                        })
                    }
                );


            const data =
                await response.json();


            if (!data.success) {

                alert(data.message);

                return;

            }


            await loadStats();
            await loadSellers();

        } catch (error) {

            console.error(error);

            alert(
                "Unable to update seller status."
            );

        }

    }


    // =========================================================
    // DELETE SELLER
    // =========================================================

    async function deleteSeller(
        deleteProducts
    ) {

        if (!selectedSeller) {
            return;
        }


        try {

            const response =
                await fetch(
                    `/api/admin/sellers/${selectedSeller.id}/delete`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            delete_products:
                                deleteProducts
                        })
                    }
                );


            const data =
                await response.json();


            if (!data.success) {

                alert(data.message);

                return;

            }


            deleteModal.classList.remove(
                "show"
            );

            sellerModal.classList.remove(
                "show"
            );


            selectedSeller = null;


            await loadStats();
            await loadSellers();


            alert(
                "Seller deleted successfully."
            );

        } catch (error) {

            console.error(error);

            alert(
                "Unable to delete seller."
            );

        }

    }


    // =========================================================
    // MODAL CONTROLS
    // =========================================================

    document
        .getElementById("closeSellerModal")
        .addEventListener(
            "click",
            () => {

                sellerModal.classList.remove(
                    "show"
                );

            }
        );


    document
        .getElementById("cancelDelete")
        .addEventListener(
            "click",
            () => {

                deleteModal.classList.remove(
                    "show"
                );

            }
        );


    document
        .getElementById("keepProductsBtn")
        .addEventListener(
            "click",
            () => {

                deleteSeller(false);

            }
        );


    document
        .getElementById("deleteProductsBtn")
        .addEventListener(
            "click",
            () => {

                deleteSeller(true);

            }
        );


    document
        .getElementById("modalDeleteSeller")
        .addEventListener(
            "click",
            () => {

                if (selectedSeller) {

                    deleteModal.classList.add(
                        "show"
                    );

                }

            }
        );


    document
        .getElementById("modalToggleStatus")
        .addEventListener(
            "click",
            () => {

                if (!selectedSeller) {
                    return;
                }


                const newStatus =
                    selectedSeller.status === "active"
                        ? "blocked"
                        : "active";


                changeSellerStatus(
                    selectedSeller.id,
                    newStatus
                );


                sellerModal.classList.remove(
                    "show"
                );

            }
        );


    sellerModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                sellerModal
            ) {

                sellerModal.classList.remove(
                    "show"
                );

            }

        }
    );


    deleteModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                deleteModal
            ) {

                deleteModal.classList.remove(
                    "show"
                );

            }

        }
    );


    // =========================================================
    // SEARCH / FILTER
    // =========================================================

    sellerSearch.addEventListener(
        "input",
        renderSellers
    );


    sellerStatusFilter.addEventListener(
        "change",
        renderSellers
    );


    // =========================================================
    // HTML ESCAPE
    // =========================================================

    function escapeHtml(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    loadStats();
    loadSellers();

});
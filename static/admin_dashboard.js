document.addEventListener("DOMContentLoaded", () => {
    // Admin dashboard ke tables, filters aur form-based actions ko browser mein initialize karta hai.

    // =========================================================
    // NEXACART ADMIN DASHBOARD
    // =========================================================
    //
    // This JavaScript does NOT use any API.
    //
    // Seller and User actions are handled through normal
    // HTML forms that submit directly to Flask routes.
    //
    // Example routes:
    //
    // POST /admin/seller/<id>/status
    // POST /admin/seller/<id>/delete
    // POST /admin/user/<id>/status
    // POST /admin/user/<id>/delete
    //
    // There is no fetch(), XMLHttpRequest(), or /api/... here.
    // =========================================================


    // =========================================================
    // ELEMENT REFERENCES
    // =========================================================

    const navItems =
        document.querySelectorAll(".admin-nav-item");

    const sections =
        document.querySelectorAll(".admin-section");

    const pageTitle =
        document.getElementById("pageTitle");

    const sellerSearch =
        document.getElementById("sellerSearch");

    const sellerStatusFilter =
        document.getElementById("sellerStatusFilter");

    const sellersTable =
        document.getElementById("sellersTable");

    const mobileMenu =
        document.getElementById("mobileMenu");

    const sidebar =
        document.querySelector(".admin-sidebar");


    // =========================================================
    // PAGE TITLES
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


    // =========================================================
    // SECTION NAVIGATION
    // =========================================================
    //
    // Opens the selected dashboard section and updates
    // the active sidebar item and page title.
    // =========================================================

    function openSection(sectionId) {

        // Update the active sidebar navigation item
        navItems.forEach(item => {

            const itemSection =
                item.dataset.section;

            item.classList.toggle(
                "active",
                itemSection === sectionId
            );

        });


        // Show only the selected section
        sections.forEach(section => {

            section.classList.toggle(
                "active-section",
                section.id === sectionId
            );

        });


        // Update the page title
        if (pageTitle) {

            pageTitle.textContent =
                titles[sectionId] || "Dashboard";

        }


        // Close the mobile sidebar after selecting a section
        if (
            window.innerWidth <= 900 &&
            sidebar
        ) {

            sidebar.classList.remove(
                "mobile-open"
            );

        }

    }


    // =========================================================
    // SIDEBAR NAVIGATION EVENTS
    // =========================================================

    navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const sectionId =
                    item.dataset.section;

                if (!sectionId) {
                    return;
                }

                openSection(sectionId);

            }
        );

    });


    // =========================================================
    // INTERNAL SECTION BUTTONS
    // =========================================================
    //
    // Any button or link containing:
    //
    // data-section-target="sellers"
    //
    // can open the corresponding dashboard section.
    // =========================================================

    document
        .querySelectorAll("[data-section-target]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const sectionId =
                        button.dataset.sectionTarget;

                    if (!sectionId) {
                        return;
                    }

                    openSection(sectionId);

                }
            );

        });


    // =========================================================
    // MOBILE SIDEBAR
    // =========================================================
    //
    // Toggles the sidebar when the mobile menu button
    // is clicked.
    // =========================================================

    if (mobileMenu && sidebar) {

        mobileMenu.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "mobile-open"
                );

            }
        );

    }


    // =========================================================
    // SELLER ROW HELPER
    // =========================================================
    //
    // Returns all seller rows currently rendered in the table.
    // =========================================================

    function getSellerRows() {

        if (!sellersTable) {
            return [];
        }


        return Array.from(
            sellersTable.querySelectorAll(
                "tr.seller-row"
            )
        );

    }


    // =========================================================
    // SELLER SEARCH AND STATUS FILTER
    // =========================================================
    //
    // Filters the seller rows that are already present in the
    // HTML table.
    //
    // No database request or API request is made here.
    // =========================================================

    function filterSellers() {

        const search =
            sellerSearch
                ? sellerSearch.value
                    .trim()
                    .toLowerCase()
                : "";


        const status =
            sellerStatusFilter
                ? sellerStatusFilter.value
                    .trim()
                    .toLowerCase()
                : "";


        const rows =
            getSellerRows();


        let visibleCount = 0;


        // Check every seller row
        rows.forEach(row => {

            const name =
                (
                    row.dataset.name || ""
                ).toLowerCase();


            const email =
                (
                    row.dataset.email || ""
                ).toLowerCase();


            const phone =
                (
                    row.dataset.phone || ""
                ).toLowerCase();


            const rowStatus =
                (
                    row.dataset.status || ""
                ).toLowerCase();


            // Check whether the row matches the search text
            const matchesSearch =
                !search ||
                name.includes(search) ||
                email.includes(search) ||
                phone.includes(search);


            // Check whether the row matches the selected status
            const matchesStatus =
                !status ||
                rowStatus === status;


            // A row is visible only when both conditions match
            const visible =
                matchesSearch &&
                matchesStatus;


            row.style.display =
                visible
                    ? ""
                    : "none";


            if (visible) {
                visibleCount++;
            }

        });


        // Display an empty message when no seller matches
        updateSellerEmptyMessage(
            visibleCount,
            rows.length
        );

    }


    // =========================================================
    // SELLER EMPTY SEARCH MESSAGE
    // =========================================================
    //
    // Displays "No sellers found" when the search/filter
    // hides all available seller rows.
    // =========================================================

    function updateSellerEmptyMessage(
        visibleCount,
        totalCount
    ) {

        // Remove any previously generated empty message
        const existing =
            document.getElementById(
                "sellerFilterEmpty"
            );


        if (existing) {
            existing.remove();
        }


        // Create the empty message only when:
        // 1. Sellers exist
        // 2. Search/filter is active
        // 3. No seller matches
        if (
            totalCount > 0 &&
            visibleCount === 0 &&
            sellersTable
        ) {

            const row =
                document.createElement("tr");


            row.id =
                "sellerFilterEmpty";


            row.innerHTML = `

                <td
                    colspan="7"
                    class="empty-table"
                >

                    <i
                        class="fa-solid fa-magnifying-glass"
                    ></i>

                    <span>
                        No sellers found.
                    </span>

                </td>

            `;


            sellersTable.appendChild(row);

        }

    }


    // =========================================================
    // SELLER SEARCH EVENT
    // =========================================================

    if (sellerSearch) {

        sellerSearch.addEventListener(
            "input",
            filterSellers
        );

    }


    // =========================================================
    // SELLER STATUS FILTER EVENT
    // =========================================================

    if (sellerStatusFilter) {

        sellerStatusFilter.addEventListener(
            "change",
            filterSellers
        );

    }


    // =========================================================
    // SELLER DELETE CONFIRMATION
    // =========================================================
    //
    // The actual delete operation is performed by Flask.
    //
    // JavaScript only asks the administrator for confirmation
    // before allowing the form submission.
    // =========================================================

    const sellerDeleteForms =
        document.querySelectorAll(
            'form[data-confirm-delete-seller]'
        );


    sellerDeleteForms.forEach(form => {

        form.addEventListener(
            "submit",
            event => {

                const confirmed =
                    window.confirm(
                        "Are you sure you want to delete this seller?"
                    );


                if (!confirmed) {

                    event.preventDefault();

                }

            }
        );

    });


    // =========================================================
    // USER DELETE CONFIRMATION
    // =========================================================
    //
    // The actual user deletion is performed by Flask.
    //
    // JavaScript only handles the confirmation dialog.
    // =========================================================

    const userDeleteForms =
        document.querySelectorAll(
            'form[data-confirm-delete-user]'
        );


    userDeleteForms.forEach(form => {

        form.addEventListener(
            "submit",
            event => {

                const confirmed =
                    window.confirm(
                        "Are you sure you want to delete this user?"
                    );


                if (!confirmed) {

                    event.preventDefault();

                }

            }
        );

    });


    // =========================================================
    // BLOCK / ACTIVATE CONFIRMATION
    // =========================================================
    //
    // The actual status change is performed by Flask.
    //
    // JavaScript only displays a confirmation dialog before
    // the normal POST form is submitted.
    // =========================================================

    const statusForms =
        document.querySelectorAll(
            'form[data-confirm-status]'
        );


    statusForms.forEach(form => {

        form.addEventListener(
            "submit",
            event => {

                const newStatus =
                    (
                        form.dataset.confirmStatus || ""
                    ).toLowerCase();


                let message;


                if (newStatus === "blocked") {

                    message =
                        "Are you sure you want to block this account?";

                } else if (newStatus === "active") {

                    message =
                        "Are you sure you want to activate this account?";

                } else {

                    message =
                        "Are you sure you want to change this account status?";

                }


                const confirmed =
                    window.confirm(message);


                if (!confirmed) {

                    event.preventDefault();

                }

            }
        );

    });


    // =========================================================
    // ESCAPE KEY
    // =========================================================
    //
    // Pressing Escape closes the mobile sidebar.
    // =========================================================

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                sidebar
            ) {

                sidebar.classList.remove(
                    "mobile-open"
                );

            }

        }
    );


    // =========================================================
    // INITIALIZE SELLER FILTER
    // =========================================================

    filterSellers();


    // =========================================================
    // INITIALIZE DEFAULT SECTION
    // =========================================================
    //
    // If a section is already marked as active in the HTML,
    // keep it active.
    //
    // Otherwise, open the Dashboard section by default.
    // =========================================================

    const currentActiveSection =
        document.querySelector(
            ".admin-section.active-section"
        );


    if (currentActiveSection) {

        openSection(
            currentActiveSection.id
        );

    } else {

        openSection("dashboard");

    }

});

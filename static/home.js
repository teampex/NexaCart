function toggleUserMenu(event) {
    event.stopPropagation();

    const dropdown = document.getElementById("userDropdown");

    if (!dropdown) return;

    dropdown.classList.toggle("show");
}

document.addEventListener("click", function () {
    const dropdown = document.getElementById("userDropdown");

    if (dropdown) {
        dropdown.classList.remove("show");
    }
});
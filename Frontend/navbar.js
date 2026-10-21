const navLinks = document.querySelectorAll(".navbar a");
const currentPath = window.location.pathname.toLowerCase();

navLinks.forEach(link => {
    const linkPath = new URL(link.href).pathname.toLowerCase();

    if (linkPath === currentPath) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
    }
});
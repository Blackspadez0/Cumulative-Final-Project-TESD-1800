
const API_URL = "http://localhost:5223/productAPI";
const ACCOUNT_API = "http://localhost:5223/accountAPI";

const productsList = document.querySelector('ul[name="products-list"]');
const createButton = document.querySelector("#create-product-button");
const form = document.querySelector("#product-form");
const confirmation = document.querySelector("#confirmation");

// List products publicly.
async function loadProducts() {
    const response = await fetch(API_URL);

    if (!response.ok) {
        throw new Error("Unable to load products.");
    }

    const products = await response.json();

    products.forEach((product) => {
        const { name, price, inventoryCount } = product;

        const newLi = document.createElement("li");
        newLi.innerText =
            `Name: ${name}, Price: $${price.toFixed(2)}, Inventory: ${inventoryCount}`;

        productsList.appendChild(newLi);
    });
}

loadProducts().catch((error) => {
    console.error(error);
});

// Check login status before showing the creation form.
createButton.addEventListener("click", async () => {
    try {
        const response = await fetch(`${ACCOUNT_API}/me`, {
            credentials: "include",
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = "Signin.html";
            return;
        }

        if (!response.ok) {
            console.error("Unable to verify sign-in status.");
            return;
        }

        form.hidden = false;
    } catch (error) {
        console.error("Unable to check sign-in status.", error);
    }
});

// Create a product.
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: formData.get("product"),
                price: parseFloat(formData.get("price")),
                inventoryCount: parseInt(formData.get("inventory"), 10),
            }),
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = "Signin.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to create product.");
        }

        form.reset();
        form.hidden = true;
        confirmation.hidden = false;
    } catch (error) {
        console.error(error);
    }
});

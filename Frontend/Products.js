
const API_URL = "http://localhost:5223/productAPI";
const ACCOUNT_API = "http://localhost:5223/accountAPI";
const PURCHASE_API_URL = "http://localhost:5223/purchaseAPI";

const productsList = document.querySelector('ul[name="products-list"]');
const createButton = document.querySelector("#create-product-button");
const form = document.querySelector("#product-form");
const confirmation = document.querySelector("#confirmation");
const purchaseMessage = document.querySelector("#purchase-message");

let isLoggedIn = false;

// Check login status once when the page loads.
async function updateAuthenticationUI() {
    try {
        const response = await fetch(`${ACCOUNT_API}/me`, {
            credentials: "include",
        });

        isLoggedIn = response.ok;
    } catch (error) {
        isLoggedIn = false;
        console.error("Unable to check sign-in status.", error);
    }

    console.log("isLoggedIn:", isLoggedIn);
}

// Load and render products.
async function loadProducts() {
    productsList.replaceChildren();

    const response = await fetch(API_URL);

    if (!response.ok) {
        throw new Error("Unable to load products.");
    }

    const products = await response.json();

    products.forEach((product) => {
        const { id, name, price, inventoryCount } = product;

        const newLi = document.createElement("li");

        const productText = document.createElement("p");
        productText.textContent =
            `Name: ${name}, Price: $${price.toFixed(2)}, Inventory: ${inventoryCount}`;

        newLi.appendChild(productText);

        // Only create purchase forms for logged-in users.
        if (isLoggedIn) {
            const purchaseForm = document.createElement("form");

            const productIdInput = document.createElement("input");
            productIdInput.type = "hidden";
            productIdInput.name = "productId";
            productIdInput.value = id;

            const quantityLabel = document.createElement("label");
            quantityLabel.textContent = "Quantity ";

            const quantityInput = document.createElement("input");
            quantityInput.type = "number";
            quantityInput.name = "quantity";
            quantityInput.required = true;
            quantityInput.value = "0";
            quantityInput.step = "1";

            quantityLabel.appendChild(quantityInput);

            const submitButton = document.createElement("button");
            submitButton.type = "submit";
            submitButton.textContent = "Purchase";
            submitButton.disabled = true;

            // Enable the button only for a valid quantity.
            quantityInput.addEventListener("input", () => {
                const quantity = quantityInput.valueAsNumber;

                submitButton.disabled =
                    !Number.isInteger(quantity) ||
                    quantity <= 0 ||
                    quantity > inventoryCount;
            });

            // Submit a purchase.
            purchaseForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const quantity = quantityInput.valueAsNumber;

                // Validate again before sending the request.
                if (
                    !Number.isInteger(quantity) ||
                    quantity <= 0 ||
                    quantity > inventoryCount
                ) {
                    submitButton.disabled = true;
                    return;
                }

                submitButton.disabled = true;
                purchaseMessage.textContent = "";

                try {
                    const purchaseResponse = await fetch(
                        `${PURCHASE_API_URL}/`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                productId: Number(productIdInput.value),
                                quantity: quantity,
                            }),
                        }
                    );

                    if (
                        purchaseResponse.status === 401 ||
                        purchaseResponse.status === 403
                    ) {
                        window.location.href = "Signin.html";
                        return;
                    }

                    if (!purchaseResponse.ok) {
                        throw new Error(
                            `Unable to complete purchase. Status: ${purchaseResponse.status}`
                        );
                    }

                    const purchase = await purchaseResponse.json();
                    const purchaseId = purchase.id ?? purchase.Id;

                    purchaseMessage.textContent =
                        `Purchase successful! Purchase ID: ${purchaseId}`;

                    // Reload products so the updated inventory appears.
                    try {
                        await loadProducts();
                    } catch (error) {
                        console.error("Unable to refresh products.", error);
                    }
                } catch (error) {
                    console.error(error);
                    purchaseMessage.textContent =
                        "Unable to complete purchase. Please try again.";

                    submitButton.disabled = false;
                }
            });

            purchaseForm.appendChild(productIdInput);
            purchaseForm.appendChild(quantityLabel);
            purchaseForm.appendChild(submitButton);

            newLi.appendChild(purchaseForm);
        }

        productsList.appendChild(newLi);
    });
}

// Check authentication before rendering products.
async function initializeProductsPage() {
    await updateAuthenticationUI();

    try {
        await loadProducts();
    } catch (error) {
        console.error(error);
    }
}

initializeProductsPage();

// Show the creation form only when logged in.
createButton.addEventListener("click", () => {
    if (!isLoggedIn) {
        window.location.href = "Signin.html";
        return;
    }

    form.hidden = false;
});

// Create a product.
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isLoggedIn) {
        window.location.href = "Signin.html";
        return;
    }

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

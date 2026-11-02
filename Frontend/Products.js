const API_URL = "http://localhost:5223/productAPI";
const ACCOUNT_API = "http://localhost:5223/accountAPI";
const PURCHASE_API_URL = "http://localhost:5223/purchaseAPI";

const productsList = document.querySelector('ul[name="products-list"]');
const createButton = document.querySelector("#create-product-button");
const form = document.querySelector("#product-form");
const confirmation = document.querySelector("#confirmation");
const purchaseMessage = document.querySelector("#purchase-message");
const productMessage = document.querySelector("#product-message");
const orderNavigation = document.querySelector("#order-navigation");
let isLoggedIn = false;
let currentUserId = null;

async function updateAuthenticationUI() {
    try {
        const response = await fetch(`${ACCOUNT_API}/me`, { credentials: "include" });
        isLoggedIn = response.ok;
        if (isLoggedIn) {
            const account = await response.json();
            currentUserId = Number(account.id);
            orderNavigation.hidden = false;
        } else {
            currentUserId = null;
            orderNavigation.hidden = true;
        }
    } catch (error) {
        isLoggedIn = false;
        currentUserId = null;
        orderNavigation.hidden = true;
        console.error("Unable to check sign-in status.", error);
    }
}

function appendTextItem(list, text) {
    const item = document.createElement("li");
    item.textContent = text;
    list.appendChild(item);
}

async function loadProducts() {
    productsList.replaceChildren();
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Unable to load products.");
    const products = await response.json();

    products.forEach((product) => {
        const { id, name, price, inventoryCount, sellerAccountId } = product;
        const item = document.createElement("li");
        item.dataset.productId = String(id);
        const productText = document.createElement("p");
        productText.textContent = `Name: ${name}, Price: $${Number(price).toFixed(2)}, Inventory: ${inventoryCount}`;
        item.appendChild(productText);

        // Fulfills seller authorization UX: controls appear only for the signed-in owner.
        if (isLoggedIn && sellerAccountId === currentUserId) {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Edit Product";
            editButton.dataset.cy = "edit-product-button";
            editButton.addEventListener("click", () => showEditForm(item, product));
            item.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete Product";
            deleteButton.dataset.cy = "delete-product-button";
            deleteButton.addEventListener("click", () => deleteProduct(id));
            item.appendChild(deleteButton);
        }

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
            quantityInput.min = "1";
            quantityLabel.appendChild(quantityInput);
            const submitButton = document.createElement("button");
            submitButton.type = "submit";
            submitButton.textContent = "Purchase";
            submitButton.disabled = true;
            const updatePurchaseButton = () => {
                const quantity = quantityInput.valueAsNumber;
                submitButton.disabled = !Number.isInteger(quantity) || quantity <= 0 || quantity > inventoryCount;
            };
            quantityInput.addEventListener("input", updatePurchaseButton);
            purchaseForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                const quantity = quantityInput.valueAsNumber;
                if (!Number.isInteger(quantity) || quantity <= 0 || quantity > inventoryCount) return updatePurchaseButton();
                submitButton.disabled = true;
                purchaseMessage.textContent = "";
                try {
                    const result = await fetch(`${PURCHASE_API_URL}/`, {
                        method: "POST", credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ productId: id, quantity })
                    });
                    if (result.status === 401 || result.status === 403) return window.location.assign("Signin.html");
                    if (!result.ok) {
                        const body = await result.json().catch(() => ({}));
                        purchaseMessage.textContent = body.message ?? "Unable to complete purchase.";
                        updatePurchaseButton();
                        return;
                    }
                    const purchase = await result.json();
                    purchaseMessage.textContent = `Purchase successful! Purchase ID: ${purchase.id}`;
                    await loadProducts();
                } catch (error) {
                    purchaseMessage.textContent = "Unable to connect to the server. Please try again.";
                    updatePurchaseButton();
                }
            });
            purchaseForm.append(productIdInput, quantityLabel, submitButton);
            item.appendChild(purchaseForm);
        }
        productsList.appendChild(item);
    });
}

function showEditForm(item, product) {
    const existing = item.querySelector("[data-cy='edit-product-form']");
    if (existing) return;
    const editForm = document.createElement("form");
    editForm.dataset.cy = "edit-product-form";
    editForm.innerHTML = `<label>Name <input name="name" required></label><label>Price <input name="price" type="number" min="0" step="0.01" required></label><label>Inventory <input name="inventoryCount" type="number" min="0" step="1" required></label><button type="submit">Save Changes</button>`;
    editForm.elements.name.value = product.name;
    editForm.elements.price.value = product.price;
    editForm.elements.inventoryCount.value = product.inventoryCount;
    editForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const response = await fetch(`${API_URL}/${product.id}`, {
            method: "PUT", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: editForm.elements.name.value.trim(),
                price: Number(editForm.elements.price.value),
                inventoryCount: Number(editForm.elements.inventoryCount.value)
            })
        });
        if (response.status === 401 || response.status === 403) return window.location.assign("Signin.html");
        if (!response.ok) {
            productMessage.textContent = "Unable to update product.";
            return;
        }
        const result = await response.json();
        productMessage.textContent = `Product updated successfully. Product ID: ${result.id}`;
        await loadProducts();
    });
    item.appendChild(editForm);
}

async function deleteProduct(id) {
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE", credentials: "include" });
    if (response.status === 401 || response.status === 403) return window.location.assign("Signin.html");
    if (!response.ok) {
        productMessage.textContent = "Unable to delete product.";
        return;
    }
    const result = await response.json();
    productMessage.textContent = `Product deleted successfully. Product ID: ${result.id}`;
    await loadProducts();
}

async function loadOrders(endpoint, list, section) {
    list.replaceChildren();
    const response = await fetch(`${PURCHASE_API_URL}/${endpoint}`, { credentials: "include" });
    if (response.status === 401 || response.status === 403) return window.location.assign("Signin.html");
    if (!response.ok) throw new Error("Unable to load orders.");
    const orders = await response.json();
    if (orders.length === 0) appendTextItem(list, "No orders found.");
    orders.forEach(order => appendTextItem(list,
        `Order ${order.id}: ${order.productName} (Product ${order.productId}), Quantity: ${order.quantity}, Total: $${(Number(order.priceAtPurchase) * order.quantity).toFixed(2)}`));
    section.hidden = false;
}

document.querySelector("#my-purchases-button").addEventListener("click", () =>
    loadOrders("mine", document.querySelector("#my-purchases-list"), document.querySelector("#my-purchases-section")));
document.querySelector("#seller-orders-button").addEventListener("click", () =>
    loadOrders("seller", document.querySelector("#seller-orders-list"), document.querySelector("#seller-orders-section")));

async function initializeProductsPage() {
    await updateAuthenticationUI();
    try { await loadProducts(); } catch (error) { console.error("Unable to load products.", error); }
}
initializeProductsPage();

createButton.addEventListener("click", () => {
    if (!isLoggedIn) return window.location.assign("Signin.html");
    form.hidden = false;
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isLoggedIn) return window.location.assign("Signin.html");
    const data = new FormData(form);
    try {
        const response = await fetch(API_URL, {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: data.get("product"), price: Number(data.get("price")), inventoryCount: Number(data.get("inventory")) })
        });
        if (response.status === 401 || response.status === 403) return window.location.assign("Signin.html");
        if (!response.ok) throw new Error("Unable to create product.");
        form.reset();
        form.hidden = true;
        confirmation.hidden = false;
        await loadProducts();
    } catch (error) { console.error(error); }
});

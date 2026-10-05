const API_URL = "http://localhost:5279/productAPI";

const productsList = document.querySelector("ul[name=products-list]");
const createButton = document.querySelector("#create-product-button");
const form = document.querySelector("#product-form");
const confirmation = document.querySelector("#confirmation");

// List products
const getResponse = await fetch(API_URL);
const productsJson = await getResponse.json();

productsJson.forEach((product) => {
	const { name, price, inventoryCount } = product;

	const newLi = document.createElement("li");
	newLi.innerText = `Name: ${name}, Price: $${price.toFixed(2)}, Inventory: ${inventoryCount}`;

	productsList.appendChild(newLi);
});

// Show the form
createButton.addEventListener("click", () => {
	form.hidden = false;
});

// Create a product
form.addEventListener("submit", async (event) => {
	event.preventDefault();

	const formData = new FormData(form);

	const postResponse = await fetch(API_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			name: formData.get("product"),
			price: parseFloat(formData.get("price")),
			inventoryCount: parseInt(formData.get("inventory"), 10),
		}),
	});

	if (postResponse.ok) {
		form.reset();
		form.hidden = true;
		confirmation.hidden = false;
	}
});
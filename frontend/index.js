const getResponse = await fetch("http://localhost:5279/productAPI");
const productsJson = await getResponse.json();
const productsList = document.querySelector("ul[name=products-list]");

productsJson.forEach((product) => {
	const { name, price, inventoryCount } = product;

	const newLi = document.createElement("li");
	newLi.innerText = `Name: ${name}, Price: $${price}, Inventory: ${inventoryCount}`;

	productsList.appendChild(newLi);
});

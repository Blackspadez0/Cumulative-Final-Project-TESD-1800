
const PRODUCTS_PAGE = "http://localhost:5173/Products.html";

describe("products", () => {
  it("lists products", () => {
    cy.visit(PRODUCTS_PAGE);

    cy.get("h1")
      .should("have.text", "Products:");

    cy.get('ul[name="products-list"]')
      .should("be.visible");
  });
});

/* OLD PRODUCT CREATE TEST
import createFakeProduct from "../support/utils";

const API_URL = "http://localhost:5223/productAPI";

describe("products", () => {
  before(() => {
  cy.request("GET", API_URL).then(({ body }) => {
    if (body.length === 0) {
      for (let i = 0; i < 1; i++) {
        const { name, price, inventory } = createFakeProduct.createFakeProduct();

        cy.request("POST", API_URL, {
          name,
          price: parseFloat(price),
          inventoryCount: inventory,
        });
      }
    }
  });
});

  it("lists products", () => {
    cy.visit("http://localhost:5173/Products.html");

    cy.get("h1").should("have.text", "Products:");
    cy.get('ul[name="products-list"]').should("be.visible");
  });

  it("creates a product and shows it in the list", () => {
    cy.visit("http://localhost:5173/Products.html");

    const { name, price, inventory } = createFakeProduct.createFakeProduct();

    cy.contains("button", "Create New Product").click();

    cy.get('form input[name="product"]').type(name);
    cy.get('form input[name="price"]').type(price);
    cy.get('form input[name="inventory"]').type(inventory);
    cy.get('form button[type="submit"]').click();

    cy.contains("Product Created").should("be.visible");
    cy.contains("a", "Back to Products").click();

    cy.get("body").should("contain", name);
    cy.get("body").should("contain", price);
    cy.get("body").should("contain", inventory);
  });
}); */
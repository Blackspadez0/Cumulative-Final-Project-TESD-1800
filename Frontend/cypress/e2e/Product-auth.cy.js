
const ACCOUNT_API = "http://localhost:5223/accountAPI";
const PRODUCT_API = "http://localhost:5223/productAPI";
const SIGNIN_PAGE = "http://localhost:5173/Signin.html";
const PRODUCTS_PAGE = "http://localhost:5173/Products.html";

function createAccountAndLogin() {
  const email = `product-${Date.now()}@example.com`;
  const password = "TestPassword123!";

  cy.request("POST", ACCOUNT_API, { email, password })
    .then((response) => {
      expect(response.status).to.be.oneOf([200, 201]);
    });

  cy.visit(SIGNIN_PAGE);

  cy.get('#signin-form input[name="Email"]')
    .type(email);

  cy.get('#signin-form input[name="Password"]')
    .type(password);

  cy.get('#signin-form button[type="submit"]')
    .click();

  cy.contains("button", /log\s*out/i)
    .should("be.visible");
}

describe("product creation authentication", () => {
  it("redirects a logged-out user to sign in when they try to create a product", () => {
    cy.visit(PRODUCTS_PAGE);

    cy.get("#create-product-button")
      .should("be.visible")
      .click();

    cy.url().should("include", "/Signin.html");

    cy.get("#signin-form")
      .should("be.visible");
  });

  it("rejects product creation through the API when the user is not logged in", () => {
    cy.request({
      method: "POST",
      url: PRODUCT_API,
      body: {
        name: "Unauthorized Test Product",
        price: 10,
        inventoryCount: 1,
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.be.oneOf([401, 403]);
    });
  });

  it("allows a logged-in user to create a product", () => {
    createAccountAndLogin();

    cy.visit(PRODUCTS_PAGE);

    const productName = `Authorized Product ${Date.now()}`;

    cy.get("#create-product-button")
      .should("be.visible")
      .click();

    cy.get('#product-form input[name="product"]')
      .type(productName);

    cy.get('#product-form input[name="price"]')
      .type("19.99");

    cy.get('#product-form input[name="inventory"]')
      .type("5");

    cy.get('#product-form button[type="submit"]')
      .click();

    cy.get("#confirmation")
      .should("be.visible")
      .and("contain.text", "Product Created");

    cy.contains("a", "Back to Products")
      .click();

    cy.contains("li", productName)
      .should("be.visible");
  });
});

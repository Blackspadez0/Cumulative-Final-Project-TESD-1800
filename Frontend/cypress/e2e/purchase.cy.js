
const ACCOUNT_API = "http://localhost:5223/accountAPI";
const PRODUCT_API = "http://localhost:5223/productAPI";
const PURCHASE_API = "http://localhost:5223/purchaseAPI";
const PRODUCTS_PAGE = "http://localhost:5173/Products.html";

function createProduct(productName, inventoryCount) {
    return cy.request({
        method: "POST",
        url: PRODUCT_API,
        body: {
            name: productName,
            price: 10,
            inventoryCount,
        },
    }).then((response) => {
        expect(response.status).to.eq(201);

        return {
            id: response.body.id,
            name: productName,
            inventoryCount,
        };
    });
}

function visitProducts() {
    cy.visit(PRODUCTS_PAGE);
}

function findProduct(productName) {
    return cy.contains("li", productName);
}

describe("Product purchases", () => {
    it("does not show a purchase form when logged out", () => {
        cy.createAccountAndLogin();

        const productName = `Logged Out Product ${Date.now()}`;

        createProduct(productName, 5).then(() => {
            cy.request({
                method: "POST",
                url: `${ACCOUNT_API}/logout`,
            }).its("status").should("eq", 200);

            cy.request({
                url: `${ACCOUNT_API}/me`,
                failOnStatusCode: false,
            }).its("status").should("be.oneOf", [401, 403]);

            visitProducts();

            findProduct(productName)
                .should("be.visible")
                .find("form")
                .should("not.exist");
        });
    });

    it("shows the correct purchase form when logged in", () => {
        cy.createAccountAndLogin();

        const productName = `Purchase Form Product ${Date.now()}`;

        createProduct(productName, 5).then((product) => {
            visitProducts();

            findProduct(productName).within(() => {
                cy.get("form").should("be.visible");

                cy.get('input[name="productId"]')
                    .should("have.attr", "type", "hidden")
                    .and("have.value", String(product.id));

                cy.get('input[name="quantity"]')
                    .should("be.visible")
                    .and("have.attr", "type", "number");

                cy.get('input[name="quantity"]')
                    .should("have.attr", "required");

                cy.get('input[name="quantity"]')
                    .should("have.value", "0");

                cy.contains("label", "Quantity")
                    .should("be.visible")
                    .find('input[name="quantity"]')
                    .should("exist");

                cy.get('button[type="submit"]')
                    .should("be.visible")
                    .and("be.disabled");
            });
        });
    });

    it("keeps the purchase button disabled for quantities -1 and 0", () => {
        cy.createAccountAndLogin();

        const productName = `Invalid Quantity Product ${Date.now()}`;

        createProduct(productName, 5).then(() => {
            visitProducts();

            findProduct(productName).within(() => {
                const quantityInput = () =>
                    cy.get('input[name="quantity"]');

                const purchaseButton = () =>
                    cy.get('button[type="submit"]');

                // First prove that the button can become enabled.
                quantityInput().clear().type("2");
                purchaseButton().should("be.enabled");

                quantityInput().clear().type("-1");
                purchaseButton().should("be.disabled");

                quantityInput().clear().type("0");
                purchaseButton().should("be.disabled");
            });
        });
    });

    it("allows the exact inventory quantity but disables excess quantities", () => {
        cy.createAccountAndLogin();

        const inventoryCount = 5;
        const productName = `Excess Inventory Product ${Date.now()}`;

        createProduct(productName, inventoryCount).then(() => {
            visitProducts();

            findProduct(productName).within(() => {
                const quantityInput = () =>
                    cy.get('input[name="quantity"]');

                const purchaseButton = () =>
                    cy.get('button[type="submit"]');

                quantityInput()
                    .clear()
                    .type(String(inventoryCount));

                purchaseButton().should("be.enabled");

                quantityInput()
                    .clear()
                    .type(String(inventoryCount + 1));

                purchaseButton().should("be.disabled");
            });
        });
    });

    it("completes a valid purchase and refreshes the inventory", () => {
        cy.createAccountAndLogin();

        const inventoryCount = 5;
        const quantityToBuy = 2;
        const productName = `Valid Purchase Product ${Date.now()}`;

        createProduct(productName, inventoryCount).then(() => {
            visitProducts();

            findProduct(productName).within(() => {
                cy.get('input[name="quantity"]')
                    .clear()
                    .type(String(quantityToBuy));

                cy.get('button[type="submit"]')
                    .should("be.enabled")
                    .click();
            });

            cy.get("#purchase-message")
                .should("be.visible")
                .and("contain.text", "Purchase successful!")
                .invoke("text")
                .should("match", /Purchase ID:\s*\d+/);

            findProduct(productName)
                .should(
                    "contain.text",
                    `Inventory: ${inventoryCount - quantityToBuy}`
                );
        });
    });

    it("rejects purchase API requests when logged out", () => {
        cy.createAccountAndLogin();

        const productName = `Unauthenticated Purchase ${Date.now()}`;

        createProduct(productName, 5).then((product) => {
            // Remove the browser's authentication cookie before the API call.
            cy.clearCookies();

            cy.request({
                method: "POST",
                url: `${PURCHASE_API}/`,
                body: {
                    productId: product.id,
                    quantity: 1,
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.eq(401);
            });
        });
    });

    it("rejects invalid quantities and preserves inventory", () => {
        cy.createAccountAndLogin();

        const inventoryCount = 5;
        const productName = `API Quantity Validation ${Date.now()}`;

        createProduct(productName, inventoryCount).then((product) => {
            cy.request({
                method: "POST",
                url: `${PURCHASE_API}/`,
                body: {
                    productId: product.id,
                    quantity: -1,
                },
                failOnStatusCode: false,
            }).its("status").should("eq", 400);

            cy.request({
                method: "POST",
                url: `${PURCHASE_API}/`,
                body: {
                    productId: product.id,
                    quantity: 0,
                },
                failOnStatusCode: false,
            }).its("status").should("eq", 400);

            cy.request({
                method: "POST",
                url: `${PURCHASE_API}/`,
                body: {
                    productId: product.id,
                    quantity: inventoryCount + 1,
                },
                failOnStatusCode: false,
            }).its("status").should("eq", 409);

            cy.request({
                url: PRODUCT_API,
            }).then((response) => {
                expect(response.status).to.eq(200);

                const savedProduct = response.body.find(
                    (item) => item.id === product.id
                );

                expect(savedProduct).to.exist;
                expect(savedProduct.inventoryCount)
                    .to.eq(inventoryCount);
            });
        });
    });

    it("returns not found for a nonexistent product", () => {
        cy.createAccountAndLogin();

        cy.request({
            method: "POST",
            url: `${PURCHASE_API}/`,
            body: {
                productId: -1,
                quantity: 1,
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(404);
        });
    });
});

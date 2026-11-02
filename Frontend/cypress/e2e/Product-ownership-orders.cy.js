const API = "http://localhost:5223";
const PRODUCTS_PAGE = "http://localhost:5173/Products.html";
const PASSWORD = "TestPassword123!";

function createAccount(label) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  return cy.request("POST", `${API}/accountAPI`, { email, password: PASSWORD })
    .then((response) => {
      expect(response.status).to.eq(201);
      return cy.request("POST", `${API}/accountAPI/signin`, { email, password: PASSWORD })
        .then((login) => {
          expect(login.status).to.eq(200);
          return cy.request(`${API}/accountAPI/me`).then((me) => ({ id: Number(me.body.id), email }));
        });
    });
}

function createProduct(name, inventory = 8) {
  return cy.request("POST", `${API}/productAPI`, { name, price: 12.5, inventoryCount: inventory })
    .then((response) => {
      expect(response.status).to.eq(201);
      return response.body;
    });
}

function screenshot(name) {
  cy.screenshot(name, { capture: "fullPage" });
}

describe("Sprint 2: product ownership and private orders", () => {
  it("allows only a logged-in seller to edit their product and reflects the update", () => {
    createAccount("edit-owner").then((owner) => {
      createProduct(`Edit Original ${owner.id}`).then((product) => {
        cy.visit(PRODUCTS_PAGE);
        cy.get(`[data-product-id="${product.id}"]`).within(() => {
          cy.contains("button", "Edit Product").should("be.visible").click();
          cy.get("[data-cy='edit-product-form']").should("be.visible");
          cy.get("input[name='name']").should("be.visible").clear().type("Edited Product Name");
          cy.get("input[name='price']").should("be.visible").clear().type("24.75");
          cy.get("input[name='inventoryCount']").should("be.visible").clear().type("17");
          cy.contains("button", "Save Changes").should("be.visible").click();
        });
        cy.get("#product-message").should("be.visible")
          .and("contain.text", `Product ID: ${product.id}`);
        cy.get(`[data-product-id="${product.id}"]`).should("contain.text", "Edited Product Name")
          .and("contain.text", "$24.75").and("contain.text", "Inventory: 17");
        screenshot("01-product-edit-owner-success");
      });
    });
  });

  it("rejects edits by logged-out users and by a different logged-in account", () => {
    createAccount("edit-victim").then(() => {
      createProduct(`Protected Edit ${Date.now()}`).then((product) => {
        cy.clearCookies();
        cy.request({ method: "PUT", url: `${API}/productAPI/${product.id}`,
          body: { name: "Unauthenticated Tamper", price: 1, inventoryCount: 1 }, failOnStatusCode: false })
          .its("status").should("eq", 401);
        createAccount("edit-attacker").then(() => {
          cy.request({ method: "PUT", url: `${API}/productAPI/${product.id}`,
            body: { name: "Attacker Tamper", price: 1, inventoryCount: 1 }, failOnStatusCode: false })
            .its("status").should("eq", 404);
          cy.visit(PRODUCTS_PAGE);
          cy.get(`[data-product-id="${product.id}"]`).within(() => {
            cy.contains("button", "Edit Product").should("not.exist");
            cy.get("[data-cy='edit-product-form']").should("not.exist");
          });
          cy.request(`${API}/productAPI`).its("body").then((products) => {
            expect(products.find((p) => p.id === product.id).name).to.include("Protected Edit");
          });
        });
        screenshot("02-product-edit-access-denied");
      });
    });
  });

  it("allows the owner to delete their product and all associated purchases", () => {
    createAccount("delete-owner").then((owner) => {
      createProduct(`Delete Product ${owner.id}`).then((product) => {
        createAccount("delete-buyer").then((buyer) => {
          cy.request("POST", `${API}/purchaseAPI/`, { productId: product.id, quantity: 2 })
            .its("status").should("eq", 201);
          cy.request("POST", `${API}/accountAPI/signin`, { email: owner.email, password: PASSWORD });
          cy.visit(PRODUCTS_PAGE);
          cy.get(`[data-product-id="${product.id}"]`).within(() => {
            cy.contains("button", "Delete Product").should("be.visible").click();
          });
          cy.get("#product-message").should("be.visible")
            .and("contain.text", `Product ID: ${product.id}`)
            .and("contain.text", "deleted successfully");
          cy.get(`[data-product-id="${product.id}"]`).should("not.exist");
          cy.request("POST", `${API}/accountAPI/signin`, { email: buyer.email, password: PASSWORD });
          cy.request(`${API}/purchaseAPI/mine`).its("body").should("have.length", 0);
          screenshot("03-product-delete-owner-and-purchases");
        });
      });
    });
  });

  it("rejects deletion by logged-out users and by a different seller", () => {
    createAccount("delete-victim").then(() => {
      createProduct(`Protected Delete ${Date.now()}`).then((product) => {
        cy.clearCookies();
        cy.request({ method: "DELETE", url: `${API}/productAPI/${product.id}`, failOnStatusCode: false })
          .its("status").should("eq", 401);
        createAccount("delete-attacker").then(() => {
          cy.request({ method: "DELETE", url: `${API}/productAPI/${product.id}`, failOnStatusCode: false })
            .its("status").should("eq", 404);
          cy.visit(PRODUCTS_PAGE);
          cy.get(`[data-product-id="${product.id}"]`).within(() => {
            cy.contains("button", "Delete Product").should("not.exist");
          });
          cy.request(`${API}/productAPI`).its("body").then((products) => {
            expect(products.some((p) => p.id === product.id)).to.eq(true);
          });
        });
        screenshot("04-product-delete-access-denied");
      });
    });
  });

  it("shows sellers only orders placed for products they own", () => {
    createAccount("seller-orders-owner").then((seller) => {
      createProduct(`Seller Order Product ${seller.id}`).then((product) => {
        createAccount("seller-orders-buyer").then(() => {
          cy.request("POST", `${API}/purchaseAPI/`, { productId: product.id, quantity: 3 });
          cy.request("POST", `${API}/accountAPI/signin`, { email: seller.email, password: PASSWORD });
          cy.request(`${API}/purchaseAPI/seller`).its("body").then((orders) => {
            expect(orders).to.have.length(1);
            expect(orders[0].productId).to.eq(product.id);
            expect(orders[0].quantity).to.eq(3);
          });
          cy.visit(PRODUCTS_PAGE);
          cy.contains("button", "Orders for My Products").should("be.visible").click();
          cy.get("#seller-orders-section").should("be.visible").and("contain.text", `Seller Order Product ${seller.id}`);
          screenshot("05-seller-orders-visible-to-owner");
        });
      });
    });
  });

  it("does not disclose seller orders to another seller", () => {
    createAccount("seller-private-owner").then(() => {
      createProduct(`Private Seller Product ${Date.now()}`).then((product) => {
        createAccount("seller-private-buyer").then(() => {
          cy.request("POST", `${API}/purchaseAPI/`, { productId: product.id, quantity: 1 });
          createAccount("seller-private-outsider").then(() => {
            cy.request(`${API}/purchaseAPI/seller`).its("body").should("have.length", 0);
            cy.visit(PRODUCTS_PAGE);
            cy.contains("button", "Orders for My Products").click();
            cy.get("#seller-orders-section").should("be.visible").and("not.contain.text", "Private Seller Product");
            screenshot("06-seller-orders-hidden-from-other-seller");
          });
        });
      });
    });
  });

  it("shows buyers only purchases made by their own account", () => {
    createAccount("buyer-orders-seller").then(() => {
      createProduct(`Buyer Order Product ${Date.now()}`).then((product) => {
        createAccount("buyer-orders-owner").then(() => {
          cy.request("POST", `${API}/purchaseAPI/`, { productId: product.id, quantity: 2 });
          cy.request(`${API}/purchaseAPI/mine`).its("body").then((orders) => {
            expect(orders).to.have.length(1);
            expect(orders[0].productId).to.eq(product.id);
          });
          cy.visit(PRODUCTS_PAGE);
          cy.contains("button", "My Purchases").should("be.visible").click();
          cy.get("#my-purchases-section").should("be.visible").and("contain.text", "Buyer Order Product");
          screenshot("07-buyer-purchases-visible-to-owner");
        });
      });
    });
  });

  it("does not disclose one buyer's purchases to another customer", () => {
    createAccount("buyer-private-seller").then(() => {
      createProduct(`Private Buyer Product ${Date.now()}`).then((product) => {
        createAccount("buyer-private-customer").then(() => {
          cy.request("POST", `${API}/purchaseAPI/`, { productId: product.id, quantity: 1 });
          createAccount("buyer-private-outsider").then(() => {
            cy.request(`${API}/purchaseAPI/mine`).its("body").should("have.length", 0);
            cy.visit(PRODUCTS_PAGE);
            cy.contains("button", "My Purchases").click();
            cy.get("#my-purchases-section").should("be.visible").and("not.contain.text", "Private Buyer Product");
            screenshot("08-buyer-purchases-hidden-from-other-customer");
          });
        });
      });
    });
  });

  it("requires authentication to view either buyer or seller order history", () => {
    cy.clearCookies();
    cy.request({ url: `${API}/purchaseAPI/mine`, failOnStatusCode: false })
      .its("status").should("eq", 401);
    cy.request({ url: `${API}/purchaseAPI/seller`, failOnStatusCode: false })
      .its("status").should("eq", 401);
    cy.visit(PRODUCTS_PAGE);
    cy.get("#order-navigation").should("not.be.visible");
    screenshot("09-order-history-requires-login");
  });
});

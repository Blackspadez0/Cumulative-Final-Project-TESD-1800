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

        });
      });
    });
  });

  
  it("shows each seller only purchases made for their own products when both sellers have sales", () => {
    // Create Seller A and their product.
    createAccount("seller-isolation-a").then((sellerA) => {
      createProduct(`Seller A Product ${sellerA.id}`).then((productA) => {

        // Buyer A purchases Seller A's product.
        createAccount("seller-isolation-buyer-a").then((buyerA) => {
          cy.request("POST", `${API}/purchaseAPI/`, {
            productId: productA.id,
            quantity: 2,
          }).then((purchaseAResponse) => {
            expect(purchaseAResponse.status).to.eq(201);
            const purchaseAId = purchaseAResponse.body.id;

            // Create Seller B and their separate product.
            createAccount("seller-isolation-b").then((sellerB) => {
              createProduct(`Seller B Product ${sellerB.id}`).then((productB) => {

                // Buyer B purchases Seller B's product.
                createAccount("seller-isolation-buyer-b").then(() => {
                  cy.request("POST", `${API}/purchaseAPI/`, {
                    productId: productB.id,
                    quantity: 3,
                  }).then((purchaseBResponse) => {
                    expect(purchaseBResponse.status).to.eq(201);
                    const purchaseBId = purchaseBResponse.body.id;

                    // Authenticate as Seller A.
                    cy.request("POST", `${API}/accountAPI/signin`, {
                      email: sellerA.email,
                      password: PASSWORD,
                    }).its("status").should("eq", 200);

                    // Verify Seller A receives only sales for Product A.
                    cy.request(`${API}/purchaseAPI/seller`).then((response) => {
                      expect(response.status).to.eq(200);
                      expect(response.body).to.have.length(1);
                      expect(response.body[0]).to.include({
                        id: purchaseAId,
                        productId: productA.id,
                        quantity: 2,
                      });

                      expect(response.body.some(
                        (order) => order.id === purchaseBId
                      )).to.eq(false);
                    });

                    // Verify Seller A's rendered order history.
                    cy.intercept("GET", `${API}/purchaseAPI/seller`)
                      .as("sellerAOrders");

                    cy.visit(PRODUCTS_PAGE);
                    cy.contains("button", "Orders for My Products")
                      .should("be.visible")
                      .click();

                    cy.wait("@sellerAOrders").then(({ response }) => {
                      expect(response.statusCode).to.eq(200);
                      expect(response.body.map((order) => order.id))
                        .to.deep.equal([purchaseAId]);
                    });

                    cy.get("#seller-orders-section")
                      .should("be.visible")
                      .and("contain.text", productA.name)
                      .and("not.contain.text", productB.name);

                    // Switch authentication to Seller B.
                    cy.request("POST", `${API}/accountAPI/signin`, {
                      email: sellerB.email,
                      password: PASSWORD,
                    }).its("status").should("eq", 200);

                    // Verify Seller B receives only sales for Product B.
                    cy.request(`${API}/purchaseAPI/seller`).then((response) => {
                      expect(response.status).to.eq(200);
                      expect(response.body).to.have.length(1);
                      expect(response.body[0]).to.include({
                        id: purchaseBId,
                        productId: productB.id,
                        quantity: 3,
                      });

                      expect(response.body.some(
                        (order) => order.id === purchaseAId
                      )).to.eq(false);
                    });

                    // Verify Seller B's rendered order history.
                    cy.intercept("GET", `${API}/purchaseAPI/seller`)
                      .as("sellerBOrders");

                    cy.visit(PRODUCTS_PAGE);
                    cy.contains("button", "Orders for My Products")
                      .should("be.visible")
                      .click();

                    cy.wait("@sellerBOrders").then(({ response }) => {
                      expect(response.statusCode).to.eq(200);
                      expect(response.body.map((order) => order.id))
                        .to.deep.equal([purchaseBId]);
                    });

                    cy.get("#seller-orders-section")
                      .should("be.visible")
                      .and("contain.text", productB.name)
                      .and("not.contain.text", productA.name);

                  });
                });
              });
            });
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

        });
      });
    });
  });

  
  it("shows each buyer only their own purchases when both buyers have orders", () => {
    createAccount("buyer-isolation-seller").then((seller) => {
      createProduct(`Buyer A Only Product ${seller.id}`).then((productA) => {
        createProduct(`Buyer B Only Product ${seller.id}`).then((productB) => {
          // Create Buyer A and record their purchase.
          createAccount("buyer-isolation-a").then((buyerA) => {
            cy.request("POST", `${API}/purchaseAPI/`, {
              productId: productA.id,
              quantity: 2,
            }).then((purchaseAResponse) => {
              expect(purchaseAResponse.status).to.eq(201);
              const purchaseAId = purchaseAResponse.body.id;

              // Create Buyer B and record a separate purchase.
              createAccount("buyer-isolation-b").then((buyerB) => {
                cy.request("POST", `${API}/purchaseAPI/`, {
                  productId: productB.id,
                  quantity: 3,
                }).then((purchaseBResponse) => {
                  expect(purchaseBResponse.status).to.eq(201);
                  const purchaseBId = purchaseBResponse.body.id;

                  // Authenticate as Buyer A.
                  cy.request("POST", `${API}/accountAPI/signin`, {
                    email: buyerA.email,
                    password: PASSWORD,
                  }).its("status").should("eq", 200);

                  // Verify Buyer A's API response contains only their purchase.
                  cy.request(`${API}/purchaseAPI/mine`).then((response) => {
                    expect(response.status).to.eq(200);
                    expect(response.body).to.have.length(1);
                    expect(response.body[0]).to.include({
                      id: purchaseAId,
                      productId: productA.id,
                      productName: productA.name,
                      quantity: 2,
                    });

                    expect(response.body.some(
                      (order) => order.id === purchaseBId
                    )).to.eq(false);
                  });

                  // Verify Buyer A sees only their purchase in the UI.
                  cy.intercept("GET", `${API}/purchaseAPI/mine`)
                    .as("buyerAOrders");

                  cy.visit(PRODUCTS_PAGE);
                  cy.contains("button", "My Purchases")
                    .should("be.visible")
                    .click();

                  cy.wait("@buyerAOrders").then(({ response }) => {
                    expect(response.statusCode).to.eq(200);
                    expect(response.body.map((order) => order.id))
                      .to.deep.equal([purchaseAId]);
                  });

                  cy.get("#my-purchases-section")
                    .should("be.visible")
                    .and("contain.text", productA.name)
                    .and("not.contain.text", productB.name);

                  // Switch authentication to Buyer B.
                  cy.request("POST", `${API}/accountAPI/signin`, {
                    email: buyerB.email,
                    password: PASSWORD,
                  }).its("status").should("eq", 200);

                  // Verify Buyer B's API response contains only their purchase.
                  cy.request(`${API}/purchaseAPI/mine`).then((response) => {
                    expect(response.status).to.eq(200);
                    expect(response.body).to.have.length(1);
                    expect(response.body[0]).to.include({
                      id: purchaseBId,
                      productId: productB.id,
                      productName: productB.name,
                      quantity: 3,
                    });

                    expect(response.body.some(
                      (order) => order.id === purchaseAId
                    )).to.eq(false);
                  });

                  // Reload under Buyer B's session before checking the UI.
                  cy.intercept("GET", `${API}/purchaseAPI/mine`)
                    .as("buyerBOrders");

                  cy.visit(PRODUCTS_PAGE);
                  cy.contains("button", "My Purchases")
                    .should("be.visible")
                    .click();

                  cy.wait("@buyerBOrders").then(({ response }) => {
                    expect(response.statusCode).to.eq(200);
                    expect(response.body.map((order) => order.id))
                      .to.deep.equal([purchaseBId]);
                  });

                  cy.get("#my-purchases-section")
                    .should("be.visible")
                    .and("contain.text", productB.name)
                    .and("not.contain.text", productA.name);

                });
              });
            });
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

  });
});

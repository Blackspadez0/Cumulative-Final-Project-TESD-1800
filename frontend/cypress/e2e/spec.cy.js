describe("products", () => {
  it("lists products", () => {
    cy.visit("http://localhost:5173");

    cy.get("h1").should("have.text", "Products:");
    cy.get('ul[name="products-list"]').should("be.visible");
  });
});

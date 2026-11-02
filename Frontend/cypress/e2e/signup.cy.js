
const API_URL = "http://localhost:5223/accountAPI";
const ACCOUNTS_PAGE = "http://localhost:5173/Signup.html";

describe("account creation", () => {
  it("displays a visible form with required email and password fields", () => {
    cy.visit(ACCOUNTS_PAGE);

    cy.get("#account-form").should("be.visible");

    cy.contains("label", "Email")
      .find("input")
      .should("be.visible")
      .and("have.attr", "type", "email")
      .and("have.attr", "required");

    cy.contains("label", "Password")
      .find("input")
      .should("be.visible")
      .and("have.attr", "type", "password")
      .and("have.attr", "required");

    cy.get('#account-form button[type="submit"]')
      .should("be.visible");
  });

  it("displays an error when the email already exists", () => {
    const email = `duplicate-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    // Create the account first so the email already exists.
    cy.request("POST", API_URL, { email, password })
      .then((response) => {
        expect(response.status).to.be.oneOf([200, 201]);

        cy.visit(ACCOUNTS_PAGE);

        cy.get('#account-form input[name="Email"]').type(email);
        cy.get('#account-form input[name="Password"]').type(password);
        cy.get('#account-form button[type="submit"]').click();

        cy.get("#account-message")
          .should("be.visible")
          .and("contain.text", "already exists");
      });
  });

  it("displays a success message containing the new account ID", () => {
    const email = `new-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    cy.visit(ACCOUNTS_PAGE);

    cy.get('#account-form input[name="Email"]').type(email);
    cy.get('#account-form input[name="Password"]').type(password);
    cy.get('#account-form button[type="submit"]').click();

    cy.get("#account-message")
      .should("be.visible")
      .and("contain.text", "Account created")
      .should(($message) => {
        expect($message.text()).to.match(/id\s*[:#]?\s*\d+/i);
      });
  });
});

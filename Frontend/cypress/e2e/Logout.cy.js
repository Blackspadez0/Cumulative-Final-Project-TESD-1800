
const API_URL = "http://localhost:5223/accountAPI";
const SIGNIN_PAGE = "http://localhost:5173/Signin.html";

describe("logout", () => {
  it("allows a logged-in user to log out and see the login form again", () => {
    const email = `logout-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    // Create a test account.
    cy.request("POST", API_URL, { email, password })
      .then((response) => {
        expect(response.status).to.be.oneOf([200, 201]);
      });

    // Log in through the actual UI.
    cy.visit(SIGNIN_PAGE);

    cy.get('#signin-form input[name="Email"]')
      .type(email);

    cy.get('#signin-form input[name="Password"]')
      .type(password);

    cy.get('#signin-form button[type="submit"]')
      .click();

    // Confirm that the user is logged in.
    cy.contains("button", /log\s*out/i)
      .should("be.visible");

    // Log out.
    cy.contains("button", /log\s*out/i)
      .click();

    // Confirm that the user is logged out.
    cy.get("#signin-form")
      .should("be.visible");

    cy.contains("button", /log\s*out/i)
      .should("not.be.visible");
  });
});


const API_URL = "http://localhost:5223/accountAPI";
const SIGNIN_PAGE = "http://localhost:5173/Signin.html";

describe("login", () => {
  it("shows a visible login form with required, labeled username and password fields when logged out", () => {
    cy.visit(SIGNIN_PAGE);

    // The login form should be visible.
    cy.get("#signin-form").should("be.visible");

    // Username is the label; the email address is the username.
    cy.contains("#signin-form label", "Username")
      .find('input[name="Email"]')
      .should("be.visible")
      .and("have.attr", "type", "email")
      .and("have.attr", "required");

    // The password field should be visible and required.
    cy.contains("#signin-form label", "Password")
      .find('input[name="Password"]')
      .should("be.visible")
      .and("have.attr", "type", "password")
      .and("have.attr", "required");

    // The submit button should be visible.
    cy.get('#signin-form button[type="submit"]')
      .should("be.visible")
      .and("contain.text", "Sign in");
  });

  it("allows a registered user to log in and displays a logout button", () => {
    const email = `login-${Date.now()}@example.com`;
    const password = "TestPassword123!";

    // Arrange: create a unique test account.
    cy.request("POST", API_URL, {
      email,
      password,
    }).then((response) => {
      expect(response.status).to.eq(201);
    });

    // Act: visit the sign-in page and submit the credentials.
    cy.visit(SIGNIN_PAGE);

    cy.get('#signin-form input[name="Email"]')
      .type(email);

    cy.get('#signin-form input[name="Password"]')
      .type(password);

    cy.get('#signin-form button[type="submit"]')
      .click();

    // Assert: a logout button should appear after successful login.
    cy.contains("button", /log\s*out/i)
      .should("be.visible");
  });
});

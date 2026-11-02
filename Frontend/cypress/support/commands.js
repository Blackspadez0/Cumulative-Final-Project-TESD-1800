
const ACCOUNT_API = "http://localhost:5223/accountAPI";
const SIGNIN_PAGE = "http://localhost:5173/Signin.html";

Cypress.Commands.add("createAccountAndLogin", () => {
    const email = `purchase-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}@example.com`;
    const password = "TestPassword123!";

    return cy.request("POST", ACCOUNT_API, {
        email,
        password,
    }).then((response) => {
        expect(response.status).to.eq(201);

        cy.visit(SIGNIN_PAGE);

        cy.get('#signin-form input[name="Email"]')
            .clear()
            .type(email);

        cy.get('#signin-form input[name="Password"]')
            .clear()
            .type(password);

        cy.get('#signin-form button[type="submit"]').click();

        return cy.contains("button", /log\s*out/i)
            .should("be.visible");
    });
});

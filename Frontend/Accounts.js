
const API_URL = "http://localhost:5223/accountAPI";

const accountForm = document.querySelector("#account-form");
const accountMessage = document.querySelector("#account-message");

accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = accountForm.elements.Email.value.trim();
    const password = accountForm.elements.Password.value;

    accountMessage.hidden = true;
    accountMessage.textContent = "";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        accountMessage.hidden = false;

        if (response.status === 409) {
            accountMessage.textContent = result.message;
            return;
        }

        if (!response.ok) {
            accountMessage.textContent =
                "Account creation failed. Please try again.";
            return;
        }

        accountMessage.textContent =
            `Account created successfully. ID: ${result.id}`;

        accountForm.reset();
    } catch (error) {
        accountMessage.hidden = false;
        accountMessage.textContent =
            "Unable to connect to the server. Please try again.";

        console.error("Account creation failed:", error);
    }
});

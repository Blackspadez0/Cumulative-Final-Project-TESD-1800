
const API_URL = "http://localhost:5223/accountAPI";
const SIGNIN_URL = `${API_URL}/signin`;
const SESSION_URL = `${API_URL}/me`;
const LOGOUT_URL = `${API_URL}/logout`;

const signinForm = document.querySelector("#signin-form");
const logoutButton = document.querySelector("#logout-button");
const accountMessage = document.querySelector("#account-message");

function showMessage(message) {
    accountMessage.textContent = message;
    accountMessage.hidden = false;
}

async function updateAuthenticationUI() {
    try {
        const response = await fetch(SESSION_URL, {
            credentials: "include"
        });

        const isLoggedIn = response.ok;

        signinForm.hidden = isLoggedIn;
        logoutButton.hidden = !isLoggedIn;

        if (!isLoggedIn && response.status !== 401) {
            showMessage("Unable to check your sign-in status.");
        }

        return isLoggedIn;
    } catch (error) {
        signinForm.hidden = false;
        logoutButton.hidden = true;
        showMessage("Unable to connect to the server.");
        console.error("Unable to check sign-in status:", error);

        return false;
    }
}

signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    accountMessage.hidden = true;
    accountMessage.textContent = "";

    const email = signinForm.elements.Email.value.trim();
    const password = signinForm.elements.Password.value;

    try {
        const response = await fetch(SIGNIN_URL, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            showMessage(
                response.status === 401
                    ? "Invalid email or password."
                    : "Sign in failed. Please try again."
            );
            return;
        }

        await updateAuthenticationUI();

        if (!logoutButton.hidden) {
            signinForm.reset();
            showMessage("Sign in successful.");
        }
    } catch (error) {
        showMessage("Unable to connect to the server.");
        console.error("Sign in failed:", error);
    }
});

logoutButton.addEventListener("click", async () => {
    accountMessage.hidden = true;
    accountMessage.textContent = "";

    try {
        const response = await fetch(LOGOUT_URL, {
            method: "POST",
            credentials: "include"
        });

        if (!response.ok) {
            showMessage("Sign out failed. Please try again.");
            return;
        }

        await updateAuthenticationUI();
        showMessage("You have signed out.");
    } catch (error) {
        showMessage("Unable to connect to the server.");
        console.error("Sign out failed:", error);
    }
});

updateAuthenticationUI();

import { buildApiUrl } from "./api.js";
const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const oauth42Link = document.getElementById("oauth42Link");
if (oauth42Link) {
    oauth42Link.href = buildApiUrl("/users/auth/42");
}
// Vérifier si on arrive du OAuth 42 callback
const params = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get("token");
const errorFromUrl = params.get("error");
if (tokenFromUrl) {
    localStorage.setItem("token", tokenFromUrl);
    window.location.href = "./index.html";
}
else if (errorFromUrl) {
    console.error("OAuth 42 error:", errorFromUrl);
    alert("Authentification 42 échouée: " + errorFromUrl);
}
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const response = await fetch(buildApiUrl("/users/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
        })
    });
    if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        window.location.href = "./index.html";
        console.log("Login successful:", data);
    }
    else {
        console.log("Login failed");
    }
});
const createAccountBtn = document.getElementById("createAccountBtn");
createAccountBtn.addEventListener("click", () => {
    console.log("Création de compte");
});
function validateLogin(username, password, users) {
    for (const user of users) {
        if (user.username === username && user.password === password) {
            return true;
        }
    }
    return false;
}

import { User, userMap } from "./user.js";


const form = document.getElementById("loginForm") as HTMLFormElement;
const usernameInput = document.getElementById("username") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;

// Vérifier si on arrive du OAuth 42 callback
const params = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get("token");
const errorFromUrl = params.get("error");

if (tokenFromUrl) {
	localStorage.setItem("token", tokenFromUrl);
	window.location.href = "./index.html";
} else if (errorFromUrl) {
	console.error("OAuth 42 error:", errorFromUrl);
	alert("Authentification 42 échouée: " + errorFromUrl);
}
form.addEventListener("submit", async (event) => {
	event.preventDefault();

	const response = await fetch("http://localhost:3000/users/login", {
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
	} else {
		console.log("Login failed");
	}
});


const createAccountBtn = document.getElementById("createAccountBtn") as HTMLButtonElement;
createAccountBtn.addEventListener("click", () => {
    console.log("Création de compte");
});

function validateLogin(username: string, password: string, users: User[]): boolean {
	for (const user of users) {
		if (user.username === username && user.password === password) {
			return true;
		}
	}
	return false;
}

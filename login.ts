import { User, userMap } from "./user.js";


const form = document.getElementById("loginForm") as HTMLFormElement;
const usernameInput = document.getElementById("username") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;

// Attention : Tout ce qui est en dehors de l'evenement s'execute tout de suite
form.addEventListener("submit", (event) => {
	event.preventDefault();

	const username = usernameInput.value;
	const password = passwordInput.value;

	const users: User[] = JSON.parse(localStorage.getItem("users") || "[]");

	if (validateLogin(username, password, users)) {
		console.log("Login successful");
	} else {
		console.log("Invalid username or password");
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


import { User, userMap } from "./user.js";

const registerForm = document.getElementById("registerForm") as HTMLFormElement;
const newUserName = document.getElementById("userName") as HTMLInputElement;
const newPassword = document.getElementById("password") as HTMLInputElement;

const users: User[] = JSON.parse(localStorage.getItem("users") || "[]");


registerForm.addEventListener("submit", (event) => {
	event.preventDefault();

	const newUser: User = {
		username: newUserName.value,
		password: newPassword.value
	};

	users.push(newUser);
	localStorage.setItem("users", JSON.stringify(users));
	console.log("Nouvel utilisateur créé :", newUser);

	window.location.href = "./login.html";
});

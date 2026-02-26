import {User, userMap } from "./user.js";

const users: User[] = JSON.parse(localStorage.getItem("users") || "[]");

console.log("Utilisateurs enregistrés :");
for (const user of users) {
    console.log(`Utilisateur: ${user.username}, Mot de passe: ${user.password}`);
}

const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

resetBtn.addEventListener("click", () => {
    localStorage.removeItem("users");
    console.log("Users reset !");
});

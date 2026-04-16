import { User, userMap } from "./user.js";
import { buildApiUrl } from "./api.js";

const registerForm = document.getElementById("registerForm") as HTMLFormElement;
const newUserName = document.getElementById("userName") as HTMLInputElement;
const newEmail = document.getElementById("email") as HTMLInputElement;
const newPassword = document.getElementById("password") as HTMLInputElement;

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const response = await fetch(buildApiUrl("/users/register"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: newUserName.value,
			    email: newEmail.value,
                password: newPassword.value
            })
        });

        if (response.ok) {
            alert("Compte créé avec succès.");
            window.location.replace("./index.html");
            return;
        }

        const error = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        alert(error.error || "Impossible de créer le compte.");
        console.error("Erreur:", error);
    } catch (error) {
        console.error("Erreur réseau:", error);
        alert("Erreur réseau, impossible de créer le compte.");
    }
});
const registerForm = document.getElementById("registerForm");
const newUserName = document.getElementById("userName");
const newEmail = document.getElementById("email");
const newPassword = document.getElementById("password");
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const response = await fetch("http://localhost:3000/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: newUserName.value,
            email: newEmail.value,
            password: newPassword.value
        })
    });
    if (response.ok) {
        window.location.href = "./login.html";
    }
    else {
        const error = await response.json();
        console.error("Erreur:", error);
    }
});
export {};

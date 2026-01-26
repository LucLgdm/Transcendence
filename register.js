const registerForm = document.getElementById("registerForm");
const newUserName = document.getElementById("userName");
const newPassword = document.getElementById("password");
const users = JSON.parse(localStorage.getItem("users") || "[]");
registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const newUser = {
        username: newUserName.value,
        password: newPassword.value
    };
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));
    console.log("Nouvel utilisateur créé :", newUser);
    window.location.href = "./login.html";
});
export {};

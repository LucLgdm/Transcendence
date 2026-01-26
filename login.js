const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
// Attention : Tout ce qui est en dehors de l'evenement s'execute tout de suite
form.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (validateLogin(username, password, users)) {
        console.log("Login successful");
    }
    else {
        console.log("Invalid username or password");
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
export {};

function initViewSwitching() {
    const buttons = document.querySelectorAll('nav button');
    const views = document.querySelectorAll('.view');
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.view;
            if (target) {
                views.forEach((view) => {
                    view.hidden = view.id !== `view-${target}`;
                });
            }
        });
    });
}
// fonction asynchrone pour récupérer les informations du profil
async function initProfile() {
    const profileInfo = document.getElementById('profile-info');
    const avatarImg = document.getElementById('profile-avatar');
    if (!profileInfo)
        return;
    const token = localStorage.getItem('token');
    if (!token) {
        profileInfo.innerHTML = '<p>Veuillez vous connecter pour accéder à votre profil</p>';
        if (avatarImg) {
            avatarImg.src = 'https://via.placeholder.com/150?text=Guest';
        }
        return;
    }
    try {
        const reponse = await fetch('http://localhost:3000/users/me', {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });
        if (!reponse.ok) {
            profileInfo.innerHTML = '<p>Erreur de récupération du profil</p>';
            return;
        }
        const user = await reponse.json();
        profileInfo.innerHTML = `
            <p>Nom d'utilisateur: ${user.username}</p>
            <p>Email: ${user.email}</p>
            <p>Date de création: ${user.createdAT ? new Date(user.createdAT).toLocaleDateString() : 'N/A'}</p>
        `;
        if (avatarImg) {
            avatarImg.src = user.avatar && user.avatar.length > 0
                ? user.avatar
                : `https://via.placeholder.com/150?text=${encodeURIComponent(user.username[0] || 'U')}`;
        }
    }
    catch (error) {
        profileInfo.innerHTML = '<p>Erreur de récupération du profil</p>';
        console.error('Erreur de récupération du profil:', error);
    }
}
function initFriends() {
    const friendsList = document.getElementById('friends-list');
    const addFriendForm = document.getElementById('add-friend-form');
    const friends = JSON.parse(localStorage.getItem('friends') || '[]');
    function saveFriends() {
        localStorage.setItem('friends', JSON.stringify(friends));
    }
    function renderFriends() {
        if (friendsList) {
            friendsList.innerHTML = friends.length > 0
                ? friends.map(friend => `<li>${friend}</li>`).join('')
                : '<li>Aucun ami pour le moment</li>';
        }
    }
    if (addFriendForm) {
        addFriendForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('friend-name');
            if (input && input.value.trim()) {
                friends.push(input.value.trim());
                saveFriends();
                renderFriends();
                initProfileFriends();
                input.value = '';
            }
        });
    }
    renderFriends();
    initProfileFriends();
}
function initChat() {
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const messages = [];
    function renderMessages() {
        if (chatMessages) {
            chatMessages.innerHTML = messages.length > 0
                ? messages.map(msg => `
                    <div class="message">
                        <strong>${msg.user}</strong>: ${msg.message}
                        <small>${msg.time.toLocaleTimeString()}</small>
                    </div>
                `).join('')
                : '<p>Aucun message</p>';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            if (input && input.value.trim()) {
                messages.push({
                    user: 'Moi', // TODO: Récupérer le nom d'utilisateur actuel
                    message: input.value.trim(),
                    time: new Date()
                });
                renderMessages();
                input.value = '';
            }
        });
    }
    renderMessages();
}
function initGames() {
    // pong init a changer si jamais
    const pongCanvas = document.getElementById('pong-canvas');
    if (pongCanvas) {
        const ctx = pongCanvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, pongCanvas.width, pongCanvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Pong - À implémenter', pongCanvas.width / 2, pongCanvas.height / 2);
        }
    }
    initChess();
}
function initLeaderboard() {
    const leaderboardTable = document.querySelector('#leaderboard-table tbody');
    const scores = [
        { player: 'Joueur1', score: 1500, game: 'Pong' },
        { player: 'Joueur2', score: 1200, game: 'Chess' },
        { player: 'Joueur3', score: 1000, game: 'Pong' }
    ];
    if (leaderboardTable) {
        leaderboardTable.innerHTML = scores
            .sort((a, b) => b.score - a.score)
            .map(score => `
                <tr>
                    <td>${score.player}</td>
                    <td>${score.score}</td>
                    <td>${score.game}</td>
                </tr>
            `).join('');
    }
}
function main() {
    initViewSwitching();
    initProfile();
    initFriends();
    initChat();
    initGames();
    initLeaderboard();
    initSidebarToggle();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
}
else {
    main();
}
function initProfileFriends() {
    const profileFriendsList = document.getElementById('profile-friends-list');
    if (!profileFriendsList)
        return;
    const friends = JSON.parse(localStorage.getItem('friends') || '[]');
    profileFriendsList.innerHTML = friends.length > 0
        ? friends.map(friend => `<li>${friend}</li>`).join('')
        : '<li>Aucun ami pour le moment</li>';
}
function initSidebarToggle() {
    const toggle = document.getElementById('nav-toggle');
    if (!toggle)
        return;
    toggle.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
    });
}
import { initChess } from "./chess.js";

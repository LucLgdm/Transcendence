function initViewSwitching(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('nav button');
    const views = document.querySelectorAll<HTMLElement>('.view');

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
async function initProfile(): Promise<void> {
    const profileInfo = document.getElementById('profile-info');
    const avatarImg = document.getElementById('profile-avatar') as HTMLImageElement | null;
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

        const user = await reponse.json() as {
            id: number;
            username: string;
            email: string;
            createdAT?: string;
            avatar?: string;
        }

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
        } catch (error) {
            profileInfo.innerHTML = '<p>Erreur de récupération du profil</p>';
            console.error('Erreur de récupération du profil:', error);
    }
}

function initFriends(): void {
    const friendsList = document.getElementById('friends-list');
    const addFriendForm = document.getElementById('add-friend-form') as HTMLFormElement;

    const friends: string[] = JSON.parse(localStorage.getItem('friends') || '[]');

    function saveFriends() {
        localStorage.setItem('friends', JSON.stringify(friends));
    }

    function renderFriends(): void {
        if (friendsList) {
            friendsList.innerHTML = friends.length > 0
                ? friends.map(friend => `<li>${friend}</li>`).join('')
                : '<li>Aucun ami pour le moment</li>';
        }
    }

    if (addFriendForm) {
        addFriendForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('friend-name') as HTMLInputElement;
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

function initChat(): void {
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form') as HTMLFormElement;

    const messages: Array<{ user: string; message: string; time: Date }> = [];

    function renderMessages(): void {
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
            const input = document.getElementById('chat-input') as HTMLInputElement;
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

function initGames(): void {
    // pong init a changer si jamais
    const pongCanvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
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

function initLeaderboard(): void {
    const leaderboardTable = document.querySelector('#leaderboard-table tbody');


    const scores: Array<{ player: string; score: number; game: string }> = [
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

function main(): void {
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
} else {
    main();
}

function initProfileFriends(): void {
    const profileFriendsList = document.getElementById('profile-friends-list');
    if (!profileFriendsList) return;

    const friends: string[] = JSON.parse(localStorage.getItem('friends') || '[]');

    profileFriendsList.innerHTML = friends.length > 0
        ? friends.map(friend => `<li>${friend}</li>`).join('')
        : '<li>Aucun ami pour le moment</li>';
}

function initSidebarToggle(): void {
    const toggle = document.getElementById('nav-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
    });
}

import {initChess}  from "./chess.js";
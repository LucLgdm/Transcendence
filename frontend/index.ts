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

// Initialisation du profil
function initProfile(): void {
    const profileInfo = document.getElementById('profile-info');
    if (profileInfo) {
        // TODO: Récupérer les données du profil depuis le backend
        profileInfo.innerHTML = `
            <p>Chargement du profil...</p>
        `;
    }
}

function initFriends(): void {
    const friendsList = document.getElementById('friends-list');
    const addFriendForm = document.getElementById('add-friend-form') as HTMLFormElement;

    const friends: string[] = [];

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
                renderFriends();
                input.value = '';
            }
        });
    }

    renderFriends();
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

import {initChess}  from "./chess.js";
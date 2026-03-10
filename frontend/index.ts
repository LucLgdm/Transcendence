import type { Friend, ChatMessage } from "./init-types";

function getAuthToken(): string | null {
    return localStorage.getItem("token");
}
  
async function fetchFriends(): Promise<Friend[]> {
  const token = getAuthToken();
  if (!token) return [];

  const res = await fetch("http://localhost:3000/friends", {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.error("Erreur fetch friends", res.status);
    return [];
  }

  return res.json();
}

async function fetchChatMess(userId: number): Promise<ChatMessage[]> {
    const token = getAuthToken();
    if (!token) return [];

    const res = await fetch (`https://localhost:3000/messages/${userId}`,{
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        }
    });

    if (!res.ok) {
        console.error("Erreur fetch chat messages", res.status);
        return [];
    }
    return res.json();
}

async function sendChatMessage(userId: number, content: string): Promise<void> {
    const token  = getAuthToken();
    if (!token) return;

    const res = await fetch (`https://localhost:3000/messages/${userId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({content}),
    });
    if (!res.ok) {
        console.error("Erreur sendChatMessage", res.status);
    }
}

async function addFriendById(friendId: number): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

  const res = await fetch(`http://localhost:3000/friends/${friendId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.error("Erreur addFriend", res.status);
  }
}

async function deleteFriend(friendId: number): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

  const res = await fetch(`http://localhost:3000/friends/${friendId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.error("Erreur deleteFriend", res.status);
  }
}

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

async function initFriends(): Promise<void> {
    const friendsList = document.getElementById("friends-list") as HTMLElement | null;
    const addFriendForm = document.getElementById('add-friend-form') as HTMLFormElement | null;
    const addFriendInput = document.getElementById('friend-name') as HTMLInputElement | null;

    if (!friendsList) 
        return;
    let friends: Friend[] = [];

    function renderFriends(): void {
        if (friends.length === 0) {
            friendsList!.innerHTML = "<li>Aucun ami pour le moment</li>";
            return;
        }
        friendsList!.innerHTML = friends.map((friend) => `<li ${friend.username} (${friend.email})>
            <button data_friend_id="${friend.id}" class="delete_friend">Supprimer</button>
            </li>`).join("");

        friendsList!.querySelectorAll<HTMLButtonElement>('.delete_friend').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.friendId);
                await deleteFriend(id);
                friends = friends.filter((fr) => fr.id !== id);
                renderFriends();
            });
        });
    }

    friends = await fetchFriends();
    renderFriends();

    if (addFriendForm && addFriendInput) {
        addFriendForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const value = addFriendInput.value.trim();
            if (!value) return;

            const friendId = Number(value);
            if (Number.isNaN(friendId)) {
                alert("Veuillez entrer un ID valide");
                return;
            }

            await addFriendById(friendId);
            friends = await fetchFriends();
            renderFriends();
            addFriendInput.value = "";
        });
    }
}

function renderProfileFriends(friends: Friend[]): void {
    const profileFriendsList = document.getElementById("friends_list");
    if (!profileFriendsList) return;
  
    profileFriendsList.innerHTML =
      friends.length === 0
        ? "<li>Aucun ami pour le moment</li>"
        : friends.map((f) => `<li>${f.username} (${f.email})</li>`).join("");
  }

  function initChat(): void {
    const messagesContainer = document.getElementById("chat-messages");
    const chatForm = document.getElementById("chat-form") as HTMLFormElement | null;
    const chatInput = document.getElementById("chat-input") as HTMLInputElement | null;
    const chatUserIdInput = document.getElementById("chat-user-id") as HTMLInputElement | null;
    const chatLoadBtn = document.getElementById("chat-load") as HTMLButtonElement | null;
  
    if (!messagesContainer || !chatForm || !chatInput || !chatUserIdInput || !chatLoadBtn) {
      return;
    }
  
    let currentOtherUserId: number | null = null;
    let messages: ChatMessage[] = [];
  
    function renderMessages(): void {
      messagesContainer!.innerHTML =
        messages.length === 0
          ? "<p>Aucun message</p>"
          : messages
              .map(
                (m) => `
                <div class="message">
                  <strong>${m.senderId}</strong> : ${m.content}
                  <small>${new Date(m.createdTimer).toLocaleTimeString()}</small>
                </div>
              `
              )
              .join("");
  
      messagesContainer!.scrollTop = messagesContainer!.scrollHeight;
    }
  
    async function loadConversation(): Promise<void> {
      const value = chatUserIdInput!.value.trim();
      const otherId = Number(value);
      if (!value || Number.isNaN(otherId)) {
        alert("Entrez un ID d'utilisateur valide");
        return;
      }
  
      currentOtherUserId = otherId;
      messages = await fetchChatMess(otherId);
      renderMessages();
    }
  
    chatLoadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loadConversation();
    });
  
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (currentOtherUserId === null) {
        alert("Choisissez d'abord un utilisateur avec qui chatter");
        return;
      }
      const content = chatInput.value.trim();
      if (!content) return;
  
      await sendChatMessage(currentOtherUserId, content);
      messages = await fetchChatMess(currentOtherUserId);
      renderMessages();
      chatInput.value = "";
    });
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
import { buildApiUrl } from "./api.js";
import { applyTranslations, getLanguage, initLanguage, nextLanguage, setLanguage, t } from "./i18n/index.js";
function getAuthToken() {
    return localStorage.getItem("token");
}
const DEFAULT_PROFILE_AVATAR = "./image/image.png";
let currentProfileUserId = null;
let profileAvatarPickerBound = false;
function refreshTranslations() {
    applyTranslations();
}
function getStoredProfileAvatar(userId) {
    return localStorage.getItem(`profile-avatar-${userId}`);
}
function setStoredProfileAvatar(userId, avatarDataUrl) {
    localStorage.setItem(`profile-avatar-${userId}`, avatarDataUrl);
}
function initProfileAvatarPicker() {
    if (profileAvatarPickerBound)
        return;
    const avatarImg = document.getElementById("profile-avatar");
    const avatarInput = document.getElementById("profile-avatar-input");
    if (!avatarImg || !avatarInput)
        return;
    avatarImg.addEventListener("click", () => {
        if (!getAuthToken()) {
            alert(t("avatar-login-required"));
            return;
        }
        avatarInput.click();
    });
    avatarInput.addEventListener("change", () => {
        const file = avatarInput.files?.[0];
        if (!file)
            return;
        if (!file.type.startsWith("image/")) {
            alert(t("avatar-select-image"));
            avatarInput.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const imageDataUrl = typeof reader.result === "string" ? reader.result : null;
            if (!imageDataUrl)
                return;
            avatarImg.src = imageDataUrl;
            if (currentProfileUserId !== null) {
                setStoredProfileAvatar(currentProfileUserId, imageDataUrl);
            }
        };
        reader.readAsDataURL(file);
        avatarInput.value = "";
    });
    profileAvatarPickerBound = true;
}
async function fetchUserMatches(userId) {
    const token = getAuthToken();
    if (!token)
        return [];
    const res = await fetch(buildApiUrl(`/remind-matches/users/${userId}/matches`), {
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        console.error("Erreur fetch matches", res.status);
        return [];
    }
    return res.json();
}
async function fetchFriends() {
    const token = getAuthToken();
    if (!token)
        return [];
    const res = await fetch(buildApiUrl("/friends"), {
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
async function fetchChatMess(userId) {
    const token = getAuthToken();
    if (!token)
        return [];
    const res = await fetch(buildApiUrl(`/messages/${userId}`), {
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
async function sendChatMessage(userId, content) {
    const token = getAuthToken();
    if (!token)
        return;
    const res = await fetch(buildApiUrl(`/messages/${userId}`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
    });
    if (!res.ok) {
        console.error("Erreur sendChatMessage", res.status);
    }
}
async function addFriendById(friendId) {
    const token = getAuthToken();
    if (!token)
        return;
    const res = await fetch(buildApiUrl(`/friends/${friendId}`), {
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
async function deleteFriend(friendId) {
    const token = getAuthToken();
    if (!token)
        return;
    const res = await fetch(buildApiUrl(`/friends/${friendId}`), {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        console.error("Erreur deleteFriend", res.status);
    }
}
async function podMatch(pload) {
    const token = getAuthToken();
    if (!token) {
        alert(t("match-submit-login-required"));
        return;
    }
    const res = await fetch(buildApiUrl("/remind-matches"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(pload),
    });
    if (!res.ok) {
        alert(t("match-submit-error"));
        return;
    }
    else {
        alert(t("match-submit-success"));
    }
}
async function fetchLeaderboard(game) {
    const res = await fetch(buildApiUrl(`/remind-matches/leaderboard?game=${encodeURIComponent(game)}`));
    if (!res.ok) {
        console.error("Erreur fetch leaderboard", res.status);
        return [];
    }
    return res.json();
}
function initViewSwitching() {
    const buttons = document.querySelectorAll('nav button');
    const views = document.querySelectorAll('.view');
    const gamesChoice = document.getElementById("games-choice");
    const gamesContent = document.getElementById("games-content");
    const chessContainer = document.getElementById("chess-container");
    const pongContainer = document.getElementById("pong-container");
    const gameReport = document.getElementById("game-report");
    const matchGame = document.getElementById("match-game");
    const protectedViews = new Set(["profile", "friends", "chat"]);
    function isAuthenticated() {
        return Boolean(getAuthToken());
    }
    function showGamesChoice() {
        if (gamesChoice)
            gamesChoice.hidden = false;
        if (gamesContent)
            gamesContent.hidden = true;
    }
    function showSelectedGame(game) {
        if (gamesChoice)
            gamesChoice.hidden = true;
        if (gamesContent)
            gamesContent.hidden = false;
        if (chessContainer)
            chessContainer.hidden = game !== "chess";
        if (pongContainer)
            pongContainer.hidden = game !== "pong";
        if (gameReport)
            gameReport.hidden = false;
        if (matchGame)
            matchGame.value = game;
        if (game === "chess") {
            initChess();
        }
    }
    function setActiveView(target) {
        if (protectedViews.has(target) && !isAuthenticated()) {
            alert(t("section-login-required"));
            target = "Login";
        }
        views.forEach((view) => {
            view.hidden = view.id !== `view-${target}`;
        });
        document.body.classList.toggle("home", target === "home");
        buttons.forEach((b) => b.classList.remove("pill--active"));
        const activeBtn = Array.from(buttons).find((b) => b.dataset.view === target);
        if (activeBtn)
            activeBtn.classList.add("pill--active");
        if (target === "profile")
            void initProfile();
        if (target === "games")
            showGamesChoice();
    }
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.view;
            if (target) {
                setActiveView(target);
            }
        });
    });
    setActiveView("home");
    const chessCard = document.getElementById("home-card-chess");
    const pongCard = document.getElementById("home-card-pong");
    chessCard?.addEventListener("click", () => {
        setActiveView("games");
        showSelectedGame("chess");
    });
    pongCard?.addEventListener("click", () => {
        setActiveView("games");
        showSelectedGame("pong");
    });
    const gamesChessCard = document.getElementById("games-card-chess");
    const gamesPongCard = document.getElementById("games-card-pong");
    gamesChessCard?.addEventListener("click", () => {
        showSelectedGame("chess");
    });
    gamesPongCard?.addEventListener("click", () => {
        showSelectedGame("pong");
    });
}
async function initProfile() {
    const profileInfo = document.getElementById("profile-info");
    const avatarImg = document.getElementById("profile-avatar");
    if (!profileInfo)
        return;
    const token = localStorage.getItem("token");
    if (!token) {
        currentProfileUserId = null;
        profileInfo.innerHTML = `<p>${t("profile-login-required")}</p>`;
        if (avatarImg) {
            avatarImg.src = DEFAULT_PROFILE_AVATAR;
        }
        return;
    }
    try {
        const reponse = await fetch(buildApiUrl("/users/me"), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        if (!reponse.ok) {
            profileInfo.innerHTML = `<p>${t("profile-fetch-error")}</p>`;
            return;
        }
        const user = await reponse.json();
        const currentUserId = user.id;
        currentProfileUserId = currentUserId;
        const creationDateValue = user.createdAt ?? user.createdAT;
        profileInfo.innerHTML = `
        <p>${t("profile-username")}: ${user.username}</p>
        <p>${t("profile-email")}: ${user.email}</p>
        <p>${t("profile-created-at")}: ${creationDateValue ? new Date(creationDateValue).toLocaleDateString() : "N/A"}</p>
        <button id="profile-language-btn" type="button">${t("profile-change-language")} (${t(`lang-${getLanguage()}`)})</button>
      `;
        const profileLanguageBtn = document.getElementById("profile-language-btn");
        profileLanguageBtn?.addEventListener("click", () => {
            setLanguage(nextLanguage());
            refreshTranslations();
            void initProfile();
            void initLeaderboard();
            initGames();
        });
        if (avatarImg) {
            const customAvatar = getStoredProfileAvatar(currentUserId);
            avatarImg.src =
                (customAvatar && customAvatar.length > 0)
                    ? customAvatar
                    : user.profile_picture && user.profile_picture.length > 0
                        ? user.profile_picture
                        : user.avatar && user.avatar.length > 0
                            ? user.avatar
                            : DEFAULT_PROFILE_AVATAR;
        }
        const matches = await fetchUserMatches(currentUserId);
        const matchesList = document.getElementById("profile-matches");
        if (matchesList) {
            if (matches.length === 0) {
                matchesList.innerHTML = `<li>${t("profile-no-matches")}</li>`;
            }
            else {
                matchesList.innerHTML = matches
                    .map((m) => {
                    const date = new Date(m.createdAt).toLocaleString();
                    let result;
                    if (m.winnerID === null) {
                        result = t("profile-match-draw");
                    }
                    else if (m.winnerID === currentUserId) {
                        result = t("profile-match-win");
                    }
                    else {
                        result = t("profile-match-loss");
                    }
                    const adversaireId = m.player1ID === currentUserId ? m.player2ID : m.player1ID;
                    return `<li>
                [${m.game}] ${result} ${t("profile-match-vs-player")} ${adversaireId}
                (${t("score")}: ${m.scoreP1 ?? "-"} - ${m.scoreP2 ?? "-"}) ${t("profile-match-on")} ${date}
              </li>`;
                })
                    .join("");
            }
        }
    }
    catch (error) {
        profileInfo.innerHTML = `<p>${t("profile-fetch-error")}</p>`;
        if (avatarImg) {
            avatarImg.src = DEFAULT_PROFILE_AVATAR;
        }
        console.error("Erreur de récupération du profil:", error);
    }
}
async function initFriends() {
    const friendsList = document.getElementById("friends-list");
    const addFriendForm = document.getElementById('add-friend-form');
    const addFriendInput = document.getElementById('friend-name');
    if (!friendsList)
        return;
    let friends = [];
    function renderFriends() {
        if (friends.length === 0) {
            friendsList.innerHTML = `<li>${t("friends-empty")}</li>`;
            return;
        }
        friendsList.innerHTML = friends.map((friend) => `<li ${friend.username} (${friend.email})>
            <button data_friend_id="${friend.id}" class="delete_friend">${t("delete")}</button>
            </li>`).join("");
        friendsList.querySelectorAll('.delete_friend').forEach(btn => {
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
            if (!value)
                return;
            const friendId = Number(value);
            if (Number.isNaN(friendId)) {
                alert(t("friend-id-invalid"));
                return;
            }
            await addFriendById(friendId);
            friends = await fetchFriends();
            renderFriends();
            addFriendInput.value = "";
        });
    }
}
function renderProfileFriends(friends) {
    const profileFriendsList = document.getElementById("friends_list");
    if (!profileFriendsList)
        return;
    profileFriendsList.innerHTML =
        friends.length === 0
            ? `<li>${t("friends-empty")}</li>`
            : friends.map((f) => `<li>${f.username} (${f.email})</li>`).join("");
}
function initChat() {
    const messagesContainer = document.getElementById("chat-messages");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatUserIdInput = document.getElementById("chat-user-id");
    const chatLoadBtn = document.getElementById("chat-load");
    if (!messagesContainer || !chatForm || !chatInput || !chatUserIdInput || !chatLoadBtn) {
        return;
    }
    let currentOtherUserId = null;
    let messages = [];
    function renderMessages() {
        messagesContainer.innerHTML =
            messages.length === 0
                ? `<p>${t("chat-empty")}</p>`
                : messages
                    .map((m) => `
                <div class="message">
                  <strong>${m.senderId}</strong> : ${m.content}
                  <small>${new Date(m.createdTimer).toLocaleTimeString()}</small>
                </div>
              `)
                    .join("");
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    async function loadConversation() {
        const value = chatUserIdInput.value.trim();
        const otherId = Number(value);
        if (!value || Number.isNaN(otherId)) {
            alert(t("chat-user-invalid"));
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
            alert(t("chat-select-user-first"));
            return;
        }
        const content = chatInput.value.trim();
        if (!content)
            return;
        await sendChatMessage(currentOtherUserId, content);
        messages = await fetchChatMess(currentOtherUserId);
        renderMessages();
        chatInput.value = "";
    });
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
            ctx.fillText(t("games-pong-placeholder"), pongCanvas.width / 2, pongCanvas.height / 2);
        }
    }
    initChess();
}
async function initLeaderboard() {
    const leaderboardTable = document.querySelector("#leaderboard-table tbody");
    if (!leaderboardTable)
        return;
    const rows = await fetchLeaderboard("chess");
    if (rows.length === 0) {
        leaderboardTable.innerHTML = `
        <tr>
          <td colspan="3">${t("leaderboard-empty")}</td>
        </tr>
      `;
        return;
    }
    leaderboardTable.innerHTML = rows
        .map((row) => {
        const username = row.player?.username ?? `User #${row.winnerId}`;
        return `
          <tr>
            <td>${username}</td>
            <td>${row.wins}</td>
            <td>${t("chess")}</td>
          </tr>
        `;
    })
        .join("");
}
function initMatchForm() {
    const form = document.getElementById('match-form');
    if (!form)
        return;
    const gameSelected = document.getElementById('match-game');
    const matchplayer1 = document.getElementById('match-p1');
    const matchplayer2 = document.getElementById('match-p2');
    const matchwinner = document.getElementById('match-winner');
    const matchscore1 = document.getElementById('match-score1');
    const matchscore2 = document.getElementById('match-score2');
    if (!gameSelected || !matchplayer1 || !matchplayer2 || !matchwinner || !matchscore1 || !matchscore2)
        return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const game = gameSelected.value;
        const player1 = Number(matchplayer1.value);
        const player2 = Number(matchplayer2.value);
        const winner = Number(matchwinner.value);
        const score1 = Number(matchscore1.value);
        const score2 = Number(matchscore2.value);
        if (!player1 || !player2) {
            alert(t("match-missing-player"));
            return;
        }
        const winnerId = winner === 0 ? null : winner;
        await podMatch({ game, player1ID: player1, player2ID: player2, winnerID: winnerId, scoreP1: score1, scoreP2: score2 });
    });
    form.reset();
}
function main() {
    initLanguage();
    refreshTranslations();
    initProfileAvatarPicker();
    initViewSwitching();
    initProfile();
    initFriends();
    initChat();
    initGames();
    initLeaderboard();
    initSidebarToggle();
    initMatchForm();
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

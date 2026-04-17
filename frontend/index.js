import { buildApiUrl } from "./api.js";
import { applyTranslations, getLanguage, initLanguage, nextLanguage, setLanguage, t } from "./i18n/index.js";
function getAuthToken() {
    return localStorage.getItem("token");
}
const DEFAULT_PROFILE_AVATAR = "./image/image.png";
const LEADERBOARD_PAGE_SIZE = 10;
let currentProfileUserId = null;
let profileAvatarPickerBound = false;
let selectedXpUser = null;
let pendingChatTargetUserId = null;
let cachedLeaderboardStats = [];
let eloLeaderboardPage = 0;
let xpLeaderboardPage = 0;
function refreshTranslations() {
    applyTranslations();
}
function getStoredProfileAvatar(userId) {
    return localStorage.getItem(`profile-avatar-${userId}`);
}
function setStoredProfileAvatar(userId, avatarDataUrl) {
    localStorage.setItem(`profile-avatar-${userId}`, avatarDataUrl);
}
function getStoredLocalChessXp(userId) {
    const rawValue = localStorage.getItem(`chess-local-xp-${userId}`);
    const value = rawValue ? Number(rawValue) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
}
function getCurrentUserIdFromToken() {
    const token = getAuthToken();
    if (!token)
        return null;
    const payload = token.split(".")[1];
    if (!payload)
        return null;
    try {
        const parsed = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
        const id = Number(parsed.id);
        return Number.isFinite(id) && id > 0 ? id : null;
    }
    catch {
        return null;
    }
}
function computeXpFromChessMatches(matches, currentUserId) {
    return matches
        .filter((match) => match.game.toLowerCase() === "chess")
        .reduce((totalXp, match) => {
        const noOnlineOpponent = !match.player2ID || match.player2ID <= 0 || match.player2ID === currentUserId;
        if (noOnlineOpponent) {
            return totalXp + 25;
        }
        const isWinner = match.winnerID === currentUserId;
        return totalXp + (isWinner ? 30 : 25);
    }, 0);
}
function getXpProgress(totalXp) {
    let level = 1;
    let xpRequired = 100;
    let xpInLevel = totalXp;
    while (xpInLevel >= xpRequired) {
        xpInLevel -= xpRequired;
        level += 1;
        xpRequired *= 2;
    }
    const percent = xpRequired > 0 ? Math.min(100, (xpInLevel / xpRequired) * 100) : 0;
    return { level, xpInLevel, xpRequired, percent };
}
function renderProfileXp(totalXp) {
    const xpMeta = document.getElementById("profile-xp-meta");
    const xpFill = document.getElementById("profile-xp-fill");
    if (!xpMeta || !xpFill)
        return;
    const progress = getXpProgress(totalXp);
    xpMeta.textContent = `Niveau ${progress.level} - ${progress.xpInLevel} / ${progress.xpRequired} XP`;
    xpFill.style.width = `${progress.percent}%`;
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
async function fetchIncomingFriendRequests() {
    const token = getAuthToken();
    if (!token)
        return [];
    const res = await fetch(buildApiUrl("/friends/requests"), {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        console.error("Erreur fetch friend requests", res.status);
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
        return false;
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
        return false;
    }
    return true;
}
async function addFriendById(friendId) {
    const token = getAuthToken();
    if (!token)
        return false;
    const res = await fetch(buildApiUrl(`/friends/${friendId}`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        console.error("Erreur addFriend", res.status);
        return false;
    }
    return true;
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
async function acceptFriendRequestById(friendId) {
    const token = getAuthToken();
    if (!token)
        return false;
    const res = await fetch(buildApiUrl(`/friends/${friendId}/accept`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        console.error("Erreur acceptFriend", res.status);
        return false;
    }
    return true;
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
async function fetchUsers() {
    const res = await fetch(buildApiUrl("/users"));
    if (!res.ok) {
        console.error("Erreur fetch users", res.status);
        return [];
    }
    return res.json();
}
async function fetchUserLeaderboardStats() {
    const users = await fetchUsers();
    if (users.length === 0)
        return [];
    const stats = await Promise.all(users.map(async (user) => {
        const matches = await fetchUserMatches(user.id);
        const wins = matches.filter((match) => match.game.toLowerCase() === "chess" && match.winnerID === user.id).length;
        const remoteXp = computeXpFromChessMatches(matches, user.id);
        const localXp = getStoredLocalChessXp(user.id);
        return {
            user,
            wins,
            xp: remoteXp + localXp,
        };
    }));
    return stats;
}
function renderXpProfileActions(user) {
    selectedXpUser = user;
    const actions = document.getElementById("xp-profile-actions");
    const selectedUser = document.getElementById("xp-selected-user");
    if (!actions || !selectedUser)
        return;
    selectedUser.textContent = `${t("xp-selected-player")}: ${user.username} (#${user.id})`;
    actions.hidden = false;
}
function openChatWithUser(userId) {
    pendingChatTargetUserId = userId;
    const chatNavButton = document.querySelector('nav button[data-view="chat"]');
    chatNavButton?.click();
    window.dispatchEvent(new CustomEvent("chat-open-user", { detail: { userId } }));
}
function bindXpProfileActionButtons() {
    const addFriendBtn = document.getElementById("xp-add-friend-btn");
    const sendMessageBtn = document.getElementById("xp-send-message-btn");
    if (!addFriendBtn || !sendMessageBtn)
        return;
    addFriendBtn.onclick = async () => {
        if (!selectedXpUser)
            return;
        const added = await addFriendById(selectedXpUser.id);
        if (!added)
            return;
        await initFriends();
        await initProfile();
        alert(`${selectedXpUser.username} ${t("friend-added-success")}`);
    };
    sendMessageBtn.onclick = async () => {
        if (!selectedXpUser)
            return;
        const content = window.prompt(`${t("message-prompt")} ${selectedXpUser.username}`);
        if (!content || !content.trim())
            return;
        const sent = await sendChatMessage(selectedXpUser.id, content.trim());
        if (!sent)
            return;
        openChatWithUser(selectedXpUser.id);
        alert(t("message-sent-success"));
    };
}
function getTotalPages(totalEntries) {
    return Math.max(1, Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE));
}
function paginateEntries(entries, page) {
    const start = page * LEADERBOARD_PAGE_SIZE;
    return entries.slice(start, start + LEADERBOARD_PAGE_SIZE);
}
function renderLeaderboardPagination() {
    const eloPrevBtn = document.getElementById("elo-prev-btn");
    const eloNextBtn = document.getElementById("elo-next-btn");
    const eloPageInfo = document.getElementById("elo-page-info");
    const xpPrevBtn = document.getElementById("xp-prev-btn");
    const xpNextBtn = document.getElementById("xp-next-btn");
    const xpPageInfo = document.getElementById("xp-page-info");
    const totalPages = getTotalPages(cachedLeaderboardStats.length);
    if (eloPageInfo)
        eloPageInfo.textContent = `${eloLeaderboardPage + 1} / ${totalPages}`;
    if (xpPageInfo)
        xpPageInfo.textContent = `${xpLeaderboardPage + 1} / ${totalPages}`;
    if (eloPrevBtn)
        eloPrevBtn.disabled = eloLeaderboardPage <= 0;
    if (eloNextBtn)
        eloNextBtn.disabled = eloLeaderboardPage >= totalPages - 1;
    if (xpPrevBtn)
        xpPrevBtn.disabled = xpLeaderboardPage <= 0;
    if (xpNextBtn)
        xpNextBtn.disabled = xpLeaderboardPage >= totalPages - 1;
}
function bindLeaderboardPaginationButtons() {
    const eloPrevBtn = document.getElementById("elo-prev-btn");
    const eloNextBtn = document.getElementById("elo-next-btn");
    const xpPrevBtn = document.getElementById("xp-prev-btn");
    const xpNextBtn = document.getElementById("xp-next-btn");
    eloPrevBtn.onclick = () => {
        if (eloLeaderboardPage <= 0)
            return;
        eloLeaderboardPage -= 1;
        renderEloLeaderboard();
    };
    eloNextBtn.onclick = () => {
        const totalPages = getTotalPages(cachedLeaderboardStats.length);
        if (eloLeaderboardPage >= totalPages - 1)
            return;
        eloLeaderboardPage += 1;
        renderEloLeaderboard();
    };
    xpPrevBtn.onclick = () => {
        if (xpLeaderboardPage <= 0)
            return;
        xpLeaderboardPage -= 1;
        void renderXpLeaderboard();
    };
    xpNextBtn.onclick = () => {
        const totalPages = getTotalPages(cachedLeaderboardStats.length);
        if (xpLeaderboardPage >= totalPages - 1)
            return;
        xpLeaderboardPage += 1;
        void renderXpLeaderboard();
    };
}
function renderEloLeaderboard() {
    const leaderboardTable = document.querySelector("#leaderboard-table tbody");
    if (!leaderboardTable)
        return;
    if (cachedLeaderboardStats.length === 0) {
        leaderboardTable.innerHTML = `
          <tr>
            <td colspan="3">${t("leaderboard-empty")}</td>
          </tr>
        `;
        renderLeaderboardPagination();
        return;
    }
    const rankingByElo = [...cachedLeaderboardStats]
        .sort((a, b) => (b.user.elo ?? 500) - (a.user.elo ?? 500));
    const totalPages = getTotalPages(rankingByElo.length);
    if (eloLeaderboardPage > totalPages - 1)
        eloLeaderboardPage = totalPages - 1;
    const pageEntries = paginateEntries(rankingByElo, eloLeaderboardPage);
    leaderboardTable.innerHTML = pageEntries
        .map((entry) => `
          <tr>
            <td>${entry.user.username}</td>
            <td>${entry.user.elo ?? 500}</td>
            <td>${t("chess")}</td>
          </tr>
        `)
        .join("");
    renderLeaderboardPagination();
}
async function renderXpLeaderboard() {
    const xpTableBody = document.querySelector("#xp-leaderboard-table tbody");
    const topProfile = document.getElementById("xp-top-profile");
    const topProfileBtn = document.getElementById("xp-top-profile-btn");
    const xpActions = document.getElementById("xp-profile-actions");
    if (!xpTableBody || !topProfile || !topProfileBtn || !xpActions)
        return;
    selectedXpUser = null;
    xpActions.hidden = true;
    topProfile.hidden = true;
    const stats = cachedLeaderboardStats;
    if (stats.length === 0) {
        xpTableBody.innerHTML = `<tr><td colspan="2">${t("leaderboard-empty")}</td></tr>`;
        renderLeaderboardPagination();
        return;
    }
    const ranking = stats
        .map((entry) => ({ user: entry.user, xp: entry.xp }))
        .sort((a, b) => b.xp - a.xp);
    if (ranking.length === 0) {
        xpTableBody.innerHTML = `<tr><td colspan="2">${t("leaderboard-empty")}</td></tr>`;
        renderLeaderboardPagination();
        return;
    }
    const topUser = ranking[0].user;
    topProfile.hidden = false;
    topProfileBtn.textContent = `${topUser.username} (#${topUser.id})`;
    topProfileBtn.onclick = () => renderXpProfileActions(topUser);
    const totalPages = getTotalPages(ranking.length);
    if (xpLeaderboardPage > totalPages - 1)
        xpLeaderboardPage = totalPages - 1;
    const pageEntries = paginateEntries(ranking, xpLeaderboardPage);
    xpTableBody.innerHTML = pageEntries
        .map((entry) => `
            <tr>
                <td><button type="button" class="xp-profile-btn xp-row-profile" data-user-id="${entry.user.id}">${entry.user.username}</button></td>
                <td>${entry.xp}</td>
            </tr>
        `)
        .join("");
    const userMap = new Map(ranking.map((entry) => [entry.user.id, entry.user]));
    xpTableBody.querySelectorAll(".xp-row-profile").forEach((button) => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.userId);
            const user = userMap.get(id);
            if (user)
                renderXpProfileActions(user);
        });
    });
    renderLeaderboardPagination();
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
        renderProfileXp(0);
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
        <p>${t("score")}: ${user.elo ?? 500}</p>
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
        const profileFriends = await fetchFriends();
        const users = await fetchUsers();
        const usernamesById = new Map(users.map((entry) => [entry.id, entry.username]));
        const matchesList = document.getElementById("profile-matches");
        const totalXp = computeXpFromChessMatches(matches, currentUserId) + getStoredLocalChessXp(currentUserId);
        renderProfileXp(totalXp);
        renderProfileFriends(profileFriends);
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
                    const adversaireName = usernamesById.get(adversaireId) ?? `#${adversaireId}`;
                    const eloDelta = m.winnerID === null ? 0 : (m.winnerID === currentUserId ? 10 : -10);
                    const formattedEloDelta = eloDelta > 0 ? `+${eloDelta}` : String(eloDelta);
                    return `<li>
                [${m.game}] ${result} ${t("profile-match-vs-player")} ${adversaireName}
                (${t("score")}: ${formattedEloDelta}) ${t("profile-match-on")} ${date}
              </li>`;
                })
                    .join("");
            }
        }
    }
    catch (error) {
        profileInfo.innerHTML = `<p>${t("profile-fetch-error")}</p>`;
        renderProfileXp(0);
        if (avatarImg) {
            avatarImg.src = DEFAULT_PROFILE_AVATAR;
        }
        console.error("Erreur de récupération du profil:", error);
    }
}
async function initFriends() {
    const friendsList = document.getElementById("friends-list");
    const requestsList = document.getElementById("friend-requests-list");
    const addFriendForm = document.getElementById('add-friend-form');
    const addFriendInput = document.getElementById('friend-name');
    if (!friendsList)
        return;
    let friends = [];
    let requests = [];
    function renderFriends() {
        if (friends.length === 0) {
            friendsList.innerHTML = `<li>${t("friends-empty")}</li>`;
            return;
        }
        friendsList.innerHTML = friends.map((friend) => `<li>${friend.username} (${friend.email})
            <button data-friend-id="${friend.id}" class="delete_friend">${t("delete")}</button>
            </li>`).join("");
        friendsList.querySelectorAll('.delete_friend').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.friendId);
                await deleteFriend(id);
                friends = friends.filter((fr) => fr.id !== id);
                renderFriends();
                renderProfileFriends(friends);
            });
        });
    }
    function renderRequests() {
        if (!requestsList)
            return;
        if (requests.length === 0) {
            requestsList.innerHTML = `<li>${t("friend-requests-empty")}</li>`;
            return;
        }
        requestsList.innerHTML = requests
            .map((request) => `<li>${request.username} (${request.email})
              <button data-friend-id="${request.id}" class="accept_friend">${t("friend-accept")}</button>
            </li>`)
            .join("");
        requestsList.querySelectorAll(".accept_friend").forEach((button) => {
            button.addEventListener("click", async () => {
                const id = Number(button.dataset.friendId);
                if (Number.isNaN(id))
                    return;
                const accepted = await acceptFriendRequestById(id);
                if (!accepted)
                    return;
                friends = await fetchFriends();
                requests = await fetchIncomingFriendRequests();
                renderFriends();
                renderRequests();
                renderProfileFriends(friends);
            });
        });
    }
    friends = await fetchFriends();
    requests = await fetchIncomingFriendRequests();
    renderFriends();
    renderRequests();
    if (addFriendForm && addFriendInput) {
        addFriendForm.onsubmit = async (event) => {
            event.preventDefault();
            const value = addFriendInput.value.trim();
            if (!value)
                return;
            const friendId = Number(value);
            if (Number.isNaN(friendId)) {
                alert(t("friend-id-invalid"));
                return;
            }
            const added = await addFriendById(friendId);
            if (!added)
                return;
            friends = await fetchFriends();
            requests = await fetchIncomingFriendRequests();
            renderFriends();
            renderRequests();
            renderProfileFriends(friends);
            addFriendInput.value = "";
        };
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
    const conversationsContainer = document.getElementById("chat-conversations");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    if (!messagesContainer || !conversationsContainer || !chatForm || !chatInput) {
        return;
    }
    const chatConversationsRoot = conversationsContainer;
    let currentOtherUserId = null;
    let messages = [];
    let usernames = new Map();
    async function refreshUsernames() {
        const users = await fetchUsers();
        usernames = new Map(users.map((user) => [user.id, user.username]));
    }
    function renderMessages() {
        messagesContainer.innerHTML =
            messages.length === 0
                ? `<p>${t("chat-empty")}</p>`
                : messages
                    .map((m) => `
                <div class="message">
                  <strong>${usernames.get(m.senderId) ?? `#${m.senderId}`}</strong> : ${m.content}
                  <small>${new Date(m.createdAt ?? m.createdTimer ?? Date.now()).toLocaleTimeString()}</small>
                </div>
              `)
                    .join("");
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    async function loadConversationById(otherId) {
        currentOtherUserId = otherId;
        await refreshUsernames();
        messages = await fetchChatMess(otherId);
        renderMessages();
    }
    async function refreshConversationsList() {
        const currentUserId = getCurrentUserIdFromToken();
        if (!currentUserId) {
            chatConversationsRoot.innerHTML = `<p>${t("section-login-required")}</p>`;
            return;
        }
        await refreshUsernames();
        const candidates = [...usernames.entries()].filter(([id]) => id !== currentUserId);
        const conversations = await Promise.all(candidates.map(async ([id, username]) => {
            const convMessages = await fetchChatMess(id);
            const lastMessage = convMessages[convMessages.length - 1];
            return { id, username, convMessages, lastMessage };
        }));
        const started = conversations
            .filter((conversation) => conversation.convMessages.length > 0)
            .sort((a, b) => {
            const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt ?? a.lastMessage.createdTimer ?? 0).getTime() : 0;
            const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt ?? b.lastMessage.createdTimer ?? 0).getTime() : 0;
            return bTime - aTime;
        });
        if (started.length === 0) {
            chatConversationsRoot.innerHTML = `<p>${t("chat-no-conversations")}</p>`;
            return;
        }
        chatConversationsRoot.innerHTML = started
            .map((conversation) => {
            const preview = conversation.lastMessage?.content ?? "";
            return `
            <button type="button" class="chat-conversation-btn" data-user-id="${conversation.id}">
              <strong>${conversation.username}</strong>
              <div>${preview}</div>
            </button>
          `;
        })
            .join("");
        chatConversationsRoot.querySelectorAll(".chat-conversation-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const id = Number(button.dataset.userId);
                if (Number.isNaN(id))
                    return;
                void loadConversationById(id);
            });
        });
    }
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (currentOtherUserId === null) {
            alert(t("chat-select-user-first"));
            return;
        }
        const content = chatInput.value.trim();
        if (!content)
            return;
        const sent = await sendChatMessage(currentOtherUserId, content);
        if (!sent)
            return;
        await loadConversationById(currentOtherUserId);
        await refreshConversationsList();
        chatInput.value = "";
    });
    window.addEventListener("chat-open-user", (event) => {
        const customEvent = event;
        const userId = Number(customEvent.detail?.userId);
        if (!Number.isFinite(userId) || userId <= 0)
            return;
        void loadConversationById(userId);
    });
    void refreshConversationsList();
    if (pendingChatTargetUserId) {
        void loadConversationById(pendingChatTargetUserId);
        pendingChatTargetUserId = null;
    }
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
    bindXpProfileActionButtons();
    bindLeaderboardPaginationButtons();
    const statsByUser = await fetchUserLeaderboardStats();
    cachedLeaderboardStats = statsByUser;
    const totalPages = getTotalPages(cachedLeaderboardStats.length);
    if (eloLeaderboardPage > totalPages - 1)
        eloLeaderboardPage = totalPages - 1;
    if (xpLeaderboardPage > totalPages - 1)
        xpLeaderboardPage = totalPages - 1;
    renderEloLeaderboard();
    await renderXpLeaderboard();
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
    window.addEventListener("chess-xp-updated", () => {
        const profileView = document.getElementById("view-profile");
        if (profileView && !profileView.hidden) {
            void initProfile();
        }
    });
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

import { buildApiUrl } from "./api/api.js";
import { applyTranslations, getLanguage, initLanguage, nextLanguage, setLanguage, t } from "./i18n/index.js";
import { abandonOnlineChessIfNeeded, initChess } from "./chess/chess.js";
import { disposePongIfAny, initPong } from "./pong/GameEngine.js";
import { setConsoleFunction } from "three";
setConsoleFunction(() => undefined);
function getAuthToken() {
    return localStorage.getItem("token");
}
function persistOAuthToken() {
    let token = new URLSearchParams(window.location.search).get("token");
    if (!token?.trim() && window.location.hash.length > 1) {
        token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    }
    if (!token?.trim())
        return;
    localStorage.setItem("token", token.trim());
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    const qs = url.searchParams.toString();
    url.search = qs ? `?${qs}` : "";
    if (url.hash.length > 1) {
        const hp = new URLSearchParams(url.hash.slice(1));
        hp.delete("token");
        const h = hp.toString();
        url.hash = h ? `#${h}` : "";
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
function escapeHtml(raw) {
    return raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function displayNameWithId(username, id) {
    return `${username} (${id})`;
}
const DEFAULT_PROFILE_AVATAR = "./image/default_profile_picture.png";
const LEADERBOARD_PAGE_SIZE = 10;
let currentProfileUserId = null;
let profileAvatarPickerBound = false;
let selectedXpUser = null;
let pendingChatTargetUserId = null;
let cachedLeaderboardStats = [];
let eloLeaderboardPage = 0;
let xpLeaderboardPage = 0;
let disposeXpProfilePopover = null;
let profileUsernameOverride = null;
let profileLoadSeq = 0;
function refreshTranslations() {
    applyTranslations();
}
function setProfileLogoutButtonVisible(visible) {
    const btn = document.getElementById("profile-logout-btn");
    if (btn)
        btn.hidden = !visible;
    const delBtn = document.getElementById("profile-delete-account-btn");
    if (delBtn)
        delBtn.hidden = !visible;
}
function setProfileFriendsSectionVisible(visible) {
    const friendsList = document.getElementById("friends_list");
    const friendHeading = friendsList?.previousElementSibling;
    if (friendHeading?.tagName === "H3")
        friendHeading.hidden = !visible;
    if (friendsList)
        friendsList.hidden = !visible;
}
function openLeaderboardUserProfile(username) {
    const name = username.trim();
    if (!name)
        return;
    hideXpProfileActions();
    window.dispatchEvent(new CustomEvent("app-open-profile", { detail: { username: name } }));
}
function initProfileLogout() {
    const btn = document.getElementById("profile-logout-btn");
    if (!btn || btn.dataset.logoutBound === "1")
        return;
    btn.dataset.logoutBound = "1";
    btn.addEventListener("click", async () => {
        localStorage.removeItem("token");
        profileUsernameOverride = null;
        await abandonOnlineChessIfNeeded();
        disposePongIfAny();
        setProfileLogoutButtonVisible(false);
        document.querySelector('nav button[data-view="home"]')?.click();
        refreshTranslations();
        void initProfile();
        void initLeaderboard();
        void initFriends();
    });
}
function initProfileDeleteAccount() {
    const btn = document.getElementById("profile-delete-account-btn");
    if (!btn || btn.dataset.deleteAccountBound === "1")
        return;
    btn.dataset.deleteAccountBound = "1";
    btn.addEventListener("click", async () => {
        if (!window.confirm(t("profile-delete-confirm")))
            return;
        const token = getAuthToken();
        if (!token) {
            alert(t("profile-delete-error"));
            return;
        }
        const uid = currentProfileUserId;
        try {
            const res = await fetch(buildApiUrl("/users/me"), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 204) {
                localStorage.removeItem("token");
                if (uid !== null) {
                    localStorage.removeItem(`profile-avatar-${uid}`);
                    localStorage.removeItem(`chess-local-xp-${uid}`);
                }
                profileUsernameOverride = null;
                currentProfileUserId = null;
                await abandonOnlineChessIfNeeded();
                disposePongIfAny();
                setProfileLogoutButtonVisible(false);
                window.location.replace(new URL("login.html", window.location.href).href);
                return;
            }
            if (res.status === 401) {
                localStorage.removeItem("token");
                window.location.replace(new URL("login.html", window.location.href).href);
                return;
            }
            alert(t("profile-delete-error"));
        }
        catch {
            alert(t("profile-delete-error"));
        }
    });
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
function decodeJwtPayloadJson(token) {
    const payload = token.split(".")[1];
    if (!payload)
        return null;
    try {
        let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const pad = base64.length % 4;
        if (pad)
            base64 += "=".repeat(4 - pad);
        return JSON.parse(atob(base64));
    }
    catch {
        return null;
    }
}
function getCurrentUserIdFromToken() {
    const token = getAuthToken();
    if (!token)
        return null;
    const parsed = decodeJwtPayloadJson(token);
    if (!parsed)
        return null;
    const id = Number(parsed.id);
    return Number.isFinite(id) && id > 0 ? id : null;
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
        if (profileUsernameOverride !== null) {
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
        return [];
    }
    return res.json();
}
const CHAT_POLL_INTERVAL_MS = 1000;
const CHAT_LIST_REFRESH_INTERVAL_MS = 2500;
function chatMessagesFingerprint(msgs) {
    if (msgs.length === 0)
        return "0";
    const last = msgs[msgs.length - 1];
    return `${msgs.length}:${last.id}:${String(last.createdAt ?? last.createdTimer ?? "")}`;
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
    if (!res.ok)
        return;
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
async function fetchUsers() {
    const res = await fetch(buildApiUrl("/users"));
    if (!res.ok) {
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
function disposeXpProfilePopoverListeners() {
    disposeXpProfilePopover?.();
    disposeXpProfilePopover = null;
}
function hideXpProfileActions() {
    disposeXpProfilePopoverListeners();
    const actions = document.getElementById("xp-profile-actions");
    if (actions) {
        actions.hidden = true;
        actions.classList.remove("xp-profile-actions--popover");
        actions.style.top = "";
        actions.style.left = "";
        actions.style.width = "";
    }
    selectedXpUser = null;
}
function positionXpProfilePopover(trigger, panel) {
    const pad = 12;
    const gap = 8;
    const rect = trigger.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const panelW = pr.width;
    let left = rect.left + rect.width / 2 - panelW / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - panelW - pad));
    panel.style.left = `${Math.round(left)}px`;
    const h = pr.height;
    let top = rect.top - gap - h;
    if (top < pad) {
        top = rect.bottom + gap;
    }
    if (top + h > window.innerHeight - pad) {
        top = Math.max(pad, window.innerHeight - h - pad);
    }
    panel.style.top = `${Math.round(top)}px`;
}
function renderXpProfileActions(user, trigger) {
    disposeXpProfilePopoverListeners();
    selectedXpUser = user;
    const actions = document.getElementById("xp-profile-actions");
    const selectedUser = document.getElementById("xp-selected-user");
    if (!actions || !selectedUser)
        return;
    selectedUser.textContent = `${t("xp-selected-player")}: ${displayNameWithId(user.username, user.id)}`;
    actions.hidden = false;
    applyTranslations(actions);
    const usePopover = trigger !== undefined;
    if (usePopover && trigger) {
        actions.classList.add("xp-profile-actions--popover");
        const reposition = () => {
            positionXpProfilePopover(trigger, actions);
        };
        requestAnimationFrame(() => {
            requestAnimationFrame(reposition);
        });
        let repositionScrollRaf = 0;
        const scheduleReposition = () => {
            if (repositionScrollRaf !== 0)
                return;
            repositionScrollRaf = requestAnimationFrame(() => {
                repositionScrollRaf = 0;
                reposition();
            });
        };
        const onScrollOrResize = () => {
            scheduleReposition();
        };
        const scrollListenerOpts = { capture: true, passive: true };
        const pointerListenerOpts = { capture: true, passive: true };
        const keydownListenerOpts = { passive: true };
        window.addEventListener("resize", onScrollOrResize);
        window.addEventListener("scroll", onScrollOrResize, scrollListenerOpts);
        const onEscape = (e) => {
            if (e.key === "Escape")
                hideXpProfileActions();
        };
        document.addEventListener("keydown", onEscape, keydownListenerOpts);
        const onPointerDown = (e) => {
            const target = e.target;
            if (actions.contains(target) || trigger.contains(target))
                return;
            hideXpProfileActions();
        };
        let pointerDownAttached = false;
        const pointerTimeout = window.setTimeout(() => {
            document.addEventListener("pointerdown", onPointerDown, pointerListenerOpts);
            pointerDownAttached = true;
        }, 0);
        disposeXpProfilePopover = () => {
            window.clearTimeout(pointerTimeout);
            if (repositionScrollRaf !== 0) {
                cancelAnimationFrame(repositionScrollRaf);
                repositionScrollRaf = 0;
            }
            if (pointerDownAttached) {
                document.removeEventListener("pointerdown", onPointerDown, pointerListenerOpts);
            }
            window.removeEventListener("resize", onScrollOrResize);
            window.removeEventListener("scroll", onScrollOrResize, scrollListenerOpts);
            document.removeEventListener("keydown", onEscape, keydownListenerOpts);
        };
    }
    else {
        actions.classList.remove("xp-profile-actions--popover");
        actions.style.top = "";
        actions.style.left = "";
        actions.style.width = "";
    }
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
    const viewProfileBtn = document.getElementById("xp-view-profile-btn");
    const dismissBtn = document.querySelector(".xp-profile-popover-dismiss");
    if (!addFriendBtn || !sendMessageBtn || !viewProfileBtn)
        return;
    if (dismissBtn) {
        dismissBtn.onclick = () => {
            hideXpProfileActions();
        };
    }
    addFriendBtn.onclick = async () => {
        if (!selectedXpUser)
            return;
        const added = await addFriendById(selectedXpUser.id);
        if (!added)
            return;
        await initFriends();
        await initProfile();
        alert(`${displayNameWithId(selectedXpUser.username, selectedXpUser.id)} ${t("friend-added-success")}`);
        hideXpProfileActions();
    };
    sendMessageBtn.onclick = async () => {
        if (!selectedXpUser)
            return;
        const content = window.prompt(`${t("message-prompt")} ${displayNameWithId(selectedXpUser.username, selectedXpUser.id)}`);
        if (!content || !content.trim())
            return;
        const sent = await sendChatMessage(selectedXpUser.id, content.trim());
        if (!sent)
            return;
        openChatWithUser(selectedXpUser.id);
        alert(t("message-sent-success"));
        hideXpProfileActions();
    };
    viewProfileBtn.onclick = () => {
        if (!selectedXpUser)
            return;
        openLeaderboardUserProfile(selectedXpUser.username);
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
    const eloTopProfile = document.getElementById("elo-top-profile");
    const eloTopProfileBtn = document.getElementById("elo-top-profile-btn");
    if (!leaderboardTable)
        return;
    hideXpProfileActions();
    if (eloTopProfile)
        eloTopProfile.hidden = true;
    if (cachedLeaderboardStats.length === 0) {
        leaderboardTable.innerHTML = `
          <tr>
            <td colspan="3" data-i18n="leaderboard-empty"></td>
          </tr>
        `;
        applyTranslations(leaderboardTable);
        renderLeaderboardPagination();
        return;
    }
    const rankingByElo = [...cachedLeaderboardStats]
        .sort((a, b) => (b.user.elo ?? 500) - (a.user.elo ?? 500));
    const totalPages = getTotalPages(rankingByElo.length);
    if (eloLeaderboardPage > totalPages - 1)
        eloLeaderboardPage = totalPages - 1;
    const pageEntries = paginateEntries(rankingByElo, eloLeaderboardPage);
    const topEloUser = rankingByElo[0].user;
    if (eloTopProfile && eloTopProfileBtn) {
        eloTopProfile.hidden = false;
        eloTopProfileBtn.textContent = displayNameWithId(topEloUser.username, topEloUser.id);
        eloTopProfileBtn.onclick = (e) => {
            renderXpProfileActions(topEloUser, e.currentTarget);
        };
    }
    leaderboardTable.innerHTML = pageEntries
        .map((entry) => `
          <tr>
            <td><button type="button" class="btn btn-sm btn-outline-light xp-profile-btn elo-row-profile" data-user-id="${entry.user.id}">${escapeHtml(displayNameWithId(entry.user.username, entry.user.id))}</button></td>
            <td>${entry.user.elo ?? 500}</td>
            <td>${t("chess")}</td>
          </tr>
        `)
        .join("");
    const userMap = new Map(pageEntries.map((entry) => [entry.user.id, entry.user]));
    leaderboardTable.querySelectorAll(".elo-row-profile").forEach((button) => {
        button.addEventListener("click", (e) => {
            const id = Number(button.dataset.userId);
            const user = userMap.get(id);
            if (user)
                renderXpProfileActions(user, e.currentTarget);
        });
    });
    renderLeaderboardPagination();
}
async function renderXpLeaderboard() {
    const xpTableBody = document.querySelector("#xp-leaderboard-table tbody");
    const topProfile = document.getElementById("xp-top-profile");
    const topProfileBtn = document.getElementById("xp-top-profile-btn");
    const xpActions = document.getElementById("xp-profile-actions");
    if (!xpTableBody || !topProfile || !topProfileBtn || !xpActions)
        return;
    hideXpProfileActions();
    topProfile.hidden = true;
    const stats = cachedLeaderboardStats;
    if (stats.length === 0) {
        xpTableBody.innerHTML = `<tr><td colspan="2" data-i18n="leaderboard-empty"></td></tr>`;
        applyTranslations(xpTableBody);
        renderLeaderboardPagination();
        return;
    }
    const ranking = stats
        .map((entry) => ({ user: entry.user, xp: entry.xp }))
        .sort((a, b) => b.xp - a.xp);
    if (ranking.length === 0) {
        xpTableBody.innerHTML = `<tr><td colspan="2" data-i18n="leaderboard-empty"></td></tr>`;
        applyTranslations(xpTableBody);
        renderLeaderboardPagination();
        return;
    }
    const topUser = ranking[0].user;
    topProfile.hidden = false;
    topProfileBtn.textContent = displayNameWithId(topUser.username, topUser.id);
    topProfileBtn.onclick = (e) => {
        renderXpProfileActions(topUser, e.currentTarget);
    };
    const totalPages = getTotalPages(ranking.length);
    if (xpLeaderboardPage > totalPages - 1)
        xpLeaderboardPage = totalPages - 1;
    const pageEntries = paginateEntries(ranking, xpLeaderboardPage);
    xpTableBody.innerHTML = pageEntries
        .map((entry) => `
            <tr>
                <td><button type="button" class="btn btn-sm btn-outline-light xp-profile-btn xp-row-profile" data-user-id="${entry.user.id}">${escapeHtml(displayNameWithId(entry.user.username, entry.user.id))}</button></td>
                <td>${entry.xp}</td>
            </tr>
        `)
        .join("");
    const userMap = new Map(ranking.map((entry) => [entry.user.id, entry.user]));
    xpTableBody.querySelectorAll(".xp-row-profile").forEach((button) => {
        button.addEventListener("click", (e) => {
            const id = Number(button.dataset.userId);
            const user = userMap.get(id);
            if (user)
                renderXpProfileActions(user, e.currentTarget);
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
    const protectedViews = new Set(["profile", "friends", "chat"]);
    function isAuthenticated() {
        return Boolean(getAuthToken());
    }
    function showGamesChoice() {
        void abandonOnlineChessIfNeeded();
        disposePongIfAny();
        if (gamesChoice)
            gamesChoice.hidden = false;
        if (gamesContent)
            gamesContent.hidden = true;
    }
    async function showSelectedGame(game) {
        if (game === "chess") {
            disposePongIfAny();
        }
        if (game === "pong") {
            await abandonOnlineChessIfNeeded();
        }
        if (gamesChoice)
            gamesChoice.hidden = true;
        if (gamesContent)
            gamesContent.hidden = false;
        if (chessContainer)
            chessContainer.hidden = game !== "chess";
        if (pongContainer)
            pongContainer.hidden = game !== "pong";
        if (game === "chess") {
            initChess();
        }
        if (game === "pong") {
            initPong();
        }
    }
    function setActiveView(target, profileFetchUsername) {
        if (protectedViews.has(target) && !isAuthenticated()) {
            alert(t("section-login-required"));
            target = "Login";
        }
        views.forEach((view) => {
            view.hidden = view.id !== `view-${target}`;
        });
        if (target !== "games") {
            void abandonOnlineChessIfNeeded();
        }
        document.body.classList.toggle("home", target === "home");
        buttons.forEach((b) => b.classList.remove("active"));
        const activeBtn = Array.from(buttons).find((b) => b.dataset.view === target);
        if (activeBtn)
            activeBtn.classList.add("active");
        if (target === "profile") {
            const u = profileFetchUsername?.trim();
            void initProfile(u ? { fetchUsername: u } : undefined);
        }
        if (target === "games")
            showGamesChoice();
    }
    window.addEventListener("app-open-profile", ((ev) => {
        const e = ev;
        const raw = e.detail?.username;
        if (typeof raw !== "string")
            return;
        const name = raw.trim();
        if (!name)
            return;
        profileUsernameOverride = name;
        setActiveView("profile", name);
    }));
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.view;
            if (target === "profile") {
                profileUsernameOverride = null;
            }
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
        void showSelectedGame("chess");
    });
    pongCard?.addEventListener("click", () => {
        setActiveView("games");
        void showSelectedGame("pong");
    });
    const gamesChessCard = document.getElementById("games-card-chess");
    const gamesPongCard = document.getElementById("games-card-pong");
    gamesChessCard?.addEventListener("click", () => {
        void showSelectedGame("chess");
    });
    gamesPongCard?.addEventListener("click", () => {
        void showSelectedGame("pong");
    });
}
async function initProfile(opts) {
    const seq = ++profileLoadSeq;
    const profileInfo = document.getElementById("profile-info");
    const avatarImg = document.getElementById("profile-avatar");
    if (!profileInfo)
        return;
    setProfileLogoutButtonVisible(false);
    const token = localStorage.getItem("token");
    if (!token) {
        currentProfileUserId = null;
        profileUsernameOverride = null;
        profileInfo.innerHTML = `<p>${t("profile-login-required")}</p>`;
        renderProfileXp(0);
        setProfileFriendsSectionVisible(true);
        if (avatarImg) {
            avatarImg.src = DEFAULT_PROFILE_AVATAR;
        }
        return;
    }
    const pathUsername = opts?.fetchUsername !== undefined && opts.fetchUsername.trim() !== ""
        ? opts.fetchUsername.trim()
        : profileUsernameOverride?.trim() ?? null;
    const profilePath = pathUsername !== null && pathUsername.length > 0
        ? `/users/lookup-username?username=${encodeURIComponent(pathUsername)}`
        : "/users/me";
    try {
        const profileHeaders = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        };
        const reponse = await fetch(buildApiUrl(profilePath), {
            method: "GET",
            headers: profileHeaders,
        });
        if (seq !== profileLoadSeq)
            return;
        if (!reponse.ok) {
            const fetchedOtherProfile = pathUsername !== null && pathUsername.length > 0;
            const notFoundMsg = reponse.status === 404 && fetchedOtherProfile
                ? t("profile-user-not-found")
                : t("profile-fetch-error");
            profileInfo.innerHTML = `<p>${notFoundMsg}</p>`;
            setProfileLogoutButtonVisible(false);
            setProfileFriendsSectionVisible(true);
            return;
        }
        const user = await reponse.json();
        if (seq !== profileLoadSeq)
            return;
        const displayUserId = user.id;
        currentProfileUserId = displayUserId;
        const meFromToken = getCurrentUserIdFromToken();
        const viewingOther = meFromToken !== null
            ? displayUserId !== meFromToken
            : pathUsername !== null && pathUsername.length > 0;
        setProfileLogoutButtonVisible(!viewingOther);
        const creationDateValue = user.createdAt ?? user.createdAT;
        const creationDateLabel = creationDateValue
            ? escapeHtml(new Date(creationDateValue).toLocaleDateString())
            : "N/A";
        profileInfo.innerHTML = `
        <p>${t("profile-username")}: ${escapeHtml(displayNameWithId(user.username, user.id))}</p>
        <p>${t("profile-email")}: ${escapeHtml(user.email)}</p>
        <p>${t("score")}: ${user.elo ?? 500}</p>
        <p>${t("profile-created-at")}: ${creationDateLabel}</p>
        <button id="profile-language-btn" type="button" class="btn btn-outline-light btn-sm">${t("profile-change-language")} (${t(`lang-${getLanguage()}`)})</button>
        ${viewingOther
            ? `<div class="d-flex flex-wrap gap-2 mt-2">
          <button type="button" id="profile-view-add-friend" class="btn btn-outline-light btn-sm">${t("add-friend-action")}</button>
          <button type="button" id="profile-view-send-message" class="btn btn-light btn-sm">${t("send-message-action")}</button>
        </div>`
            : ""}
      `;
        if (viewingOther) {
            document.getElementById("profile-view-add-friend")?.addEventListener("click", async () => {
                const added = await addFriendById(displayUserId);
                if (!added)
                    return;
                await initFriends();
                await initProfile();
                alert(`${displayNameWithId(user.username, user.id)} ${t("friend-added-success")}`);
            });
            document.getElementById("profile-view-send-message")?.addEventListener("click", async () => {
                const content = window.prompt(`${t("message-prompt")} ${displayNameWithId(user.username, user.id)}`);
                if (!content || !content.trim())
                    return;
                const sent = await sendChatMessage(displayUserId, content.trim());
                if (!sent)
                    return;
                openChatWithUser(displayUserId);
                alert(t("message-sent-success"));
            });
        }
        const profileLanguageBtn = document.getElementById("profile-language-btn");
        profileLanguageBtn?.addEventListener("click", () => {
            setLanguage(nextLanguage());
            refreshTranslations();
            void initProfile();
            void initFriends();
            void initLeaderboard();
            initGames();
        });
        if (avatarImg) {
            if (viewingOther) {
                avatarImg.src =
                    user.profile_picture && user.profile_picture.length > 0
                        ? user.profile_picture
                        : user.avatar && user.avatar.length > 0
                            ? user.avatar
                            : DEFAULT_PROFILE_AVATAR;
            }
            else {
                const customAvatar = getStoredProfileAvatar(displayUserId);
                avatarImg.src =
                    (customAvatar && customAvatar.length > 0)
                        ? customAvatar
                        : user.profile_picture && user.profile_picture.length > 0
                            ? user.profile_picture
                            : user.avatar && user.avatar.length > 0
                                ? user.avatar
                                : DEFAULT_PROFILE_AVATAR;
            }
        }
        const matches = await fetchUserMatches(displayUserId);
        if (seq !== profileLoadSeq)
            return;
        const users = await fetchUsers();
        if (seq !== profileLoadSeq)
            return;
        const usernamesById = new Map(users.map((entry) => [entry.id, entry.username]));
        const matchesList = document.getElementById("profile-matches");
        const totalXp = computeXpFromChessMatches(matches, displayUserId) + getStoredLocalChessXp(displayUserId);
        renderProfileXp(totalXp);
        setProfileFriendsSectionVisible(!viewingOther);
        if (viewingOther) {
            renderProfileFriends([]);
        }
        else {
            const profileFriends = await fetchFriends();
            if (seq !== profileLoadSeq)
                return;
            renderProfileFriends(profileFriends);
        }
        if (seq !== profileLoadSeq)
            return;
        if (matchesList) {
            if (matches.length === 0) {
                matchesList.innerHTML = `<li>${t("profile-no-matches")}</li>`;
            }
            else {
                const latestMatches = matches.slice(0, 10);
                matchesList.innerHTML = latestMatches
                    .map((m) => {
                    const date = new Date(m.createdAt).toLocaleString();
                    let result;
                    if (m.winnerID === null) {
                        result = t("profile-match-draw");
                    }
                    else if (m.winnerID === displayUserId) {
                        result = t("profile-match-win");
                    }
                    else {
                        result = t("profile-match-loss");
                    }
                    const adversaireId = m.player1ID === displayUserId ? m.player2ID : m.player1ID;
                    const advName = usernamesById.get(adversaireId);
                    const adversaireName = escapeHtml(advName !== undefined ? displayNameWithId(advName, adversaireId) : `#${adversaireId}`);
                    const eloDelta = m.winnerID === null ? 0 : (m.winnerID === displayUserId ? 10 : -10);
                    const formattedEloDelta = eloDelta > 0 ? `+${eloDelta}` : String(eloDelta);
                    return `<li>
                [${escapeHtml(m.game)}] ${result} ${t("profile-match-vs-player")} ${adversaireName}
                (${t("score")}: ${formattedEloDelta}) ${t("profile-match-on")} ${escapeHtml(date)}
              </li>`;
                })
                    .join("");
            }
        }
    }
    catch (error) {
        if (seq !== profileLoadSeq)
            return;
        profileInfo.innerHTML = `<p>${t("profile-fetch-error")}</p>`;
        setProfileLogoutButtonVisible(false);
        setProfileFriendsSectionVisible(true);
        renderProfileXp(0);
        if (avatarImg) {
            avatarImg.src = DEFAULT_PROFILE_AVATAR;
        }
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
        friendsList.innerHTML = friends
            .map((friend) => `<li class="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <span>${escapeHtml(displayNameWithId(friend.username, friend.id))} (${escapeHtml(friend.email)})</span>
            <div class="d-flex flex-wrap gap-1">
            <button type="button" data-friend-id="${friend.id}" class="btn btn-sm btn-light friend-msg-btn">${t("send-message-action")}</button>
            <button type="button" data-friend-id="${friend.id}" class="btn btn-sm btn-outline-light delete_friend">${t("delete")}</button>
            </div>
            </li>`)
            .join("");
        friendsList.querySelectorAll(".friend-msg-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = Number(btn.dataset.friendId);
                if (Number.isNaN(id))
                    return;
                openChatWithUser(id);
            });
        });
        friendsList.querySelectorAll('.delete_friend').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.friendId);
                await deleteFriend(id);
                friends = friends.filter((fr) => fr.id !== id);
                renderFriends();
                renderProfileFriends(friends);
                window.dispatchEvent(new CustomEvent("friends-updated"));
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
            .map((request) => `<li class="d-flex align-items-center justify-content-between gap-2 flex-wrap">${escapeHtml(displayNameWithId(request.username, request.id))} (${escapeHtml(request.email)})
              <button type="button" data-friend-id="${request.id}" class="btn btn-sm btn-light accept_friend">${t("friend-accept")}</button>
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
                window.dispatchEvent(new CustomEvent("friends-updated"));
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
            window.dispatchEvent(new CustomEvent("friends-updated"));
        };
    }
    window.dispatchEvent(new CustomEvent("friends-updated"));
}
function renderProfileFriends(friends) {
    const profileFriendsList = document.getElementById("friends_list");
    if (!profileFriendsList)
        return;
    profileFriendsList.innerHTML =
        friends.length === 0
            ? `<li>${t("friends-empty")}</li>`
            : friends.map((f) => `<li>${escapeHtml(displayNameWithId(f.username, f.id))} (${escapeHtml(f.email)})</li>`).join("");
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
                    .map((m) => {
                    const senderName = usernames.get(m.senderId);
                    const author = escapeHtml(senderName !== undefined
                        ? displayNameWithId(senderName, m.senderId)
                        : `#${m.senderId}`);
                    const body = escapeHtml(m.content);
                    const timeLabel = escapeHtml(new Date(m.createdAt ?? m.createdTimer ?? Date.now()).toLocaleTimeString());
                    return `
                <div class="message">
                  <strong>${author}</strong> : ${body}
                  <small>${timeLabel}</small>
                </div>
              `;
                })
                    .join("");
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    async function loadConversationById(otherId) {
        currentOtherUserId = otherId;
        await refreshUsernames();
        messages = await fetchChatMess(otherId);
        renderMessages();
    }
    async function pollActiveConversation() {
        if (document.visibilityState !== "visible")
            return;
        if (!getAuthToken())
            return;
        const viewChat = document.getElementById("view-chat");
        if (!viewChat || viewChat.hidden)
            return;
        if (currentOtherUserId === null)
            return;
        const next = await fetchChatMess(currentOtherUserId);
        if (messages.length > 0 && next.length === 0) {
            return;
        }
        if (chatMessagesFingerprint(next) === chatMessagesFingerprint(messages)) {
            return;
        }
        messages = next;
        renderMessages();
        void refreshConversationsList();
    }
    async function refreshConversationsList() {
        const currentUserId = getCurrentUserIdFromToken();
        if (!currentUserId) {
            chatConversationsRoot.innerHTML = `<p data-i18n="section-login-required"></p>`;
            applyTranslations(chatConversationsRoot);
            return;
        }
        await refreshUsernames();
        const friendsList = await fetchFriends();
        if (friendsList.length === 0) {
            chatConversationsRoot.innerHTML = `<p data-i18n="chat-no-friends-for-chat"></p>`;
            applyTranslations(chatConversationsRoot);
            return;
        }
        const enriched = await Promise.all(friendsList.map(async (f) => {
            const convMessages = await fetchChatMess(f.id);
            const lastMessage = convMessages[convMessages.length - 1];
            return { id: f.id, username: f.username, convMessages, lastMessage };
        }));
        enriched.sort((a, b) => {
            const aTime = a.lastMessage
                ? new Date(a.lastMessage.createdAt ?? a.lastMessage.createdTimer ?? 0).getTime()
                : 0;
            const bTime = b.lastMessage
                ? new Date(b.lastMessage.createdAt ?? b.lastMessage.createdTimer ?? 0).getTime()
                : 0;
            return bTime - aTime;
        });
        chatConversationsRoot.innerHTML = enriched
            .map((c) => {
            const previewHtml = c.lastMessage
                ? escapeHtml(c.lastMessage.content.length > 120
                    ? `${c.lastMessage.content.slice(0, 120)}…`
                    : c.lastMessage.content)
                : `<span class="text-white-50" data-i18n="chat-no-messages-yet"></span>`;
            return `
            <button type="button" class="btn chat-conversation-btn" data-user-id="${c.id}">
              <strong>${escapeHtml(displayNameWithId(c.username, c.id))}</strong>
              <div class="small text-start">${previewHtml}</div>
            </button>
          `;
        })
            .join("");
        applyTranslations(chatConversationsRoot);
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
    window.addEventListener("friends-updated", () => {
        void refreshConversationsList();
    });
    void refreshConversationsList();
    if (pendingChatTargetUserId) {
        void loadConversationById(pendingChatTargetUserId);
        pendingChatTargetUserId = null;
    }
    let lastConversationsRefreshAt = 0;
    const chatPollId = window.setInterval(() => {
        const viewChat = document.getElementById("view-chat");
        if (!viewChat || viewChat.hidden)
            return;
        void pollActiveConversation();
        const now = Date.now();
        if (now - lastConversationsRefreshAt >= CHAT_LIST_REFRESH_INTERVAL_MS) {
            lastConversationsRefreshAt = now;
            void refreshConversationsList();
        }
    }, CHAT_POLL_INTERVAL_MS);
    window.addEventListener("pagehide", () => {
        window.clearInterval(chatPollId);
    });
}
function initGames() {
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
function main() {
    persistOAuthToken();
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
    initProfileLogout();
    initProfileDeleteAccount();
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
    profileFriendsList.innerHTML =
        friends.length > 0
            ? friends.map((friend) => `<li>${escapeHtml(friend)}</li>`).join("")
            : `<li>${t("friends-empty")}</li>`;
}
function initSidebarToggle() {
    const toggle = document.getElementById('nav-toggle');
    if (!toggle)
        return;
    toggle.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
    });
}

import type { Friend, ChatMessage, Match } from "./init-types";
import { buildApiUrl } from "./api/api.js";
import { applyTranslations, getLanguage, initLanguage, nextLanguage, setLanguage, t } from "./i18n/index.js";
import { abandonOnlineChessIfNeeded, initChess } from "./chess/chess.js";
import { disposePongIfAny, initPong } from "./pong/GameEngine.js";
type UserSummary = {
    id: number;
    username: string;
    email: string;
    elo?: number;
};

type XpLeaderboardEntry = {
    user: UserSummary;
    xp: number;
};

type UserLeaderboardStats = {
    user: UserSummary;
    wins: number;
    xp: number;
};

function getAuthToken(): string | null {
    return localStorage.getItem("token");
}

const DEFAULT_PROFILE_AVATAR = "./image/default_profile_picture.png";
const LEADERBOARD_PAGE_SIZE = 10;
let currentProfileUserId: number | null = null;
let profileAvatarPickerBound = false;
let selectedXpUser: UserSummary | null = null;
let pendingChatTargetUserId: number | null = null;
let cachedLeaderboardStats: UserLeaderboardStats[] = [];
let eloLeaderboardPage = 0;
let xpLeaderboardPage = 0;
let disposeXpProfilePopover: (() => void) | null = null;
let profileUsernameOverride: string | null = null;
let profileLoadSeq = 0;

function refreshTranslations(): void {
    applyTranslations();
}

function setProfileLogoutButtonVisible(visible: boolean): void {
    const btn = document.getElementById("profile-logout-btn") as HTMLButtonElement | null;
    if (btn) btn.hidden = !visible;
}

function setProfileFriendsSectionVisible(visible: boolean): void {
    const friendsList = document.getElementById("friends_list");
    const friendHeading = friendsList?.previousElementSibling as HTMLElement | undefined;
    if (friendHeading?.tagName === "H3") friendHeading.hidden = !visible;
    if (friendsList) friendsList.hidden = !visible;
}

function openLeaderboardUserProfile(username: string): void {
    const name = username.trim();
    if (!name) return;
    hideXpProfileActions();
    window.dispatchEvent(new CustomEvent("app-open-profile", { detail: { username: name } }));
}
function initProfileLogout(): void {
    const btn = document.getElementById("profile-logout-btn") as HTMLButtonElement | null;
    if (!btn || btn.dataset.logoutBound === "1") return;
    btn.dataset.logoutBound = "1";
    btn.addEventListener("click", async () => {
        localStorage.removeItem("token");
        profileUsernameOverride = null;
        await abandonOnlineChessIfNeeded();
        disposePongIfAny();
        setProfileLogoutButtonVisible(false);
        document.querySelector<HTMLButtonElement>('nav button[data-view="home"]')?.click();
        refreshTranslations();
        void initProfile();
        void initLeaderboard();
        void initFriends();
    });
}

function getStoredProfileAvatar(userId: number): string | null {
    return localStorage.getItem(`profile-avatar-${userId}`);
}

function setStoredProfileAvatar(userId: number, avatarDataUrl: string): void {
    localStorage.setItem(`profile-avatar-${userId}`, avatarDataUrl);
}

function getStoredLocalChessXp(userId: number): number {
    const rawValue = localStorage.getItem(`chess-local-xp-${userId}`);
    const value = rawValue ? Number(rawValue) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function decodeJwtPayloadJson(token: string): Record<string, unknown> | null {
    const payload = token.split(".")[1];
    if (!payload) return null;
    try {
        let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const pad = base64.length % 4;
        if (pad) base64 += "=".repeat(4 - pad);
        return JSON.parse(atob(base64)) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function getCurrentUserIdFromToken(): number | null {
    const token = getAuthToken();
    if (!token) return null;
    const parsed = decodeJwtPayloadJson(token);
    if (!parsed) return null;
    const id = Number(parsed.id);
    return Number.isFinite(id) && id > 0 ? id : null;
}
function computeXpFromChessMatches(matches: Match[], currentUserId: number): number {
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

function getXpProgress(totalXp: number): { level: number; xpInLevel: number; xpRequired: number; percent: number } {
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

function renderProfileXp(totalXp: number): void {
    const xpMeta = document.getElementById("profile-xp-meta");
    const xpFill = document.getElementById("profile-xp-fill") as HTMLDivElement | null;
    if (!xpMeta || !xpFill) return;

    const progress = getXpProgress(totalXp);
    xpMeta.textContent = `Niveau ${progress.level} - ${progress.xpInLevel} / ${progress.xpRequired} XP`;
    xpFill.style.width = `${progress.percent}%`;
}

function initProfileAvatarPicker(): void {
    if (profileAvatarPickerBound) return;

    const avatarImg = document.getElementById("profile-avatar") as HTMLImageElement | null;
    const avatarInput = document.getElementById("profile-avatar-input") as HTMLInputElement | null;
    if (!avatarImg || !avatarInput) return;

    avatarImg.addEventListener("click", () => {
        if (!getAuthToken()) {
            alert(t("avatar-login-required"));
            return;
        }
        if (profileUsernameOverride !== null) {return;}
        avatarInput.click();
    });

    avatarInput.addEventListener("change", () => {
        const file = avatarInput.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert(t("avatar-select-image"));
            avatarInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const imageDataUrl = typeof reader.result === "string" ? reader.result : null;
            if (!imageDataUrl) return;

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
  
async function fetchUserMatches(userId: number): Promise<Match[]> {
    const token = getAuthToken();
    if (!token) return [];
  
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

async function fetchFriends(): Promise<Friend[]> {
  const token = getAuthToken();
  if (!token) return [];

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

async function fetchIncomingFriendRequests(): Promise<Friend[]> {
  const token = getAuthToken();
  if (!token) return [];

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

async function fetchChatMess(userId: number): Promise<ChatMessage[]> {
    const token = getAuthToken();
    if (!token) return [];

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

async function sendChatMessage(userId: number, content: string): Promise<boolean> {
    const token  = getAuthToken();
    if (!token) return false;

    const res = await fetch(buildApiUrl(`/messages/${userId}`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({content}),
    });
    if (!res.ok) {
        console.error("Erreur sendChatMessage", res.status);
        return false;
    }
    return true;
}

async function addFriendById(friendId: number): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

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

async function deleteFriend(friendId: number): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

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

async function acceptFriendRequestById(friendId: number): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

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

async function podMatch(pload: {
    game: string;
    player1ID: number;
    player2ID: number;
    winnerID: number | null;
    scoreP1: number | null;
    scoreP2: number | null;
}): Promise<void> {
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
    } else {
        alert(t("match-submit-success"));
    }
}

async function fetchUsers(): Promise<UserSummary[]> {
    const res = await fetch(buildApiUrl("/users"));
    if (!res.ok) {
        console.error("Erreur fetch users", res.status);
        return [];
    }
    return res.json();
}

async function fetchUserLeaderboardStats(): Promise<UserLeaderboardStats[]> {
    const users = await fetchUsers();
    if (users.length === 0) return [];

    const stats = await Promise.all(users.map(async (user) => {
        const matches = await fetchUserMatches(user.id);
        const wins = matches.filter((match) => match.game.toLowerCase() === "chess" && match.winnerID === user.id).length;
        const remoteXp = computeXpFromChessMatches(matches, user.id);
        const localXp = getStoredLocalChessXp(user.id);
        return {
            user,
            wins,
            xp: remoteXp + localXp,
        } satisfies UserLeaderboardStats;
    }));
    return stats;
}

function disposeXpProfilePopoverListeners(): void {
    disposeXpProfilePopover?.();
    disposeXpProfilePopover = null;
}

function hideXpProfileActions(): void {
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

function positionXpProfilePopover(trigger: HTMLElement, panel: HTMLElement): void {
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

function renderXpProfileActions(user: UserSummary, trigger?: HTMLElement): void {
    disposeXpProfilePopoverListeners();
    selectedXpUser = user;
    const actions = document.getElementById("xp-profile-actions");
    const selectedUser = document.getElementById("xp-selected-user");
    if (!actions || !selectedUser) return;

    selectedUser.textContent = `${t("xp-selected-player")}: ${user.username}`;
    actions.hidden = false;
    applyTranslations(actions);

    const usePopover = trigger !== undefined;

    if (usePopover && trigger) {
        actions.classList.add("xp-profile-actions--popover");
        const reposition = (): void => {
            positionXpProfilePopover(trigger, actions);
        };
        requestAnimationFrame(() => {
            requestAnimationFrame(reposition);
        });
        const onScrollOrResize = (): void => {
            reposition();
        };
        window.addEventListener("resize", onScrollOrResize);
        window.addEventListener("scroll", onScrollOrResize, true);
        const onEscape = (e: KeyboardEvent): void => {
            if (e.key === "Escape") hideXpProfileActions();
        };
        document.addEventListener("keydown", onEscape);
        const onPointerDown = (e: PointerEvent): void => {
            const target = e.target as Node;
            if (actions.contains(target) || trigger.contains(target)) return;
            hideXpProfileActions();
        };
        let pointerDownAttached = false;
        const pointerTimeout = window.setTimeout(() => {
            document.addEventListener("pointerdown", onPointerDown, true);
            pointerDownAttached = true;
        }, 0);
        disposeXpProfilePopover = (): void => {
            window.clearTimeout(pointerTimeout);
            if (pointerDownAttached) {
                document.removeEventListener("pointerdown", onPointerDown, true);
            }
            window.removeEventListener("resize", onScrollOrResize);
            window.removeEventListener("scroll", onScrollOrResize, true);
            document.removeEventListener("keydown", onEscape);
        };
    } else {
        actions.classList.remove("xp-profile-actions--popover");
        actions.style.top = "";
        actions.style.left = "";
        actions.style.width = "";
    }
}

function openChatWithUser(userId: number): void {
    pendingChatTargetUserId = userId;
    const chatNavButton = document.querySelector<HTMLButtonElement>('nav button[data-view="chat"]');
    chatNavButton?.click();
    window.dispatchEvent(new CustomEvent("chat-open-user", { detail: { userId } }));
}

function bindXpProfileActionButtons(): void {
    const addFriendBtn = document.getElementById("xp-add-friend-btn") as HTMLButtonElement | null;
    const sendMessageBtn = document.getElementById("xp-send-message-btn") as HTMLButtonElement | null;
    const viewProfileBtn = document.getElementById("xp-view-profile-btn") as HTMLButtonElement | null;
    const dismissBtn = document.querySelector(".xp-profile-popover-dismiss") as HTMLButtonElement | null;
    if (!addFriendBtn || !sendMessageBtn || !viewProfileBtn) return;

    if (dismissBtn) {
        dismissBtn.onclick = () => {
            hideXpProfileActions();
        };
    }

    addFriendBtn.onclick = async () => {
        if (!selectedXpUser) return;
        const added = await addFriendById(selectedXpUser.id);
        if (!added) return;
        await initFriends();
        await initProfile();
        alert(`${selectedXpUser.username} ${t("friend-added-success")}`);
        hideXpProfileActions();
    };

    sendMessageBtn.onclick = async () => {
        if (!selectedXpUser) return;
        const content = window.prompt(`${t("message-prompt")} ${selectedXpUser.username}`);
        if (!content || !content.trim()) return;
        const sent = await sendChatMessage(selectedXpUser.id, content.trim());
        if (!sent) return;
        openChatWithUser(selectedXpUser.id);
        alert(t("message-sent-success"));
        hideXpProfileActions();
    };
    viewProfileBtn.onclick = () => {
        if (!selectedXpUser) return;
        openLeaderboardUserProfile(selectedXpUser.username);
    };
}

function getTotalPages(totalEntries: number): number {
    return Math.max(1, Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE));
}

function paginateEntries<T>(entries: T[], page: number): T[] {
    const start = page * LEADERBOARD_PAGE_SIZE;
    return entries.slice(start, start + LEADERBOARD_PAGE_SIZE);
}

function renderLeaderboardPagination(): void {
    const eloPrevBtn = document.getElementById("elo-prev-btn") as HTMLButtonElement | null;
    const eloNextBtn = document.getElementById("elo-next-btn") as HTMLButtonElement | null;
    const eloPageInfo = document.getElementById("elo-page-info");
    const xpPrevBtn = document.getElementById("xp-prev-btn") as HTMLButtonElement | null;
    const xpNextBtn = document.getElementById("xp-next-btn") as HTMLButtonElement | null;
    const xpPageInfo = document.getElementById("xp-page-info");

    const totalPages = getTotalPages(cachedLeaderboardStats.length);
    if (eloPageInfo) eloPageInfo.textContent = `${eloLeaderboardPage + 1} / ${totalPages}`;
    if (xpPageInfo) xpPageInfo.textContent = `${xpLeaderboardPage + 1} / ${totalPages}`;

    if (eloPrevBtn) eloPrevBtn.disabled = eloLeaderboardPage <= 0;
    if (eloNextBtn) eloNextBtn.disabled = eloLeaderboardPage >= totalPages - 1;
    if (xpPrevBtn) xpPrevBtn.disabled = xpLeaderboardPage <= 0;
    if (xpNextBtn) xpNextBtn.disabled = xpLeaderboardPage >= totalPages - 1;
}

function bindLeaderboardPaginationButtons(): void {
    const eloPrevBtn = document.getElementById("elo-prev-btn") as HTMLButtonElement | null;
    const eloNextBtn = document.getElementById("elo-next-btn") as HTMLButtonElement | null;
    const xpPrevBtn = document.getElementById("xp-prev-btn") as HTMLButtonElement | null;
    const xpNextBtn = document.getElementById("xp-next-btn") as HTMLButtonElement | null;

    eloPrevBtn!.onclick = () => {
        if (eloLeaderboardPage <= 0) return;
        eloLeaderboardPage -= 1;
        renderEloLeaderboard();
    };
    eloNextBtn!.onclick = () => {
        const totalPages = getTotalPages(cachedLeaderboardStats.length);
        if (eloLeaderboardPage >= totalPages - 1) return;
        eloLeaderboardPage += 1;
        renderEloLeaderboard();
    };
    xpPrevBtn!.onclick = () => {
        if (xpLeaderboardPage <= 0) return;
        xpLeaderboardPage -= 1;
        void renderXpLeaderboard();
    };
    xpNextBtn!.onclick = () => {
        const totalPages = getTotalPages(cachedLeaderboardStats.length);
        if (xpLeaderboardPage >= totalPages - 1) return;
        xpLeaderboardPage += 1;
        void renderXpLeaderboard();
    };
}

function renderEloLeaderboard(): void {
    const leaderboardTable = document.querySelector("#leaderboard-table tbody");
    const eloTopProfile = document.getElementById("elo-top-profile");
    const eloTopProfileBtn = document.getElementById("elo-top-profile-btn") as HTMLButtonElement | null;
    if (!leaderboardTable) return;

    hideXpProfileActions();
    if (eloTopProfile) eloTopProfile.hidden = true;

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
    if (eloLeaderboardPage > totalPages - 1) eloLeaderboardPage = totalPages - 1;
    const pageEntries = paginateEntries(rankingByElo, eloLeaderboardPage);

    const topEloUser = rankingByElo[0].user;
    if (eloTopProfile && eloTopProfileBtn) {
        eloTopProfile.hidden = false;
        eloTopProfileBtn.textContent = topEloUser.username;
        eloTopProfileBtn.onclick = (e) => {
            renderXpProfileActions(topEloUser, e.currentTarget as HTMLButtonElement);
        };
    }

    leaderboardTable.innerHTML = pageEntries
        .map((entry) => `
          <tr>
            <td><button type="button" class="btn btn-sm btn-outline-light xp-profile-btn elo-row-profile" data-user-id="${entry.user.id}">${entry.user.username}</button></td>
            <td>${entry.user.elo ?? 500}</td>
            <td>${t("chess")}</td>
          </tr>
        `)
        .join("");

    const userMap = new Map<number, UserSummary>(pageEntries.map((entry) => [entry.user.id, entry.user]));
    leaderboardTable.querySelectorAll<HTMLButtonElement>(".elo-row-profile").forEach((button) => {
        button.addEventListener("click", (e) => {
            const id = Number(button.dataset.userId);
            const user = userMap.get(id);
            if (user) renderXpProfileActions(user, e.currentTarget as HTMLButtonElement);
        });
    });

    renderLeaderboardPagination();
}

async function renderXpLeaderboard(): Promise<void> {
    const xpTableBody = document.querySelector("#xp-leaderboard-table tbody");
    const topProfile = document.getElementById("xp-top-profile");
    const topProfileBtn = document.getElementById("xp-top-profile-btn") as HTMLButtonElement | null;
    const xpActions = document.getElementById("xp-profile-actions");
    if (!xpTableBody || !topProfile || !topProfileBtn || !xpActions) return;

    hideXpProfileActions();
    topProfile.hidden = true;

    const stats = cachedLeaderboardStats;
    if (stats.length === 0) {
        xpTableBody.innerHTML = `<tr><td colspan="2">${t("leaderboard-empty")}</td></tr>`;
        renderLeaderboardPagination();
        return;
    }

    const ranking: XpLeaderboardEntry[] = stats
        .map((entry) => ({ user: entry.user, xp: entry.xp }))
        .sort((a, b) => b.xp - a.xp);

    if (ranking.length === 0) {
        xpTableBody.innerHTML = `<tr><td colspan="2">${t("leaderboard-empty")}</td></tr>`;
        renderLeaderboardPagination();
        return;
    }

    const topUser = ranking[0].user;
    topProfile.hidden = false;
    topProfileBtn.textContent = topUser.username;
    topProfileBtn.onclick = (e) => {
        renderXpProfileActions(topUser, e.currentTarget as HTMLButtonElement);
    };

    const totalPages = getTotalPages(ranking.length);
    if (xpLeaderboardPage > totalPages - 1) xpLeaderboardPage = totalPages - 1;
    const pageEntries = paginateEntries(ranking, xpLeaderboardPage);

    xpTableBody.innerHTML = pageEntries
        .map((entry) => `
            <tr>
                <td><button type="button" class="btn btn-sm btn-outline-light xp-profile-btn xp-row-profile" data-user-id="${entry.user.id}">${entry.user.username}</button></td>
                <td>${entry.xp}</td>
            </tr>
        `)
        .join("");

    const userMap = new Map<number, UserSummary>(ranking.map((entry) => [entry.user.id, entry.user]));
    xpTableBody.querySelectorAll<HTMLButtonElement>(".xp-row-profile").forEach((button) => {
        button.addEventListener("click", (e) => {
            const id = Number(button.dataset.userId);
            const user = userMap.get(id);
            if (user) renderXpProfileActions(user, e.currentTarget as HTMLButtonElement);
        });
    });

    renderLeaderboardPagination();
}

function initViewSwitching(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('nav button');
    const views = document.querySelectorAll<HTMLElement>('.view');
    const gamesChoice = document.getElementById("games-choice");
    const gamesContent = document.getElementById("games-content");
    const chessContainer = document.getElementById("chess-container");
    const pongContainer = document.getElementById("pong-container");
    const protectedViews = new Set(["profile", "friends", "chat"]);

    function isAuthenticated(): boolean {
        return Boolean(getAuthToken());
    }

    function showGamesChoice(): void {
        void abandonOnlineChessIfNeeded();
        disposePongIfAny();
        if (gamesChoice) gamesChoice.hidden = false;
        if (gamesContent) gamesContent.hidden = true;
    }
    async function showSelectedGame(game: "chess" | "pong"): Promise<void> {
        if (game === "chess") {
            disposePongIfAny();
        }
        if (game === "pong") {
            await abandonOnlineChessIfNeeded();
        }
        if (gamesChoice) gamesChoice.hidden = true;
        if (gamesContent) gamesContent.hidden = false;
        if (chessContainer) chessContainer.hidden = game !== "chess";
        if (pongContainer) pongContainer.hidden = game !== "pong";

        if (game === "chess") {
            initChess();
        }
        if (game === "pong") {
            initPong();
        }
    }

    function setActiveView(target: string, profileFetchUsername?: string): void {
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
        if (activeBtn) activeBtn.classList.add("active");

        if (target === "profile") {
            const u = profileFetchUsername?.trim();
            void initProfile(u ? { fetchUsername: u } : undefined);
        }
        if (target === "games") showGamesChoice();
    }

    window.addEventListener("app-open-profile", ((ev: Event) => {
        const e = ev as CustomEvent<{ username?: string }>;
        const raw = e.detail?.username;
        if (typeof raw !== "string") return;
        const name = raw.trim();
        if (!name) return;
        profileUsernameOverride = name;
        setActiveView("profile", name);
    }) as EventListener);

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

async function initProfile(opts?: { fetchUsername?: string }): Promise<void> {
    const seq = ++profileLoadSeq;
    const profileInfo = document.getElementById("profile-info");
    const avatarImg = document.getElementById("profile-avatar") as HTMLImageElement | null;
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

    const pathUsername =
        opts?.fetchUsername !== undefined && opts.fetchUsername.trim() !== ""
            ? opts.fetchUsername.trim()
            : profileUsernameOverride?.trim() ?? null;
    const profilePath =
        pathUsername !== null && pathUsername.length > 0
            ? `/users/lookup-username?username=${encodeURIComponent(pathUsername)}`
            : "/users/me";
    try {
      const profileHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      } as const;

      const reponse = await fetch(buildApiUrl(profilePath), {
        method: "GET",
        headers: profileHeaders,
      });
      if (seq !== profileLoadSeq) return;
  
      if (!reponse.ok) {
        const fetchedOtherProfile =
          pathUsername !== null && pathUsername.length > 0;
        const notFoundMsg =
          reponse.status === 404 && fetchedOtherProfile
            ? t("profile-user-not-found")
            : t("profile-fetch-error");
        profileInfo.innerHTML = `<p>${notFoundMsg}</p>`;
        setProfileLogoutButtonVisible(false);
        setProfileFriendsSectionVisible(true);
        return;
      }
  
      const user = await reponse.json() as {
        id: number;
        username: string;
        email: string;
        elo?: number;
        createdAt?: string;
        createdAT?: string;
        avatar?: string;
        profile_picture?: string;
      };
      if (seq !== profileLoadSeq) return;
      const displayUserId = user.id;
      currentProfileUserId = displayUserId;
      const meFromToken = getCurrentUserIdFromToken();
      const viewingOther =
        meFromToken !== null
          ? displayUserId !== meFromToken
          : pathUsername !== null && pathUsername.length > 0;
      setProfileLogoutButtonVisible(!viewingOther);

      const creationDateValue = user.createdAt ?? user.createdAT;
      profileInfo.innerHTML = `
        <p>${t("profile-username")}: ${user.username}</p>
        <p>${t("profile-email")}: ${user.email}</p>
        <p>${t("score")}: ${user.elo ?? 500}</p>
        <p>${t("profile-created-at")}: ${
          creationDateValue ? new Date(creationDateValue).toLocaleDateString() : "N/A"
        }</p>
        <button id="profile-language-btn" type="button" class="btn btn-outline-light btn-sm">${t("profile-change-language")} (${t(`lang-${getLanguage()}`)})</button>
        ${
          viewingOther
            ? `<div class="d-flex flex-wrap gap-2 mt-2">
          <button type="button" id="profile-view-add-friend" class="btn btn-outline-light btn-sm">${t("add-friend-action")}</button>
          <button type="button" id="profile-view-send-message" class="btn btn-light btn-sm">${t("send-message-action")}</button>
        </div>`
            : ""
        }
      `;

      if (viewingOther) {
        document.getElementById("profile-view-add-friend")?.addEventListener("click", async () => {
          const added = await addFriendById(displayUserId);
          if (!added) return;
          await initFriends();
          await initProfile();
          alert(`${user.username} ${t("friend-added-success")}`);
        });
        document.getElementById("profile-view-send-message")?.addEventListener("click", async () => {
          const content = window.prompt(`${t("message-prompt")} ${user.username}`);
          if (!content || !content.trim()) return;
          const sent = await sendChatMessage(displayUserId, content.trim());
          if (!sent) return;
          openChatWithUser(displayUserId);
          alert(t("message-sent-success"));
        });
      }
      const profileLanguageBtn = document.getElementById("profile-language-btn") as HTMLButtonElement | null;
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
        } else {
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
      if (seq !== profileLoadSeq) return;
      const users = await fetchUsers();
      if (seq !== profileLoadSeq) return;
      const usernamesById = new Map<number, string>(users.map((entry) => [entry.id, entry.username]));
      const matchesList = document.getElementById("profile-matches");
      const totalXp = computeXpFromChessMatches(matches, displayUserId) + getStoredLocalChessXp(displayUserId);
      renderProfileXp(totalXp);
      setProfileFriendsSectionVisible(!viewingOther);
      if (viewingOther) {
        renderProfileFriends([]);
      } else {
        const profileFriends = await fetchFriends();
        if (seq !== profileLoadSeq) return;
        renderProfileFriends(profileFriends);
      }
  
      if (seq !== profileLoadSeq) return;
      if (matchesList) {
        if (matches.length === 0) {
          matchesList.innerHTML = `<li>${t("profile-no-matches")}</li>`;
        } else {
          const latestMatches = matches.slice(0, 10);
          matchesList.innerHTML = latestMatches
            .map((m) => {
              const date = new Date(m.createdAt).toLocaleString();
              let result: string;
  
              if (m.winnerID === null) {
                result = t("profile-match-draw");
              } else if (m.winnerID === displayUserId) {
                result = t("profile-match-win");
              } else {
                result = t("profile-match-loss");
              }
  
              const adversaireId =
                m.player1ID === displayUserId ? m.player2ID : m.player1ID;
              const adversaireName = usernamesById.get(adversaireId) ?? `#${adversaireId}`;
              const eloDelta = m.winnerID === null ? 0 : (m.winnerID === displayUserId ? 10 : -10);
              const formattedEloDelta = eloDelta > 0 ? `+${eloDelta}` : String(eloDelta);
  
              return `<li>
                [${m.game}] ${result} ${t("profile-match-vs-player")} ${adversaireName}
                (${t("score")}: ${formattedEloDelta}) ${t("profile-match-on")} ${date}
              </li>`;
            })
            .join("");
        }
      }
    } catch (error) {
      if (seq !== profileLoadSeq) return;
      profileInfo.innerHTML = `<p>${t("profile-fetch-error")}</p>`;
      setProfileLogoutButtonVisible(false);
      setProfileFriendsSectionVisible(true);
      renderProfileXp(0);
      if (avatarImg) {
        avatarImg.src = DEFAULT_PROFILE_AVATAR;
      }
      console.error("Erreur de récupération du profil:", error);
    }
}

async function initFriends(): Promise<void> {
    const friendsList = document.getElementById("friends-list") as HTMLElement | null;
    const requestsList = document.getElementById("friend-requests-list") as HTMLElement | null;
    const addFriendForm = document.getElementById('add-friend-form') as HTMLFormElement | null;
    const addFriendInput = document.getElementById('friend-name') as HTMLInputElement | null;

    if (!friendsList) 
        return;
    let friends: Friend[] = [];
    let requests: Friend[] = [];

    function renderFriends(): void {
        if (friends.length === 0) {
            friendsList!.innerHTML = `<li>${t("friends-empty")}</li>`;
            return;
        }
        friendsList!.innerHTML = friends.map((friend) => `<li class="d-flex align-items-center justify-content-between gap-2 flex-wrap">${friend.username} (${friend.email})
            <button type="button" data-friend-id="${friend.id}" class="btn btn-sm btn-outline-light delete_friend">${t("delete")}</button>
            </li>`).join("");

        friendsList!.querySelectorAll<HTMLButtonElement>('.delete_friend').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.friendId);
                await deleteFriend(id);
                friends = friends.filter((fr) => fr.id !== id);
                renderFriends();
                renderProfileFriends(friends);
            });
        });
    }

    function renderRequests(): void {
        if (!requestsList) return;

        if (requests.length === 0) {
            requestsList.innerHTML = `<li>${t("friend-requests-empty")}</li>`;
            return;
        }

        requestsList.innerHTML = requests
            .map((request) => `<li class="d-flex align-items-center justify-content-between gap-2 flex-wrap">${request.username} (${request.email})
              <button type="button" data-friend-id="${request.id}" class="btn btn-sm btn-light accept_friend">${t("friend-accept")}</button>
            </li>`)
            .join("");

        requestsList.querySelectorAll<HTMLButtonElement>(".accept_friend").forEach((button) => {
            button.addEventListener("click", async () => {
                const id = Number(button.dataset.friendId);
                if (Number.isNaN(id)) return;

                const accepted = await acceptFriendRequestById(id);
                if (!accepted) return;

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
            if (!value) return;

            const friendId = Number(value);
            if (Number.isNaN(friendId)) {
                alert(t("friend-id-invalid"));
                return;
            }

            const added = await addFriendById(friendId);
            if (!added) return;
            friends = await fetchFriends();
            requests = await fetchIncomingFriendRequests();
            renderFriends();
            renderRequests();
            renderProfileFriends(friends);
            addFriendInput.value = "";
        };
    }
}

function renderProfileFriends(friends: Friend[]): void {
    const profileFriendsList = document.getElementById("friends_list");
    if (!profileFriendsList) return;
  
    profileFriendsList.innerHTML =
      friends.length === 0
        ? `<li>${t("friends-empty")}</li>`
        : friends.map((f) => `<li>${f.username} (${f.email})</li>`).join("");
  }

  function initChat(): void {
    const messagesContainer = document.getElementById("chat-messages");
    const conversationsContainer = document.getElementById("chat-conversations");
    const chatForm = document.getElementById("chat-form") as HTMLFormElement | null;
    const chatInput = document.getElementById("chat-input") as HTMLInputElement | null;
  
    if (!messagesContainer || !conversationsContainer || !chatForm || !chatInput) {
      return;
    }
    const chatConversationsRoot = conversationsContainer;
  
    let currentOtherUserId: number | null = null;
    let messages: ChatMessage[] = [];
    let usernames = new Map<number, string>();

    async function refreshUsernames(): Promise<void> {
      const users = await fetchUsers();
      usernames = new Map(users.map((user) => [user.id, user.username]));
    }

    function renderMessages(): void {
      messagesContainer!.innerHTML =
        messages.length === 0
          ? `<p>${t("chat-empty")}</p>`
          : messages
              .map(
                (m) => `
                <div class="message">
                  <strong>${usernames.get(m.senderId) ?? `#${m.senderId}`}</strong> : ${m.content}
                  <small>${new Date(m.createdAt ?? m.createdTimer ?? Date.now()).toLocaleTimeString()}</small>
                </div>
              `
              )
              .join("");
  
      messagesContainer!.scrollTop = messagesContainer!.scrollHeight;
    }

    async function loadConversationById(otherId: number): Promise<void> {
      currentOtherUserId = otherId;
      await refreshUsernames();
      messages = await fetchChatMess(otherId);
      renderMessages();
    }

    async function refreshConversationsList(): Promise<void> {
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
            <button type="button" class="btn chat-conversation-btn" data-user-id="${conversation.id}">
              <strong>${conversation.username}</strong>
              <div>${preview}</div>
            </button>
          `;
        })
        .join("");

      chatConversationsRoot.querySelectorAll<HTMLButtonElement>(".chat-conversation-btn").forEach((button) => {
        button.addEventListener("click", () => {
          const id = Number(button.dataset.userId);
          if (Number.isNaN(id)) return;
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
      if (!content) return;
  
      const sent = await sendChatMessage(currentOtherUserId, content);
      if (!sent) return;
      await loadConversationById(currentOtherUserId);
      await refreshConversationsList();
      chatInput.value = "";
    });

    window.addEventListener("chat-open-user", (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: number }>;
      const userId = Number(customEvent.detail?.userId);
      if (!Number.isFinite(userId) || userId <= 0) return;
      void loadConversationById(userId);
    });

    void refreshConversationsList();
    if (pendingChatTargetUserId) {
      void loadConversationById(pendingChatTargetUserId);
      pendingChatTargetUserId = null;
    }
  }

function initGames(): void {
   initChess();
}

async function initLeaderboard(): Promise<void> {
    const leaderboardTable = document.querySelector("#leaderboard-table tbody");
    if (!leaderboardTable) return;
    bindXpProfileActionButtons();
    bindLeaderboardPaginationButtons();

    const statsByUser = await fetchUserLeaderboardStats();
    cachedLeaderboardStats = statsByUser;
    const totalPages = getTotalPages(cachedLeaderboardStats.length);
    if (eloLeaderboardPage > totalPages - 1) eloLeaderboardPage = totalPages - 1;
    if (xpLeaderboardPage > totalPages - 1) xpLeaderboardPage = totalPages - 1;
    renderEloLeaderboard();
    await renderXpLeaderboard();
}

function main(): void {
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

    profileFriendsList.innerHTML =
      friends.length > 0
        ? friends.map((friend) => `<li>${friend}</li>`).join("")
        : `<li>${t("friends-empty")}</li>`;
}

function initSidebarToggle(): void {
    const toggle = document.getElementById('nav-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
    });
}

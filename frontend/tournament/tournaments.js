import { buildApiUrl } from "../api/api.js";
import { applyTranslations, t } from "../i18n/index.js";
function getAuthToken() {
    return localStorage.getItem("token");
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
async function api(path, init = {}) {
    const headers = new Headers(init.headers);
    const tok = getAuthToken();
    if (tok)
        headers.set("Authorization", `Bearer ${tok}`);
    if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    return fetch(buildApiUrl(path), { ...init, headers });
}
function alertApiError(res, body) {
    const err = body;
    const key = typeof err.error === "string" ? err.error : "tournament-error-generic";
    alert(t(key));
}
let selectedTournamentId = null;
function phaseLabel(round, capacity) {
    const numRounds = Math.round(Math.log2(capacity));
    if (capacity === 8) {
        const keys = ["tournament-phase-qf", "tournament-phase-sf", "tournament-phase-f"];
        return t(keys[round] ?? "tournament-phase-generic");
    }
    if (capacity === 4) {
        const keys = ["tournament-phase-sf", "tournament-phase-f"];
        return t(keys[round] ?? "tournament-phase-generic");
    }
    return `${t("tournament-phase-generic")} ${round + 1}/${numRounds}`;
}
function userNameMap(participants) {
    const m = new Map();
    for (const p of participants) {
        m.set(p.userId, p.user?.username ?? `#${p.userId}`);
    }
    return m;
}
function nameOrId(id, names) {
    if (id === null)
        return "—";
    return names.get(id) ?? `#${id}`;
}
async function loadList() {
    const root = document.getElementById("tournament-list");
    if (!root)
        return;
    const tok = getAuthToken();
    if (!tok) {
        root.innerHTML = `<p class="small mb-0">${t("tournament-login-hint")}</p>`;
        return;
    }
    const res = await api("/tournaments");
    if (!res.ok) {
        root.innerHTML = `<p class="small text-danger mb-0">${t("tournament-error-load")}</p>`;
        return;
    }
    const rows = (await res.json());
    if (rows.length === 0) {
        root.innerHTML = `<p class="small mb-0">${t("tournament-empty-list")}</p>`;
        return;
    }
    root.innerHTML = rows
        .map((r) => `
		<button type="button" class="btn btn-outline-light btn-sm w-100 text-start mb-2 tournament-list-item" data-tid="${r.id}">
			<strong>${escapeHtml(r.name)}</strong>
			<span class="d-block small text-white-50">${escapeHtml(gameLabel(r.game))} · ${statusLabel(r.status)} · ${r.capacity} ${t("tournament-slots")}</span>
		</button>`)
        .join("");
    root.querySelectorAll(".tournament-list-item").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = Number(btn.dataset.tid);
            if (Number.isFinite(id))
                void showDetail(id);
        });
    });
}
function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function statusLabel(status) {
    if (status === "registration")
        return t("tournament-status-registration");
    if (status === "in_progress")
        return t("tournament-status-in_progress");
    if (status === "completed")
        return t("tournament-status-completed");
    return status;
}
function gameLabel(game) {
    return game === "pong" ? t("pong") : t("chess");
}
async function showDetail(id) {
    selectedTournamentId = id;
    const detail = document.getElementById("tournament-detail");
    const placeholder = document.getElementById("tournament-detail-placeholder");
    if (!detail || !placeholder)
        return;
    const res = await api(`/tournaments/${id}`);
    if (!res.ok) {
        alertApiError(res, await res.json().catch(() => ({})));
        selectedTournamentId = null;
        detail.hidden = true;
        placeholder.hidden = false;
        return;
    }
    const data = (await res.json());
    const { tournament, participants, matches } = data;
    const me = getCurrentUserIdFromToken();
    const names = userNameMap(participants);
    const isCreator = me !== null && me === tournament.createdByUserId;
    const registeredIds = new Set(participants.map((p) => p.userId));
    const imRegistered = me !== null && registeredIds.has(me);
    const canRegister = tournament.status === "registration" && me !== null && !imRegistered && participants.length < tournament.capacity;
    placeholder.hidden = true;
    detail.hidden = false;
    const byRound = new Map();
    for (const m of matches) {
        const list = byRound.get(m.round) ?? [];
        list.push(m);
        byRound.set(m.round, list);
    }
    const rounds = [...byRound.keys()].sort((a, b) => a - b);
    let bracketHtml = "";
    for (const r of rounds) {
        const list = byRound.get(r) ?? [];
        bracketHtml += `<div class="tournament-round-column mb-3"><h4 class="h6 text-white-50 mb-2">${escapeHtml(phaseLabel(r, tournament.capacity))}</h4><div class="d-flex flex-column gap-2">`;
        for (const m of list) {
            const p1 = m.player1Id;
            const p2 = m.player2Id;
            const w = m.winnerId;
            const canPlay = tournament.status === "in_progress" &&
                w === null &&
                me !== null &&
                p1 !== null &&
                p2 !== null &&
                (me === p1 || me === p2);
            let actions = "";
            if (canPlay && p1 !== null && p2 !== null) {
                actions = `
					<div class="btn-group btn-group-sm mt-2" role="group">
						<button type="button" class="btn btn-light btn-sm tournament-win-btn" data-mid="${m.id}" data-wid="${p1}">${escapeHtml(nameOrId(p1, names))}</button>
						<button type="button" class="btn btn-outline-light btn-sm tournament-win-btn" data-mid="${m.id}" data-wid="${p2}">${escapeHtml(nameOrId(p2, names))}</button>
					</div>`;
            }
            else if (w !== null) {
                actions = `<p class="small mb-0 mt-2"><strong>${t("tournament-winner")}</strong> ${escapeHtml(nameOrId(w, names))}</p>`;
            }
            bracketHtml += `
				<div class="card app-panel tournament-match-card p-2">
					<div class="small text-white-50">#${m.id} · ${t("tournament-match-label")}</div>
					<div class="fw-semibold">${escapeHtml(nameOrId(p1, names))} <span class="text-white-50">${t("tournament-vs")}</span> ${escapeHtml(nameOrId(p2, names))}</div>
					${actions}
				</div>`;
        }
        bracketHtml += "</div></div>";
    }
    detail.innerHTML = `
		<div class="card-body">
			<div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
				<div>
					<h3 class="h5 mb-1">${escapeHtml(tournament.name)}</h3>
					<p class="small text-white-50 mb-0">${escapeHtml(gameLabel(tournament.game))} · ${statusLabel(tournament.status)} · ${participants.length}/${tournament.capacity} ${t("tournament-participants-count")}</p>
				</div>
				<div class="d-flex flex-wrap gap-2">
					${canRegister ? `<button type="button" class="btn btn-outline-light btn-sm" id="tournament-btn-register">${t("tournament-register")}</button>` : ""}
					${isCreator && tournament.status === "registration" && participants.length === tournament.capacity ? `<button type="button" class="btn btn-light btn-sm" id="tournament-btn-start">${t("tournament-start")}</button>` : ""}
					${isCreator && tournament.status === "registration" ? `<button type="button" class="btn btn-outline-danger btn-sm" id="tournament-btn-delete">${t("tournament-delete")}</button>` : ""}
				</div>
			</div>
			<h4 class="h6 mb-2" data-i18n="tournament-bracket-title">Arbre</h4>
			<div class="tournament-bracket d-flex flex-column flex-md-row flex-md-wrap gap-3">${bracketHtml || `<p class="small">${t("tournament-no-matches")}</p>`}</div>
		</div>`;
    applyTranslations(detail);
    document.getElementById("tournament-btn-register")?.addEventListener("click", async () => {
        const r = await api(`/tournaments/${id}/register`, { method: "POST" });
        if (!r.ok) {
            alertApiError(r, await r.json().catch(() => ({})));
            return;
        }
        alert(t("tournament-registered-ok"));
        await loadList();
        await showDetail(id);
    });
    document.getElementById("tournament-btn-start")?.addEventListener("click", async () => {
        const r = await api(`/tournaments/${id}/start`, { method: "POST" });
        if (!r.ok) {
            alertApiError(r, await r.json().catch(() => ({})));
            return;
        }
        alert(t("tournament-start-ok"));
        await loadList();
        await showDetail(id);
    });
    document.getElementById("tournament-btn-delete")?.addEventListener("click", async () => {
        if (!confirm(t("tournament-delete-confirm")))
            return;
        const r = await api(`/tournaments/${id}`, { method: "DELETE" });
        if (!r.ok) {
            alertApiError(r, await r.json().catch(() => ({})));
            return;
        }
        selectedTournamentId = null;
        detail.hidden = true;
        placeholder.hidden = false;
        await loadList();
    });
    detail.querySelectorAll(".tournament-win-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const mid = Number(btn.dataset.mid);
            const wid = Number(btn.dataset.wid);
            if (!Number.isFinite(mid) || !Number.isFinite(wid))
                return;
            const r = await api(`/tournaments/${id}/matches/${mid}/result`, {
                method: "POST",
                body: JSON.stringify({ winnerUserId: wid }),
            });
            if (!r.ok) {
                alertApiError(r, await r.json().catch(() => ({})));
                return;
            }
            const j = (await r.json().catch(() => ({})));
            if (j.tournamentCompleted)
                alert(t("tournament-completed-ok"));
            await loadList();
            await showDetail(id);
        });
    });
}
export async function refreshTournamentsView() {
    const section = document.getElementById("view-tournaments");
    if (section)
        applyTranslations(section);
    await loadList();
    if (selectedTournamentId !== null)
        await showDetail(selectedTournamentId);
}
export function initTournaments() {
    const form = document.getElementById("tournament-create-form");
    const refreshBtn = document.getElementById("tournament-refresh-btn");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const name = String(fd.get("name") ?? "").trim();
        const capacity = Number(fd.get("capacity"));
        if (!getAuthToken()) {
            alert(t("section-login-required"));
            return;
        }
        const res = await api("/tournaments", {
            method: "POST",
            body: JSON.stringify({ name, capacity, game: "chess" }),
        });
        if (!res.ok) {
            alertApiError(res, await res.json().catch(() => ({})));
            return;
        }
        alert(t("tournament-created"));
        form.reset();
        await loadList();
    });
    refreshBtn?.addEventListener("click", () => {
        void refreshTournamentsView();
    });
}

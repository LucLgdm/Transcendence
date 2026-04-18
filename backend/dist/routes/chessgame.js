"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const remindmatch_1 = __importDefault(require("../models/remindmatch"));
const User_1 = __importDefault(require("../models/User"));
const database_1 = __importDefault(require("../config/database"));
const STALE_PLAYER_MS = 10000;
const router = (0, express_1.Router)();
const sessions = new Map();
const matchmakingQueue = [];
const matchmakingReady = new Map();
function removePlayerFromMatchmakingQueue(playerId) {
    for (let i = matchmakingQueue.length - 1; i >= 0; i -= 1) {
        if (matchmakingQueue[i].playerId === playerId) {
            matchmakingQueue.splice(i, 1);
        }
    }
}
function parseUserId(playerId) {
    if (!playerId)
        return null;
    const match = /^user-(\d+)$/.exec(playerId);
    if (!match)
        return null;
    const value = Number(match[1]);
    return Number.isInteger(value) && value > 0 ? value : null;
}
function getWinnerUserId(session) {
    if (session.gameStatus.startsWith("checkmate ")) {
        const defeatedColor = session.gameStatus.slice("checkmate ".length);
        if (defeatedColor === "White") {
            return parseUserId(session.blackPlayerId);
        }
        if (defeatedColor === "Black") {
            return parseUserId(session.whitePlayerId);
        }
        return null;
    }
    if (session.gameStatus.startsWith("forfeit ")) {
        const forfeiting = session.gameStatus.slice("forfeit ".length);
        if (forfeiting === "White") {
            return parseUserId(session.blackPlayerId);
        }
        if (forfeiting === "Black") {
            return parseUserId(session.whitePlayerId);
        }
    }
    return null;
}
function isFinishedStatus(status) {
    return (status.startsWith("checkmate ")
        || status.startsWith("stalemate ")
        || status.startsWith("draw ")
        || status.startsWith("forfeit "));
}
function touchLastSeen(session, playerId) {
    const now = Date.now();
    if (playerId === session.whitePlayerId) {
        session.whiteLastSeen = now;
    }
    else if (playerId === session.blackPlayerId) {
        session.blackLastSeen = now;
    }
}
async function applyForfeitByColor(session, forfeitingColor) {
    if (isFinishedStatus(session.gameStatus))
        return;
    if (!session.blackPlayerId) {
        sessions.delete(session.id);
        return;
    }
    session.gameStatus = `forfeit ${forfeitingColor}`;
    session.updatedAt = Date.now();
    try {
        await persistFinishedMatchIfPossible(session);
    }
    catch (error) {
        console.error("Erreur enregistrement forfait échecs:", error);
    }
}
async function maybeStaleForfeitOpponent(session) {
    if (!session.blackPlayerId || isFinishedStatus(session.gameStatus))
        return;
    if (session.whiteLastSeen == null || session.blackLastSeen == null)
        return;
    const now = Date.now();
    const whiteAge = now - session.whiteLastSeen;
    const blackAge = now - session.blackLastSeen;
    if (whiteAge > STALE_PLAYER_MS && blackAge <= STALE_PLAYER_MS) {
        await applyForfeitByColor(session, "White");
    }
    else if (blackAge > STALE_PLAYER_MS && whiteAge <= STALE_PLAYER_MS) {
        await applyForfeitByColor(session, "Black");
    }
}
async function persistFinishedMatchIfPossible(session) {
    if (session.matchPersisted || !isFinishedStatus(session.gameStatus))
        return;
    const whiteUserId = parseUserId(session.whitePlayerId);
    const blackUserId = parseUserId(session.blackPlayerId);
    if (!whiteUserId || !blackUserId)
        return;
    const winnerUserId = getWinnerUserId(session);
    await database_1.default.transaction(async (transaction) => {
        await remindmatch_1.default.create({
            game: "chess",
            player1ID: whiteUserId,
            player2ID: blackUserId,
            winnerID: winnerUserId,
            scoreP1: null,
            scoreP2: null,
        }, { transaction });
        if (winnerUserId) {
            const loserUserId = winnerUserId === whiteUserId ? blackUserId : whiteUserId;
            await User_1.default.increment("elo", { by: 10, where: { id: winnerUserId }, transaction });
            await User_1.default.decrement("elo", { by: 10, where: { id: loserUserId }, transaction });
        }
    });
    session.matchPersisted = true;
}
function buildInitialBoard() {
    const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
    board[0][0] = { type: "rook", color: "Black", hasMoved: false };
    board[0][1] = { type: "knight", color: "Black", hasMoved: false };
    board[0][2] = { type: "bishop", color: "Black", hasMoved: false };
    board[0][3] = { type: "queen", color: "Black", hasMoved: false };
    board[0][4] = { type: "king", color: "Black", hasMoved: false };
    board[0][5] = { type: "bishop", color: "Black", hasMoved: false };
    board[0][6] = { type: "knight", color: "Black", hasMoved: false };
    board[0][7] = { type: "rook", color: "Black", hasMoved: false };
    for (let i = 0; i < 8; i += 1) {
        board[1][i] = { type: "pion", color: "Black", hasMoved: false };
    }
    board[7][0] = { type: "rook", color: "White", hasMoved: false };
    board[7][1] = { type: "knight", color: "White", hasMoved: false };
    board[7][2] = { type: "bishop", color: "White", hasMoved: false };
    board[7][3] = { type: "queen", color: "White", hasMoved: false };
    board[7][4] = { type: "king", color: "White", hasMoved: false };
    board[7][5] = { type: "bishop", color: "White", hasMoved: false };
    board[7][6] = { type: "knight", color: "White", hasMoved: false };
    board[7][7] = { type: "rook", color: "White", hasMoved: false };
    for (let i = 0; i < 8; i += 1) {
        board[6][i] = { type: "pion", color: "White", hasMoved: false };
    }
    return board;
}
function publicSession(session) {
    return {
        id: session.id,
        hasBlackPlayer: Boolean(session.blackPlayerId),
        board: session.board,
        currentPlayer: session.currentPlayer,
        gameStatus: session.gameStatus,
        moveCount: session.moveCount,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    };
}
function createSessionForPlayers(whitePlayerId, blackPlayerId) {
    const id = crypto_1.default.randomUUID();
    const password = crypto_1.default.randomUUID();
    const now = Date.now();
    const session = {
        id,
        whitePlayerId,
        blackPlayerId,
        password,
        matchPersisted: false,
        board: buildInitialBoard(),
        currentPlayer: "White",
        gameStatus: "inProgress",
        moveCount: 0,
        createdAt: now,
        updatedAt: now,
        whiteLastSeen: now,
        blackLastSeen: now,
    };
    sessions.set(id, session);
    return session;
}
function toMatchmakingPayload(session, color, password) {
    return {
        gameId: session.id,
        color,
        password,
        ...publicSession(session),
    };
}
router.post("/matchmaking/join", (req, res) => {
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: "playerId requis" });
    }
    removePlayerFromMatchmakingQueue(playerId);
    matchmakingReady.delete(playerId);
    const waiting = matchmakingQueue[0];
    if (waiting && waiting.playerId !== playerId) {
        matchmakingQueue.shift();
        const session = createSessionForPlayers(waiting.playerId, playerId);
        const payload = toMatchmakingPayload(session, "Black", session.password);
        matchmakingReady.set(waiting.playerId, toMatchmakingPayload(session, "White", session.password));
        return res.json({ status: "matched", ...payload });
    }
    matchmakingQueue.push({ playerId, joinedAt: Date.now() });
    return res.json({ status: "waiting" });
});
router.get("/matchmaking/status", (req, res) => {
    const playerId = typeof req.query.playerId === "string" ? req.query.playerId : undefined;
    if (!playerId) {
        return res.status(400).json({ error: "playerId requis" });
    }
    const ready = matchmakingReady.get(playerId);
    if (ready) {
        matchmakingReady.delete(playerId);
        return res.json({ status: "matched", ...ready });
    }
    const queued = matchmakingQueue.some((entry) => entry.playerId === playerId);
    return res.json({ status: queued ? "waiting" : "idle" });
});
router.delete("/matchmaking/leave", (req, res) => {
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: "playerId requis" });
    }
    removePlayerFromMatchmakingQueue(playerId);
    matchmakingReady.delete(playerId);
    return res.status(204).send();
});
router.post("/", (req, res) => {
    const { playerId, password } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: "playerId requis" });
    }
    if (!password || !password.trim()) {
        return res.status(400).json({ error: "Mot de passe requis" });
    }
    const id = crypto_1.default.randomUUID();
    const now = Date.now();
    const session = {
        id,
        whitePlayerId: playerId,
        password: password.trim(),
        matchPersisted: false,
        board: buildInitialBoard(),
        currentPlayer: "White",
        gameStatus: "inProgress",
        moveCount: 0,
        createdAt: now,
        updatedAt: now,
        whiteLastSeen: now,
        blackLastSeen: null,
    };
    sessions.set(id, session);
    return res.status(201).json({
        gameId: id,
        color: "White",
        ...publicSession(session),
    });
});
router.post("/:id/join", (req, res) => {
    const { id } = req.params;
    const { playerId, password } = req.body;
    const session = sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: "Partie introuvable" });
    }
    if (!playerId) {
        return res.status(400).json({ error: "playerId requis" });
    }
    if (!password || password.trim() !== session.password) {
        return res.status(401).json({ error: "Mot de passe invalide" });
    }
    if (session.whitePlayerId === playerId) {
        touchLastSeen(session, playerId);
        return res.json({ gameId: id, color: "White", ...publicSession(session) });
    }
    if (!session.blackPlayerId) {
        session.blackPlayerId = playerId;
        const now = Date.now();
        session.whiteLastSeen = now;
        session.blackLastSeen = now;
        session.updatedAt = now;
        return res.json({ gameId: id, color: "Black", ...publicSession(session) });
    }
    if (session.blackPlayerId === playerId) {
        touchLastSeen(session, playerId);
        return res.json({ gameId: id, color: "Black", ...publicSession(session) });
    }
    return res.status(409).json({ error: "Partie déjà complète" });
});
router.post("/:id/spectate", (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const session = sessions.get(id);
    if (!session) {
        return res.status(404).json({ error: "Partie introuvable" });
    }
    if (!password || password.trim() !== session.password) {
        return res.status(401).json({ error: "Mot de passe invalide" });
    }
    return res.json({ gameId: id, color: "Spectator", ...publicSession(session) });
});
router.get("/:id", async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
        return res.status(404).json({ error: "Partie introuvable" });
    }
    const playerId = typeof req.query.playerId === "string" ? req.query.playerId.trim() : undefined;
    if (playerId) {
        touchLastSeen(session, playerId);
        try {
            await maybeStaleForfeitOpponent(session);
        }
        catch (error) {
            console.error("Erreur forfait absence de ping échecs:", error);
        }
    }
    return res.json(publicSession(session));
});
router.post("/:id/move", async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
        return res.status(404).json({ error: "Partie introuvable" });
    }
    if (isFinishedStatus(session.gameStatus)) {
        return res.status(409).json({ error: "Partie terminée" });
    }
    const { playerId, board, currentPlayer, gameStatus } = req.body;
    if (!playerId || !board || !currentPlayer || !gameStatus) {
        return res.status(400).json({ error: "payload incomplet" });
    }
    const playerColor = playerId === session.whitePlayerId
        ? "White"
        : playerId === session.blackPlayerId
            ? "Black"
            : null;
    if (!playerColor) {
        return res.status(403).json({ error: "Joueur non autorisé sur cette partie" });
    }
    if (playerColor !== session.currentPlayer) {
        return res.status(409).json({ error: "Ce n'est pas votre tour" });
    }
    if (currentPlayer === session.currentPlayer) {
        return res.status(400).json({ error: "Le tour doit changer après un coup" });
    }
    session.board = board;
    session.currentPlayer = currentPlayer;
    session.gameStatus = gameStatus;
    session.moveCount += 1;
    session.updatedAt = Date.now();
    touchLastSeen(session, playerId);
    try {
        await persistFinishedMatchIfPossible(session);
    }
    catch (error) {
        console.error("Erreur enregistrement historique partie en ligne:", error);
    }
    return res.json(publicSession(session));
});
router.post("/:id/forfeit", async (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
        return res.status(404).json({ error: "Partie introuvable" });
    }
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: "playerId requis" });
    }
    if (isFinishedStatus(session.gameStatus)) {
        return res.json(publicSession(session));
    }
    const color = playerId === session.whitePlayerId
        ? "White"
        : playerId === session.blackPlayerId
            ? "Black"
            : null;
    if (!color) {
        return res.status(403).json({ error: "Joueur non autorisé sur cette partie" });
    }
    if (!session.blackPlayerId) {
        sessions.delete(session.id);
        return res.status(204).end();
    }
    try {
        await applyForfeitByColor(session, color);
    }
    catch (error) {
        console.error("Erreur enregistrement forfait échecs:", error);
    }
    return res.json(publicSession(session));
});
router.get("/", (_req, res) => {
    const liveGames = [...sessions.values()]
        .filter((session) => session.gameStatus.startsWith("inProgress") || session.gameStatus.startsWith("check "))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 20)
        .map((session) => ({
        id: session.id,
        hasBlackPlayer: Boolean(session.blackPlayerId),
        moveCount: session.moveCount,
        updatedAt: session.updatedAt,
    }));
    return res.json(liveGames);
});
exports.default = router;

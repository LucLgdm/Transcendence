import { Router } from "express";
import crypto from "crypto";
import RemindMatch from "../models/remindmatch";
import User from "../models/User";
import sequelize from "../config/database";

type Color = "White" | "Black";

type Position = {
	row: number;
	colon: number;
};

type Piece = {
	type: "king" | "queen" | "rook" | "bishop" | "knight" | "pion";
	color: Color;
	hasMoved?: boolean;
};

type Board = (Piece | null)[][];

type ChessSession = {
	id: string;
	whitePlayerId: string;
	blackPlayerId?: string;
	password: string;
	matchPersisted: boolean;
	board: Board;
	currentPlayer: Color;
	gameStatus: string;
	moveCount: number;
	createdAt: number;
	updatedAt: number;
	whiteLastSeen: number | null;
	blackLastSeen: number | null;
};

const STALE_PLAYER_MS = 10_000;

const router = Router();
const sessions = new Map<string, ChessSession>();

type MatchmakingQueueEntry = { playerId: string; joinedAt: number };
const matchmakingQueue: MatchmakingQueueEntry[] = [];
type MatchmakingReadyPayload = {
	gameId: string;
	color: Color;
	password: string;
	id: string;
	hasBlackPlayer: boolean;
	board: Board;
	currentPlayer: Color;
	gameStatus: string;
	moveCount: number;
	createdAt: number;
	updatedAt: number;
};

const matchmakingReady = new Map<string, MatchmakingReadyPayload>();

function removePlayerFromMatchmakingQueue(playerId: string): void {
	for (let i = matchmakingQueue.length - 1; i >= 0; i -= 1) {
		if (matchmakingQueue[i].playerId === playerId) {
			matchmakingQueue.splice(i, 1);
		}
	}
}

function parseUserId(playerId?: string): number | null {
	if (!playerId) return null;
	const match = /^user-(\d+)$/.exec(playerId);
	if (!match) return null;
	const value = Number(match[1]);
	return Number.isInteger(value) && value > 0 ? value : null;
}

function getWinnerUserId(session: ChessSession): number | null {
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

function isFinishedStatus(status: string): boolean {
	return (
		status.startsWith("checkmate ")
		|| status.startsWith("stalemate ")
		|| status.startsWith("draw ")
		|| status.startsWith("forfeit ")
	);
}

function touchLastSeen(session: ChessSession, playerId: string): void {
	const now = Date.now();
	if (playerId === session.whitePlayerId) {
		session.whiteLastSeen = now;
	} else if (playerId === session.blackPlayerId) {
		session.blackLastSeen = now;
	}
}

async function applyForfeitByColor(session: ChessSession, forfeitingColor: Color): Promise<void> {
	if (isFinishedStatus(session.gameStatus)) return;
	if (!session.blackPlayerId) {
		sessions.delete(session.id);
		return;
	}
	session.gameStatus = `forfeit ${forfeitingColor}`;
	session.updatedAt = Date.now();
	try {
		await persistFinishedMatchIfPossible(session);
	} catch (error) {
		console.error("Erreur enregistrement forfait échecs:", error);
	}
}

async function maybeStaleForfeitOpponent(session: ChessSession): Promise<void> {
	if (!session.blackPlayerId || isFinishedStatus(session.gameStatus)) return;
	if (session.whiteLastSeen == null || session.blackLastSeen == null) return;
	const now = Date.now();
	const whiteAge = now - session.whiteLastSeen;
	const blackAge = now - session.blackLastSeen;
	if (whiteAge > STALE_PLAYER_MS && blackAge <= STALE_PLAYER_MS) {
		await applyForfeitByColor(session, "White");
	} else if (blackAge > STALE_PLAYER_MS && whiteAge <= STALE_PLAYER_MS) {
		await applyForfeitByColor(session, "Black");
	}
}

async function persistFinishedMatchIfPossible(session: ChessSession): Promise<void> {
	if (session.matchPersisted || !isFinishedStatus(session.gameStatus)) return;
	const whiteUserId = parseUserId(session.whitePlayerId);
	const blackUserId = parseUserId(session.blackPlayerId);
	if (!whiteUserId || !blackUserId) return;
	const winnerUserId = getWinnerUserId(session);

	await sequelize.transaction(async (transaction) => {
		await RemindMatch.create({
			game: "chess",
			player1ID: whiteUserId,
			player2ID: blackUserId,
			winnerID: winnerUserId,
			scoreP1: null,
			scoreP2: null,
		}, { transaction });

		if (winnerUserId) {
			const loserUserId = winnerUserId === whiteUserId ? blackUserId : whiteUserId;
			await User.increment("elo", { by: 10, where: { id: winnerUserId }, transaction });
			await User.decrement("elo", { by: 10, where: { id: loserUserId }, transaction });
		}
	});
	session.matchPersisted = true;
}

function buildInitialBoard(): Board {
	const board: Board = Array(8)
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

function publicSession(session: ChessSession) {
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

function createSessionForPlayers(whitePlayerId: string, blackPlayerId: string): ChessSession {
	const id = crypto.randomUUID();
	const password = crypto.randomUUID();
	const now = Date.now();
	const session: ChessSession = {
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

function toMatchmakingPayload(session: ChessSession, color: Color, password: string): MatchmakingReadyPayload {
	return {
		gameId: session.id,
		color,
		password,
		...publicSession(session),
	};
}

router.post("/matchmaking/join", (req, res) => {
	const { playerId } = req.body as { playerId?: string };
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
	const { playerId } = req.body as { playerId?: string };
	if (!playerId) {
		return res.status(400).json({ error: "playerId requis" });
	}
	removePlayerFromMatchmakingQueue(playerId);
	matchmakingReady.delete(playerId);
	return res.status(204).send();
});

router.post("/", (req, res) => {
	const { playerId, password } = req.body as { playerId?: string; password?: string };
	if (!playerId) {
		return res.status(400).json({ error: "playerId requis" });
	}
	if (!password || !password.trim()) {
		return res.status(400).json({ error: "Mot de passe requis" });
	}

	const id = crypto.randomUUID();
	const now = Date.now();
	const session: ChessSession = {
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
	const { playerId, password } = req.body as { playerId?: string; password?: string };
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
	const { password } = req.body as { password?: string };
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
		} catch (error) {
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

	const { playerId, board, currentPlayer, gameStatus } = req.body as {
		playerId?: string;
		board?: Board;
		currentPlayer?: Color;
		gameStatus?: string;
	};

	if (!playerId || !board || !currentPlayer || !gameStatus) {
		return res.status(400).json({ error: "payload incomplet" });
	}

	const playerColor: Color | null =
		playerId === session.whitePlayerId
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
	} catch (error) {
		console.error("Erreur enregistrement historique partie en ligne:", error);
	}

	return res.json(publicSession(session));
});

router.post("/:id/forfeit", async (req, res) => {
	const session = sessions.get(req.params.id);
	if (!session) {
		return res.status(404).json({ error: "Partie introuvable" });
	}

	const { playerId } = req.body as { playerId?: string };
	if (!playerId) {
		return res.status(400).json({ error: "playerId requis" });
	}

	if (isFinishedStatus(session.gameStatus)) {
		return res.json(publicSession(session));
	}

	const color: Color | null =
		playerId === session.whitePlayerId
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
	} catch (error) {
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

export default router;

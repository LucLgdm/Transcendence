import { Router } from "express";
import crypto from "crypto";

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
	board: Board;
	currentPlayer: Color;
	gameStatus: string;
	moveCount: number;
	createdAt: number;
	updatedAt: number;
};

const router = Router();
const sessions = new Map<string, ChessSession>();

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

router.post("/", (req, res) => {
	const { playerId } = req.body as { playerId?: string };
	if (!playerId) {
		return res.status(400).json({ error: "playerId requis" });
	}

	const id = crypto.randomUUID();
	const now = Date.now();
	const session: ChessSession = {
		id,
		whitePlayerId: playerId,
		board: buildInitialBoard(),
		currentPlayer: "White",
		gameStatus: "inProgress",
		moveCount: 0,
		createdAt: now,
		updatedAt: now,
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
	const { playerId } = req.body as { playerId?: string };
	const session = sessions.get(id);

	if (!session) {
		return res.status(404).json({ error: "Partie introuvable" });
	}
	if (!playerId) {
		return res.status(400).json({ error: "playerId requis" });
	}

	if (session.whitePlayerId === playerId) {
		return res.json({ gameId: id, color: "White", ...publicSession(session) });
	}

	if (!session.blackPlayerId) {
		session.blackPlayerId = playerId;
		session.updatedAt = Date.now();
		return res.json({ gameId: id, color: "Black", ...publicSession(session) });
	}

	if (session.blackPlayerId === playerId) {
		return res.json({ gameId: id, color: "Black", ...publicSession(session) });
	}

	return res.status(409).json({ error: "Partie déjà complète" });
});

router.get("/:id", (req, res) => {
	const session = sessions.get(req.params.id);
	if (!session) {
		return res.status(404).json({ error: "Partie introuvable" });
	}
	return res.json(publicSession(session));
});

router.post("/:id/move", (req, res) => {
	const session = sessions.get(req.params.id);
	if (!session) {
		return res.status(404).json({ error: "Partie introuvable" });
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

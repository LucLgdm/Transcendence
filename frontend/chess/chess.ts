import type { PieceType, Color, Piece, Position, Board, ChessGame as IChessGame } from "../init-types";
import { buildApiUrl } from "../api/api.js";
import { t } from "../i18n/index.js";

type InternalBoard = (Piece | null)[][];
type PromotionPiece = Extract<PieceType, "queen" | "rook" | "bishop" | "knight">;

type EnPassantState = {
	row: number;
	colon: number;
	captureRow: number;
	captureColon: number;
} | null;

type SerializedChessState = {
	board: Board;
	currentPlayer: Color;
	gameStatus: string;
	enPassantTarget: EnPassantState;
	halfMoveClock: number;
	positionHistory: [string, number][];
};

type MoveCandidate = {
	to: Position;
	special?: "castle_kingside" | "castle_queenside" | "en_passant" | "promotion";
};

type ApplyResult = {
	board: InternalBoard;
	captured: boolean;
	pawnMoved: boolean;
	newEnPassantTarget: EnPassantState;
};

const CHESS_POLL_INTERVAL_MS = 1200;
const KNIGHT_OFFSETS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] as const;
const KING_OFFSETS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const;

export class ChessGame implements IChessGame {
	private board: InternalBoard;
	private currentPlayer: Color;
	private selectedPiece: Position | null;
	private possibleMoves: Position[];
	private gameStatus: string;
	private enPassantTarget: EnPassantState;
	private halfMoveClock: number;
	private positionCounts: Map<string, number>;

	constructor(_startingColor: Color) {
		this.board = this.initializeBoard();
		this.currentPlayer = "White";
		this.selectedPiece = null;
		this.possibleMoves = [];
		this.gameStatus = "inProgress";
		this.enPassantTarget = null;
		this.halfMoveClock = 0;
		this.positionCounts = new Map();
		this.trackCurrentPosition();
	}

	private initializeBoard(): InternalBoard {
		const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
		board[0][0] = { type: "rook", color: "Black", hasMoved: false };
		board[0][1] = { type: "knight", color: "Black", hasMoved: false };
		board[0][2] = { type: "bishop", color: "Black", hasMoved: false };
		board[0][3] = { type: "queen", color: "Black", hasMoved: false };
		board[0][4] = { type: "king", color: "Black", hasMoved: false };
		board[0][5] = { type: "bishop", color: "Black", hasMoved: false };
		board[0][6] = { type: "knight", color: "Black", hasMoved: false };
		board[0][7] = { type: "rook", color: "Black", hasMoved: false };
		for (let i = 0; i < 8; i += 1) board[1][i] = { type: "pion", color: "Black", hasMoved: false };

		board[7][0] = { type: "rook", color: "White", hasMoved: false };
		board[7][1] = { type: "knight", color: "White", hasMoved: false };
		board[7][2] = { type: "bishop", color: "White", hasMoved: false };
		board[7][3] = { type: "queen", color: "White", hasMoved: false };
		board[7][4] = { type: "king", color: "White", hasMoved: false };
		board[7][5] = { type: "bishop", color: "White", hasMoved: false };
		board[7][6] = { type: "knight", color: "White", hasMoved: false };
		board[7][7] = { type: "rook", color: "White", hasMoved: false };
		for (let i = 0; i < 8; i += 1) board[6][i] = { type: "pion", color: "White", hasMoved: false };
		return board;
	}

	getBoard(): Board { return this.board as Board; }
	getcurrentPlayer(): Color { return this.currentPlayer; }
	getSelectedPiece(): Position | null { return this.selectedPiece; }
	getPossibleMoves(): Position[] { return this.possibleMoves; }
	getGameStatus(): string { return this.gameStatus; }
	clearSelection(): void { this.selectedPiece = null; this.possibleMoves = []; }

	getSerializableState(): SerializedChessState {
		return {
			board: this.board as Board,
			currentPlayer: this.currentPlayer,
			gameStatus: this.gameStatus,
			enPassantTarget: this.enPassantTarget,
			halfMoveClock: this.halfMoveClock,
			positionHistory: [...this.positionCounts.entries()],
		};
	}

	loadState(state: SerializedChessState): void {
		this.board = this.cloneBoard(state.board as InternalBoard);
		this.currentPlayer = state.currentPlayer;
		this.gameStatus = state.gameStatus;
		this.enPassantTarget = state.enPassantTarget ?? null;
		this.halfMoveClock = state.halfMoveClock ?? 0;
		this.selectedPiece = null;
		this.possibleMoves = [];
		this.positionCounts = new Map(state.positionHistory ?? []);
		if (this.positionCounts.size === 0) this.trackCurrentPosition();
	}

	selectPiece(position: Position): boolean {
		if (!this.isInBounds(position.row, position.colon)) return false;
		const piece = this.board[position.row][position.colon];
		if (!piece || piece.color !== this.currentPlayer) return false;
		this.selectedPiece = position;
		this.possibleMoves = this.getLegalMoveCandidates(position).map((c) => c.to);
		return true;
	}

	movePiece(from: Position, to: Position, promotionChoice: PromotionPiece = "queen"): boolean {
		const piece = this.board[from.row]?.[from.colon];
		if (!piece || piece.color !== this.currentPlayer) return false;
		const selected = this.getLegalMoveCandidates(from).find((c) => c.to.row === to.row && c.to.colon === to.colon);
		if (!selected) return false;
		const applied = this.applyMove(this.board, from, selected, promotionChoice);
		this.board = applied.board;
		this.enPassantTarget = applied.newEnPassantTarget;
		this.halfMoveClock = (applied.pawnMoved || applied.captured) ? 0 : this.halfMoveClock + 1;
		this.currentPlayer = this.otherColor(this.currentPlayer);
		this.clearSelection();
		this.updateGameStatus();
		this.trackCurrentPosition();
		return true;
	}

	resetGame(): void {
		this.board = this.initializeBoard();
		this.currentPlayer = "White";
		this.selectedPiece = null;
		this.possibleMoves = [];
		this.gameStatus = "inProgress";
		this.enPassantTarget = null;
		this.halfMoveClock = 0;
		this.positionCounts.clear();
		this.trackCurrentPosition();
	}

	private updateGameStatus(): void {
		const player = this.currentPlayer;
		if (this.isCheckmate(player, this.board)) return void (this.gameStatus = `checkmate ${player}`);
		if (this.isStalemate(player, this.board)) return void (this.gameStatus = `stalemate ${player}`);
		if (this.isInsufficientMaterial(this.board)) return void (this.gameStatus = "draw insufficient material");
		if (this.halfMoveClock >= 100) return void (this.gameStatus = "draw fifty-move rule");
		if ((this.positionCounts.get(this.getPositionKey(this.board, this.currentPlayer, this.enPassantTarget)) ?? 0) >= 3) {
			return void (this.gameStatus = "draw threefold repetition");
		}
		if (this.isKingInCheck(player, this.board)) return void (this.gameStatus = `check ${player}`);
		this.gameStatus = "inProgress";
	}

	private getLegalMoveCandidates(position: Position): MoveCandidate[] {
		const piece = this.board[position.row]?.[position.colon];
		if (!piece) return [];
		return this.getPseudoMoves(position, piece, this.board, this.enPassantTarget).filter((candidate) => {
			const sim = this.applyMove(this.board, position, candidate, "queen");
			return !this.isKingInCheck(piece.color, sim.board);
		});
	}

	private getPseudoMoves(position: Position, piece: Piece, board: InternalBoard, enPassant: EnPassantState): MoveCandidate[] {
		if (piece.type === "pion") return this.getPawnMoves(position, piece.color, board, enPassant);
		if (piece.type === "rook") return this.getSlidingMoves(position, piece.color, board, [[-1,0],[1,0],[0,-1],[0,1]]);
		if (piece.type === "bishop") return this.getSlidingMoves(position, piece.color, board, [[-1,-1],[-1,1],[1,-1],[1,1]]);
		if (piece.type === "queen") return this.getSlidingMoves(position, piece.color, board, [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]);
		if (piece.type === "knight") {
			return KNIGHT_OFFSETS.flatMap(([dr, dc]) => {
				const row = position.row + dr, colon = position.colon + dc;
				if (!this.isInBounds(row, colon)) return [];
				const target = board[row][colon];
				return (!target || target.color !== piece.color) ? [{ to: { row, colon } }] : [];
			});
		}
		return this.getKingMoves(position, piece.color, board);
	}

	private getPawnMoves(position: Position, color: Color, board: InternalBoard, enPassant: EnPassantState): MoveCandidate[] {
		const moves: MoveCandidate[] = [];
		const direction = color === "White" ? -1 : 1;
		const startRow = color === "White" ? 6 : 1;
		const promotionRow = color === "White" ? 0 : 7;
		const oneStep = position.row + direction;
		if (this.isInBounds(oneStep, position.colon) && !board[oneStep][position.colon]) {
			moves.push({ to: { row: oneStep, colon: position.colon }, special: oneStep === promotionRow ? "promotion" : undefined });
			const twoStep = position.row + 2 * direction;
			if (position.row === startRow && !board[twoStep][position.colon]) moves.push({ to: { row: twoStep, colon: position.colon } });
		}
		for (const dc of [-1, 1]) {
			const row = position.row + direction;
			const colon = position.colon + dc;
			if (!this.isInBounds(row, colon)) continue;
			const target = board[row][colon];
			if (target && target.color !== color) moves.push({ to: { row, colon }, special: row === promotionRow ? "promotion" : undefined });
			else if (enPassant && enPassant.row === row && enPassant.colon === colon) moves.push({ to: { row, colon }, special: "en_passant" });
		}
		return moves;
	}

	private getSlidingMoves(position: Position, color: Color, board: InternalBoard, dirs: ReadonlyArray<readonly [number, number]>): MoveCandidate[] {
		const moves: MoveCandidate[] = [];
		for (const [dr, dc] of dirs) {
			let row = position.row + dr;
			let colon = position.colon + dc;
			while (this.isInBounds(row, colon)) {
				const target = board[row][colon];
				if (!target) moves.push({ to: { row, colon } });
				else {
					if (target.color !== color) moves.push({ to: { row, colon } });
					break;
				}
				row += dr;
				colon += dc;
			}
		}
		return moves;
	}

	private getKingMoves(position: Position, color: Color, board: InternalBoard): MoveCandidate[] {
		const moves: MoveCandidate[] = [];
		for (const [dr, dc] of KING_OFFSETS) {
			const row = position.row + dr, colon = position.colon + dc;
			if (!this.isInBounds(row, colon)) continue;
			const target = board[row][colon];
			if (!target || target.color !== color) moves.push({ to: { row, colon } });
		}
		const king = board[position.row][position.colon];
		if (!king || king.hasMoved || this.isKingInCheck(color, board)) return moves;
		const enemy = this.otherColor(color);
		const row = color === "White" ? 7 : 0;
		const rookK = board[row][7];
		if (rookK && rookK.type === "rook" && rookK.color === color && !rookK.hasMoved && !board[row][5] && !board[row][6] &&
			!this.isSquareAttacked(board, { row, colon: 5 }, enemy) && !this.isSquareAttacked(board, { row, colon: 6 }, enemy)) {
			moves.push({ to: { row, colon: 6 }, special: "castle_kingside" });
		}
		const rookQ = board[row][0];
		if (rookQ && rookQ.type === "rook" && rookQ.color === color && !rookQ.hasMoved && !board[row][1] && !board[row][2] && !board[row][3] &&
			!this.isSquareAttacked(board, { row, colon: 3 }, enemy) && !this.isSquareAttacked(board, { row, colon: 2 }, enemy)) {
			moves.push({ to: { row, colon: 2 }, special: "castle_queenside" });
		}
		return moves;
	}

	private applyMove(board: InternalBoard, from: Position, candidate: MoveCandidate, promotionChoice: PromotionPiece): ApplyResult {
		const next = this.cloneBoard(board);
		const piece = next[from.row][from.colon];
		if (!piece) return { board: next, captured: false, pawnMoved: false, newEnPassantTarget: null };
		let captured = false;
		const pawnMoved = piece.type === "pion";
		let newEnPassantTarget: EnPassantState = null;

		if (candidate.special === "en_passant" && this.enPassantTarget) {
			const c = this.enPassantTarget;
			if (next[c.captureRow][c.captureColon]) captured = true;
			next[c.captureRow][c.captureColon] = null;
		} else if (next[candidate.to.row][candidate.to.colon]) captured = true;

		next[candidate.to.row][candidate.to.colon] = { ...piece, hasMoved: true };
		next[from.row][from.colon] = null;

		if (candidate.special === "castle_kingside") {
			const rook = next[from.row][7];
			next[from.row][5] = rook ? { ...rook, hasMoved: true } : null;
			next[from.row][7] = null;
		}
		if (candidate.special === "castle_queenside") {
			const rook = next[from.row][0];
			next[from.row][3] = rook ? { ...rook, hasMoved: true } : null;
			next[from.row][0] = null;
		}

		const movedPiece = next[candidate.to.row][candidate.to.colon];
		if (movedPiece && movedPiece.type === "pion") {
			const promotionRow = movedPiece.color === "White" ? 0 : 7;
			if (candidate.to.row === promotionRow) {
				next[candidate.to.row][candidate.to.colon] = { type: promotionChoice, color: movedPiece.color, hasMoved: true };
			}
			const delta = candidate.to.row - from.row;
			if (Math.abs(delta) === 2) {
				newEnPassantTarget = { row: from.row + delta / 2, colon: from.colon, captureRow: candidate.to.row, captureColon: from.colon };
			}
		}
		return { board: next, captured, pawnMoved, newEnPassantTarget };
	}

	private findKing(board: InternalBoard, color: Color): Position | null {
		for (let row = 0; row < 8; row += 1) for (let colon = 0; colon < 8; colon += 1) {
			const p = board[row][colon];
			if (p && p.type === "king" && p.color === color) return { row, colon };
		}
		return null;
	}
	private isKingInCheck(color: Color, board: InternalBoard): boolean {
		const king = this.findKing(board, color);
		if (!king) return false;
		return this.isSquareAttacked(board, king, this.otherColor(color));
	}
	private isSquareAttacked(board: InternalBoard, square: Position, byColor: Color): boolean {
		const pawnDir = byColor === "White" ? -1 : 1;
		const pawnRow = square.row - pawnDir;
		for (const off of [-1, 1]) {
			const col = square.colon + off;
			if (!this.isInBounds(pawnRow, col)) continue;
			const p = board[pawnRow][col];
			if (p && p.color === byColor && p.type === "pion") return true;
		}
		for (const [dr, dc] of KNIGHT_OFFSETS) {
			const row = square.row + dr, col = square.colon + dc;
			if (!this.isInBounds(row, col)) continue;
			const p = board[row][col];
			if (p && p.color === byColor && p.type === "knight") return true;
		}
		for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
			let row = square.row + dr, col = square.colon + dc;
			while (this.isInBounds(row, col)) {
				const p = board[row][col];
				if (p) { if (p.color === byColor && (p.type === "rook" || p.type === "queen")) return true; break; }
				row += dr; col += dc;
			}
		}
		for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]] as const) {
			let row = square.row + dr, col = square.colon + dc;
			while (this.isInBounds(row, col)) {
				const p = board[row][col];
				if (p) { if (p.color === byColor && (p.type === "bishop" || p.type === "queen")) return true; break; }
				row += dr; col += dc;
			}
		}
		for (const [dr, dc] of KING_OFFSETS) {
			const row = square.row + dr, col = square.colon + dc;
			if (!this.isInBounds(row, col)) continue;
			const p = board[row][col];
			if (p && p.color === byColor && p.type === "king") return true;
		}
		return false;
	}

	private hasAnyLegalMove(color: Color, board: InternalBoard): boolean {
		for (let row = 0; row < 8; row += 1) for (let colon = 0; colon < 8; colon += 1) {
			const piece = board[row][colon];
			if (!piece || piece.color !== color) continue;
			for (const candidate of this.getPseudoMoves({ row, colon }, piece, board, this.enPassantTarget)) {
				const simulated = this.applyMove(board, { row, colon }, candidate, "queen");
				if (!this.isKingInCheck(color, simulated.board)) return true;
			}
		}
		return false;
	}
	private isCheckmate(color: Color, board: InternalBoard): boolean { return this.isKingInCheck(color, board) && !this.hasAnyLegalMove(color, board); }
	private isStalemate(color: Color, board: InternalBoard): boolean { return !this.isKingInCheck(color, board) && !this.hasAnyLegalMove(color, board); }

	private isInsufficientMaterial(board: InternalBoard): boolean {
		const nonKings: Array<{ type: PieceType; row: number; colon: number }> = [];
		for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
			const piece = board[row][col];
			if (piece && piece.type !== "king") nonKings.push({ type: piece.type, row, colon: col });
		}
		if (nonKings.length === 0) return true;
		if (nonKings.length === 1) return nonKings[0].type === "bishop" || nonKings[0].type === "knight";
		if (nonKings.every((p) => p.type === "bishop")) {
			return new Set(nonKings.map((p) => (p.row + p.colon) % 2)).size === 1;
		}
		return false;
	}

	private getCastlingRights(board: InternalBoard): string {
		let rights = "";
		const wk = board[7][4], bk = board[0][4];
		if (wk && wk.type === "king" && !wk.hasMoved) {
			const a = board[7][0], h = board[7][7];
			if (h && h.type === "rook" && !h.hasMoved) rights += "K";
			if (a && a.type === "rook" && !a.hasMoved) rights += "Q";
		}
		if (bk && bk.type === "king" && !bk.hasMoved) {
			const a = board[0][0], h = board[0][7];
			if (h && h.type === "rook" && !h.hasMoved) rights += "k";
			if (a && a.type === "rook" && !a.hasMoved) rights += "q";
		}
		return rights || "-";
	}
	private getPositionKey(board: InternalBoard, player: Color, enPassant: EnPassantState): string {
		const pieces = board.map((r) => r.map((p) => p ? `${p.color[0]}${p.type[0]}${p.hasMoved ? "1" : "0"}` : ".").join("")).join("/");
		const ep = enPassant ? `${enPassant.row},${enPassant.colon}` : "-";
		return `${pieces}|${player}|${this.getCastlingRights(board)}|${ep}`;
	}
	private trackCurrentPosition(): void {
		const key = this.getPositionKey(this.board, this.currentPlayer, this.enPassantTarget);
		this.positionCounts.set(key, (this.positionCounts.get(key) ?? 0) + 1);
	}
	private isInBounds(row: number, colon: number): boolean { return row >= 0 && row < 8 && colon >= 0 && colon < 8; }
	private otherColor(color: Color): Color { return color === "White" ? "Black" : "White"; }
	private cloneBoard(board: InternalBoard): InternalBoard { return board.map((r) => r.map((p) => (p ? { ...p } : null))); }
}

type OnlineChessSession = {
	id: string;
	board: Board;
	currentPlayer: Color;
	gameStatus: string;
	moveCount: number;
	hasBlackPlayer: boolean;
	updatedAt: number;
};

let chessGame: ChessGame | null = null;
let onlineGameId: string | null = null;
let onlinePlayerColor: Color | null = null;
let onlineSpectator = false;
let pollTimer: number | null = null;
let currentGameRewarded = false;
let matchmakingPollTimer: number | null = null;

function getCurrentUserIdFromToken(): number | null {
	const token = localStorage.getItem("token");
	if (!token) return null;
	const payload = token.split(".")[1];
	if (!payload) return null;
	try {
		const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { id?: number | string };
		const id = Number(json.id);
		return Number.isFinite(id) && id > 0 ? id : null;
	} catch {
		return null;
	}
}

function addLocalChessXpForCurrentUser(xpGain: number): boolean {
	const userId = getCurrentUserIdFromToken();
	if (!userId) return false;
	const key = `chess-local-xp-${userId}`;
	const currentValue = Number(localStorage.getItem(key) ?? "0");
	const safeCurrentValue = Number.isFinite(currentValue) && currentValue > 0 ? currentValue : 0;
	localStorage.setItem(key, String(safeCurrentValue + xpGain));
	return true;
}

function isFinishedStatus(status: string): boolean {
	return (
		status.startsWith("checkmate ")
		|| status.startsWith("stalemate ")
		|| status.startsWith("draw ")
		|| status.startsWith("forfeit ")
	);
}

function getWinnerColorFromStatus(status: string): Color | null {
	if (status.startsWith("checkmate ")) {
		const defeatedColor = status.slice("checkmate ".length) as Color;
		if (defeatedColor !== "White" && defeatedColor !== "Black") return null;
		return defeatedColor === "White" ? "Black" : "White";
	}
	if (status.startsWith("forfeit ")) {
		const forfeiting = status.slice("forfeit ".length) as Color;
		if (forfeiting !== "White" && forfeiting !== "Black") return null;
		return forfeiting === "White" ? "Black" : "White";
	}
	return null;
}

function formatChessStatusForDisplay(status: string): string {
	if (status.startsWith("forfeit White")) return t("chess-status-forfeit-white");
	if (status.startsWith("forfeit Black")) return t("chess-status-forfeit-black");
	return status;
}

function maybeRewardCurrentUserXp(): void {
	if (!chessGame || currentGameRewarded || onlineSpectator) return;
	const status = chessGame.getGameStatus();
	if (!isFinishedStatus(status)) return;

	let xpGain = 25;
	if (inOnlineMode()) {
		const winnerColor = getWinnerColorFromStatus(status);
		if (winnerColor && onlinePlayerColor === winnerColor) {
			xpGain = 30;
		}
	}

	const rewarded = addLocalChessXpForCurrentUser(xpGain);
	currentGameRewarded = true;
	if (rewarded) {
		window.dispatchEvent(new CustomEvent("chess-xp-updated", { detail: { xpGain, status } }));
		alert(`+${xpGain} XP`);
	}
}

function getOrCreateClientId(): string {
	const key = "chessClientId";
	const existing = localStorage.getItem(key);
	if (existing) return existing;
	const generated = globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random()}`;
	localStorage.setItem(key, generated);
	return generated;
}

const localClientId = getOrCreateClientId();
const inOnlineMode = (): boolean => Boolean(onlineGameId && (onlinePlayerColor !== null || onlineSpectator));

function isActiveOnlineGame(): boolean {
	return inOnlineMode() && !onlineSpectator && chessGame !== null && !isFinishedStatus(chessGame.getGameStatus());
}

let unloadForfeitListenerAttached = false;

function attachOnlineChessUnloadForfeit(): void {
	if (unloadForfeitListenerAttached) return;
	unloadForfeitListenerAttached = true;
	window.addEventListener("pagehide", (event: PageTransitionEvent) => {
		if (event.persisted) return;
		if (!isActiveOnlineGame()) return;
		const gameId = onlineGameId;
		if (!gameId) return;
		const url = buildApiUrl(`/chess-games/${gameId}/forfeit`);
		const body = JSON.stringify({ playerId: getCurrentPlayerIdentity() });
		const blob = new Blob([body], { type: "application/json" });
		if (!navigator.sendBeacon(url, blob)) {
			void fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body,
				keepalive: true,
			});
		}
	});
}

function clearOnlineSessionState(): void {
	stopOnlineSync();
	onlineGameId = null;
	onlinePlayerColor = null;
	onlineSpectator = false;
}

export async function abandonOnlineChessIfNeeded(): Promise<void> {
	if (!inOnlineMode()) return;
	if (onlineSpectator) {
		clearOnlineSessionState();
		return;
	}
	if (chessGame && isFinishedStatus(chessGame.getGameStatus())) {
		clearOnlineSessionState();
		return;
	}
	if (!isActiveOnlineGame()) return;
	const gameId = onlineGameId;
	if (!gameId) return;
	const playerId = getCurrentPlayerIdentity();
	try {
		await fetch(buildApiUrl(`/chess-games/${gameId}/forfeit`), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ playerId }),
		});
	} catch {
		
	}
	clearOnlineSessionState();
}

function getCurrentPlayerIdentity(): string {
	const userId = getCurrentUserIdFromToken();
	if (userId) return `user-${userId}`;
	return localClientId;
}

async function readApiError(response: Response, fallback: string): Promise<string> {
	try {
		const payload = await response.json() as { error?: string };
		if (payload.error && payload.error.trim()) return payload.error;
		return fallback;
	} catch {
		return fallback;
	}
}

function stopOnlineSync(): void {
	if (pollTimer !== null) {
		window.clearInterval(pollTimer);
		pollTimer = null;
	}
}

function stopMatchmakingPoll(): void {
	if (matchmakingPollTimer !== null) {
		window.clearInterval(matchmakingPollTimer);
		matchmakingPollTimer = null;
	}
}

async function leaveMatchmakingQueue(): Promise<void> {
	const playerId = getCurrentPlayerIdentity();
	try {
		await fetch(buildApiUrl("/chess-games/matchmaking/leave"), {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ playerId }),
		});
	} catch {
	}
}

function startOnlineFromMatchPayload(data: {
	gameId: string;
	color: Color;
	board: Board;
	currentPlayer: Color;
	gameStatus: string;
}): void {
	onlineGameId = data.gameId;
	onlinePlayerColor = data.color;
	onlineSpectator = false;
	if (!chessGame) chessGame = new ChessGame("White");
	chessGame.loadState({
		board: data.board,
		currentPlayer: data.currentPlayer,
		gameStatus: data.gameStatus,
		enPassantTarget: null,
		halfMoveClock: 0,
		positionHistory: [],
	});
	currentGameRewarded = false;
	startOnlineSync();
	renderBoard();
}

function renderMatchmakingWaiting(onCancel: () => void): void {
	const chessB = document.getElementById("chess-board");
	if (!chessB) return;
	chessB.innerHTML = "";
	const wrap = document.createElement("div");
	wrap.className = "chess-mm-waiting";
	const msg = document.createElement("p");
	msg.textContent = t("chess-mm-waiting");
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "chess-mm-cancel-btn";
	btn.textContent = t("chess-mm-cancel");
	btn.addEventListener("click", onCancel);
	wrap.append(msg, btn);
	chessB.append(wrap);
}

async function startMatchmaking(): Promise<void> {
	if (!getCurrentUserIdFromToken()) {
		alert(t("chess-mm-login"));
		return;
	}
	stopMatchmakingPoll();
	stopOnlineSync();
	const playerId = getCurrentPlayerIdentity();
	const joinRes = await fetch(buildApiUrl("/chess-games/matchmaking/join"), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ playerId }),
	});
	if (!joinRes.ok) {
		alert(await readApiError(joinRes, t("chess-mm-error")));
		return;
	}
	const joinData = await joinRes.json() as {
		status?: string;
		gameId?: string;
		color?: Color;
		password?: string;
		board?: Board;
		currentPlayer?: Color;
		gameStatus?: string;
	};
	if (joinData.status === "matched" && joinData.gameId && joinData.color && joinData.password && joinData.board && joinData.currentPlayer && joinData.gameStatus) {
		startOnlineFromMatchPayload({
			gameId: joinData.gameId,
			color: joinData.color,
			board: joinData.board,
			currentPlayer: joinData.currentPlayer,
			gameStatus: joinData.gameStatus,
		});
		alert(t("chess-mm-found"));
		return;
	}
	const cancelMatchmaking = async (): Promise<void> => {
		stopMatchmakingPoll();
		await leaveMatchmakingQueue();
		colorSelection();
	};
	renderMatchmakingWaiting(() => { void cancelMatchmaking(); });
	matchmakingPollTimer = window.setInterval(async () => {
		const statusRes = await fetch(
			buildApiUrl(`/chess-games/matchmaking/status?playerId=${encodeURIComponent(playerId)}`),
		);
		if (!statusRes.ok) return;
		const statusData = await statusRes.json() as typeof joinData;
		if (statusData.status !== "matched") return;
		if (!statusData.gameId || !statusData.color || !statusData.password || !statusData.board || !statusData.currentPlayer || !statusData.gameStatus) return;

		stopMatchmakingPoll();
		startOnlineFromMatchPayload({
			gameId: statusData.gameId,
			color: statusData.color,
			board: statusData.board,
			currentPlayer: statusData.currentPlayer,
			gameStatus: statusData.gameStatus,
		});
		alert(t("chess-mm-found"));
	}, 1200);
}

async function createOnlineGame(): Promise<void> {
	stopMatchmakingPoll();
	const password = window.prompt("Choisis un mot de passe pour la partie");
	if (!password || !password.trim()) {
		alert("Création annulée: mot de passe requis");
		return;
	}

	const response = await fetch(buildApiUrl("/chess-games"), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ playerId: getCurrentPlayerIdentity(), password: password.trim() }),
	});
	if (!response.ok) return alert(await readApiError(response, "Impossible de créer la partie en ligne"));
	const data = await response.json() as { gameId: string; color: Color } & OnlineChessSession;
	onlineGameId = data.gameId;
	onlinePlayerColor = data.color;
	onlineSpectator = false;
	if (!chessGame) chessGame = new ChessGame("White");
	chessGame.loadState({ board: data.board, currentPlayer: data.currentPlayer, gameStatus: data.gameStatus, enPassantTarget: null, halfMoveClock: 0, positionHistory: [] });
	currentGameRewarded = false;
	startOnlineSync();
	renderBoard();
	alert(`Partie créée. Code: ${data.gameId}`);
}

async function joinOnlineGame(gameId: string, password: string): Promise<void> {
	stopMatchmakingPoll();
	const response = await fetch(buildApiUrl(`/chess-games/${gameId}/join`), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ playerId: getCurrentPlayerIdentity(), password: password.trim() }),
	});
	if (!response.ok) return alert(await readApiError(response, "Impossible de rejoindre la partie"));
	const data = await response.json() as { gameId: string; color: Color } & OnlineChessSession;
	onlineGameId = data.gameId;
	onlinePlayerColor = data.color;
	onlineSpectator = false;
	if (!chessGame) chessGame = new ChessGame("White");
	chessGame.loadState({ board: data.board, currentPlayer: data.currentPlayer, gameStatus: data.gameStatus, enPassantTarget: null, halfMoveClock: 0, positionHistory: [] });
	currentGameRewarded = false;
	startOnlineSync();
	renderBoard();
}

async function spectateOnlineGame(gameId: string, password: string): Promise<void> {
	stopMatchmakingPoll();
	const response = await fetch(buildApiUrl(`/chess-games/${gameId}/spectate`), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ password: password.trim() }),
	});
	if (!response.ok) return alert(await readApiError(response, t("chess-spectate-error")));
	const data = await response.json() as { gameId: string; color?: string } & OnlineChessSession;
	onlineGameId = data.gameId;
	onlinePlayerColor = null;
	onlineSpectator = true;
	if (!chessGame) chessGame = new ChessGame("White");
	chessGame.loadState({ board: data.board, currentPlayer: data.currentPlayer, gameStatus: data.gameStatus, enPassantTarget: null, halfMoveClock: 0, positionHistory: [] });
	currentGameRewarded = false;
	startOnlineSync();
	renderBoard();
}

async function refreshOnlineState(): Promise<void> {
	if (!onlineGameId || !chessGame) return;
	const path = onlineSpectator
		? `/chess-games/${onlineGameId}`
		: `/chess-games/${onlineGameId}?playerId=${encodeURIComponent(getCurrentPlayerIdentity())}`;
	const response = await fetch(buildApiUrl(path));
	if (!response.ok) return;
	const data = await response.json() as OnlineChessSession;
	chessGame.loadState({ board: data.board, currentPlayer: data.currentPlayer, gameStatus: data.gameStatus, enPassantTarget: null, halfMoveClock: 0, positionHistory: [] });
	renderBoard();
}

function startOnlineSync(): void {
	stopOnlineSync();
	pollTimer = window.setInterval(() => { void refreshOnlineState(); }, CHESS_POLL_INTERVAL_MS);
}

async function pushOnlineMove(): Promise<boolean> {
	if (!onlineGameId || !chessGame) return false;
	const state = chessGame.getSerializableState();
	const response = await fetch(buildApiUrl(`/chess-games/${onlineGameId}/move`), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ playerId: getCurrentPlayerIdentity(), board: state.board, currentPlayer: state.currentPlayer, gameStatus: state.gameStatus }),
	});
	return response.ok;
}

function askPromotionChoice(): PromotionPiece {
	const value = window.prompt("Promotion: queen, rook, bishop, knight", "queen");
	if (value === "rook" || value === "bishop" || value === "knight") return value;
	return "queen";
}

function getPieceSymbol(piece: Piece): string {
	const symbols: Record<string, string> = {
		"White-pion": "♙", "Black-pion": "♟",
		"White-rook": "♖", "Black-rook": "♜",
		"White-knight": "♘", "Black-knight": "♞",
		"White-bishop": "♗", "Black-bishop": "♝",
		"White-queen": "♕", "Black-queen": "♛",
		"White-king": "♔", "Black-king": "♚",
	};
	return symbols[`${piece.color}-${piece.type}`] ?? "";
}

function renderBoard(): void {
	const chessB = document.getElementById("chess-board");
	if (!chessB || !chessGame) return;
	maybeRewardCurrentUserXp();
	chessB.innerHTML = "";
	const board = chessGame.getBoard();
	const selected = chessGame.getSelectedPiece();
	const possible = chessGame.getPossibleMoves();
	const current = chessGame.getcurrentPlayer();
	const status = chessGame.getGameStatus();
	const statusLabel = formatChessStatusForDisplay(status);
	const onlineLabel = onlineSpectator ? t("chess-mode-online-spectator") : onlinePlayerColor;
	const onlineInfo = inOnlineMode()
		? `<span style="margin-left:20px;">${t("chess-mode-inline")} (${onlineLabel})</span><span style="margin-left:20px;">${t("chess-code-inline")}: ${onlineGameId}</span>`
		: `<span style="margin-left:20px;">${t("chess-mode-local-inline")}</span>`;
	let html = `<div style="margin-bottom:10px;"><strong>Tour: ${current === "White" ? "Blanc" : "Noir"}</strong><span style="margin-left:20px;">${statusLabel}</span>${onlineInfo}</div><div style="display:inline-block;border:2px solid #333;">`;
	for (let row = 7; row >= 0; row -= 1) {
		html += '<div style="display:flex;">';
		for (let colon = 0; colon < 8; colon += 1) {
			const piece = board[row][colon];
			const isLight = (row + colon) % 2 === 0;
			const isSelected = selected && selected.row === row && selected.colon === colon;
			const isPossible = possible.some((m) => m.row === row && m.colon === colon);
			let bg = isLight ? "#f0d9b5" : "#b58863";
			if (isSelected) bg = "#f7f769";
			else if (isPossible) bg = "#86f769";
			const cursor = onlineSpectator ? "default" : "pointer";
			html += `<div class="chess-square" data-row="${row}" data-colon="${colon}" style="width:60px;height:60px;background-color:${bg};display:flex;align-items:center;justify-content:center;cursor:${cursor};border:1px solid #333;font-size:40px;">${piece ? getPieceSymbol(piece) : ""}</div>`;
		}
		html += "</div>";
	}
	html += "</div>";
	chessB.insertAdjacentHTML("beforeend", html);
	chessB.querySelectorAll(".chess-square").forEach((el) => el.addEventListener("click", handleSquareClick));
}

function handleSquareClick(event: Event): void {
	if (!chessGame) return;
	if (onlineSpectator) return;
	if (isFinishedStatus(chessGame.getGameStatus())) return;
	if (inOnlineMode() && onlinePlayerColor !== null && onlinePlayerColor !== chessGame.getcurrentPlayer()) return;
	const target = event.currentTarget as HTMLElement;
	const row = Number.parseInt(target.dataset.row ?? "0", 10);
	const colon = Number.parseInt(target.dataset.colon ?? "0", 10);
	const clickPos: Position = { row, colon };
	const selected = chessGame.getSelectedPiece();
	if (selected && selected.row === row && selected.colon === colon) {
		chessGame.clearSelection();
		renderBoard();
		return;
	}
	if (!selected) {
		chessGame.selectPiece(clickPos);
		renderBoard();
		return;
	}
	const movingPiece = chessGame.getBoard()[selected.row][selected.colon];
	const needPromotion = movingPiece?.type === "pion" && (row === 0 || row === 7);
	const promotion = needPromotion ? askPromotionChoice() : "queen";
	if (!chessGame.movePiece(selected, clickPos, promotion)) {
		chessGame.selectPiece(clickPos);
		renderBoard();
		return;
	}
	renderBoard();
	if (inOnlineMode()) {
		void (async () => {
			const synced = await pushOnlineMove();
			if (!synced) {
				alert("Le coup n'a pas pu être synchronisé. Rechargement.");
				await refreshOnlineState();
			}
		})();
	}
}

function colorSelection(): void {
	const chessB = document.getElementById("chess-board");
	if (!chessB) return;
	chessB.innerHTML = "";
	currentGameRewarded = false;
	const root = document.createElement("div");
	root.className = "chess-mode";
	const title = document.createElement("h2");
	title.className = "chess-mode__title";
	title.textContent = t("chess-mode-title");
	const wrap = document.createElement("div");
	wrap.className = "chess-mode__actions";
	const localWhite = document.createElement("button");
	localWhite.type = "button";
	localWhite.textContent = t("chess-mode-local-white");
	localWhite.addEventListener("click", () => startLocalGame("White"));
	const localBlack = document.createElement("button");
	localBlack.type = "button";
	localBlack.textContent = t("chess-mode-local-black");
	localBlack.addEventListener("click", () => startLocalGame("Black"));
	const host = document.createElement("button");
	host.type = "button";
	host.textContent = t("chess-mode-online-host");
	host.addEventListener("click", () => { void createOnlineGame(); });
	const join = document.createElement("button");
	join.type = "button";
	join.textContent = t("chess-mode-online-join");
	join.addEventListener("click", () => {
		const gameId = window.prompt(t("chess-prompt-game-id"));
		if (!gameId) return;
		const password = window.prompt(t("chess-prompt-password"));
		if (!password || !password.trim()) return;
		void joinOnlineGame(gameId.trim(), password.trim());
	});
	const mm = document.createElement("button");
	mm.type = "button";
	mm.textContent = t("chess-mm-button");
	mm.addEventListener("click", () => { void startMatchmaking(); });
	const spectate = document.createElement("button");
	spectate.type = "button";
	spectate.textContent = t("chess-mode-spectate");
	spectate.addEventListener("click", () => {
		const gameId = window.prompt(t("chess-prompt-game-id"));
		if (!gameId) return;
		const password = window.prompt(t("chess-prompt-password"));
		if (!password || !password.trim()) return;
		void spectateOnlineGame(gameId.trim(), password.trim());
	});
	wrap.append(localWhite, localBlack, host, join, mm, spectate);
	root.append(title, wrap);
	chessB.append(root);
}

function startLocalGame(color: Color): void {
	stopMatchmakingPoll();
	stopOnlineSync();
	onlineGameId = null;
	onlinePlayerColor = null;
	onlineSpectator = false;
	chessGame = new ChessGame(color);
	currentGameRewarded = false;
	renderBoard();
}

export function initChess(): void {
	attachOnlineChessUnloadForfeit();
	const chessB = document.getElementById("chess-board");
	if (!chessB) return;
	colorSelection();
}

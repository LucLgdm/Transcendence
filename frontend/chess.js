import { buildApiUrl } from "./api.js";
const CHESS_POLL_INTERVAL_MS = 1200;
const KNIGHT_OFFSETS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_OFFSETS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
export class ChessGame {
    constructor(_startingColor) {
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
    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        board[0][0] = { type: "rook", color: "Black", hasMoved: false };
        board[0][1] = { type: "knight", color: "Black", hasMoved: false };
        board[0][2] = { type: "bishop", color: "Black", hasMoved: false };
        board[0][3] = { type: "queen", color: "Black", hasMoved: false };
        board[0][4] = { type: "king", color: "Black", hasMoved: false };
        board[0][5] = { type: "bishop", color: "Black", hasMoved: false };
        board[0][6] = { type: "knight", color: "Black", hasMoved: false };
        board[0][7] = { type: "rook", color: "Black", hasMoved: false };
        for (let i = 0; i < 8; i += 1)
            board[1][i] = { type: "pion", color: "Black", hasMoved: false };
        board[7][0] = { type: "rook", color: "White", hasMoved: false };
        board[7][1] = { type: "knight", color: "White", hasMoved: false };
        board[7][2] = { type: "bishop", color: "White", hasMoved: false };
        board[7][3] = { type: "queen", color: "White", hasMoved: false };
        board[7][4] = { type: "king", color: "White", hasMoved: false };
        board[7][5] = { type: "bishop", color: "White", hasMoved: false };
        board[7][6] = { type: "knight", color: "White", hasMoved: false };
        board[7][7] = { type: "rook", color: "White", hasMoved: false };
        for (let i = 0; i < 8; i += 1)
            board[6][i] = { type: "pion", color: "White", hasMoved: false };
        return board;
    }
    getBoard() { return this.board; }
    getcurrentPlayer() { return this.currentPlayer; }
    getSelectedPiece() { return this.selectedPiece; }
    getPossibleMoves() { return this.possibleMoves; }
    getGameStatus() { return this.gameStatus; }
    clearSelection() { this.selectedPiece = null; this.possibleMoves = []; }
    getSerializableState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            gameStatus: this.gameStatus,
            enPassantTarget: this.enPassantTarget,
            halfMoveClock: this.halfMoveClock,
            positionHistory: [...this.positionCounts.entries()],
        };
    }
    loadState(state) {
        this.board = this.cloneBoard(state.board);
        this.currentPlayer = state.currentPlayer;
        this.gameStatus = state.gameStatus;
        this.enPassantTarget = state.enPassantTarget ?? null;
        this.halfMoveClock = state.halfMoveClock ?? 0;
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.positionCounts = new Map(state.positionHistory ?? []);
        if (this.positionCounts.size === 0)
            this.trackCurrentPosition();
    }
    selectPiece(position) {
        if (!this.isInBounds(position.row, position.colon))
            return false;
        const piece = this.board[position.row][position.colon];
        if (!piece || piece.color !== this.currentPlayer)
            return false;
        this.selectedPiece = position;
        this.possibleMoves = this.getLegalMoveCandidates(position).map((c) => c.to);
        return true;
    }
    movePiece(from, to, promotionChoice = "queen") {
        const piece = this.board[from.row]?.[from.colon];
        if (!piece || piece.color !== this.currentPlayer)
            return false;
        const selected = this.getLegalMoveCandidates(from).find((c) => c.to.row === to.row && c.to.colon === to.colon);
        if (!selected)
            return false;
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
    resetGame() {
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
    updateGameStatus() {
        const player = this.currentPlayer;
        if (this.isCheckmate(player, this.board))
            return void (this.gameStatus = `checkmate ${player}`);
        if (this.isStalemate(player, this.board))
            return void (this.gameStatus = `stalemate ${player}`);
        if (this.isInsufficientMaterial(this.board))
            return void (this.gameStatus = "draw insufficient material");
        if (this.halfMoveClock >= 100)
            return void (this.gameStatus = "draw fifty-move rule");
        if ((this.positionCounts.get(this.getPositionKey(this.board, this.currentPlayer, this.enPassantTarget)) ?? 0) >= 3) {
            return void (this.gameStatus = "draw threefold repetition");
        }
        if (this.isKingInCheck(player, this.board))
            return void (this.gameStatus = `check ${player}`);
        this.gameStatus = "inProgress";
    }
    getLegalMoveCandidates(position) {
        const piece = this.board[position.row]?.[position.colon];
        if (!piece)
            return [];
        return this.getPseudoMoves(position, piece, this.board, this.enPassantTarget).filter((candidate) => {
            const sim = this.applyMove(this.board, position, candidate, "queen");
            return !this.isKingInCheck(piece.color, sim.board);
        });
    }
    getPseudoMoves(position, piece, board, enPassant) {
        if (piece.type === "pion")
            return this.getPawnMoves(position, piece.color, board, enPassant);
        if (piece.type === "rook")
            return this.getSlidingMoves(position, piece.color, board, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
        if (piece.type === "bishop")
            return this.getSlidingMoves(position, piece.color, board, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
        if (piece.type === "queen")
            return this.getSlidingMoves(position, piece.color, board, [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]);
        if (piece.type === "knight") {
            return KNIGHT_OFFSETS.flatMap(([dr, dc]) => {
                const row = position.row + dr, colon = position.colon + dc;
                if (!this.isInBounds(row, colon))
                    return [];
                const target = board[row][colon];
                return (!target || target.color !== piece.color) ? [{ to: { row, colon } }] : [];
            });
        }
        return this.getKingMoves(position, piece.color, board);
    }
    getPawnMoves(position, color, board, enPassant) {
        const moves = [];
        const direction = color === "White" ? -1 : 1;
        const startRow = color === "White" ? 6 : 1;
        const promotionRow = color === "White" ? 0 : 7;
        const oneStep = position.row + direction;
        if (this.isInBounds(oneStep, position.colon) && !board[oneStep][position.colon]) {
            moves.push({ to: { row: oneStep, colon: position.colon }, special: oneStep === promotionRow ? "promotion" : undefined });
            const twoStep = position.row + 2 * direction;
            if (position.row === startRow && !board[twoStep][position.colon])
                moves.push({ to: { row: twoStep, colon: position.colon } });
        }
        for (const dc of [-1, 1]) {
            const row = position.row + direction;
            const colon = position.colon + dc;
            if (!this.isInBounds(row, colon))
                continue;
            const target = board[row][colon];
            if (target && target.color !== color)
                moves.push({ to: { row, colon }, special: row === promotionRow ? "promotion" : undefined });
            else if (enPassant && enPassant.row === row && enPassant.colon === colon)
                moves.push({ to: { row, colon }, special: "en_passant" });
        }
        return moves;
    }
    getSlidingMoves(position, color, board, dirs) {
        const moves = [];
        for (const [dr, dc] of dirs) {
            let row = position.row + dr;
            let colon = position.colon + dc;
            while (this.isInBounds(row, colon)) {
                const target = board[row][colon];
                if (!target)
                    moves.push({ to: { row, colon } });
                else {
                    if (target.color !== color)
                        moves.push({ to: { row, colon } });
                    break;
                }
                row += dr;
                colon += dc;
            }
        }
        return moves;
    }
    getKingMoves(position, color, board) {
        const moves = [];
        for (const [dr, dc] of KING_OFFSETS) {
            const row = position.row + dr, colon = position.colon + dc;
            if (!this.isInBounds(row, colon))
                continue;
            const target = board[row][colon];
            if (!target || target.color !== color)
                moves.push({ to: { row, colon } });
        }
        const king = board[position.row][position.colon];
        if (!king || king.hasMoved || this.isKingInCheck(color, board))
            return moves;
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
    applyMove(board, from, candidate, promotionChoice) {
        const next = this.cloneBoard(board);
        const piece = next[from.row][from.colon];
        if (!piece)
            return { board: next, captured: false, pawnMoved: false, newEnPassantTarget: null };
        let captured = false;
        const pawnMoved = piece.type === "pion";
        let newEnPassantTarget = null;
        if (candidate.special === "en_passant" && this.enPassantTarget) {
            const c = this.enPassantTarget;
            if (next[c.captureRow][c.captureColon])
                captured = true;
            next[c.captureRow][c.captureColon] = null;
        }
        else if (next[candidate.to.row][candidate.to.colon])
            captured = true;
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
    findKing(board, color) {
        for (let row = 0; row < 8; row += 1)
            for (let colon = 0; colon < 8; colon += 1) {
                const p = board[row][colon];
                if (p && p.type === "king" && p.color === color)
                    return { row, colon };
            }
        return null;
    }
    isKingInCheck(color, board) {
        const king = this.findKing(board, color);
        if (!king)
            return false;
        return this.isSquareAttacked(board, king, this.otherColor(color));
    }
    isSquareAttacked(board, square, byColor) {
        const pawnDir = byColor === "White" ? -1 : 1;
        const pawnRow = square.row - pawnDir;
        for (const off of [-1, 1]) {
            const col = square.colon + off;
            if (!this.isInBounds(pawnRow, col))
                continue;
            const p = board[pawnRow][col];
            if (p && p.color === byColor && p.type === "pion")
                return true;
        }
        for (const [dr, dc] of KNIGHT_OFFSETS) {
            const row = square.row + dr, col = square.colon + dc;
            if (!this.isInBounds(row, col))
                continue;
            const p = board[row][col];
            if (p && p.color === byColor && p.type === "knight")
                return true;
        }
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            let row = square.row + dr, col = square.colon + dc;
            while (this.isInBounds(row, col)) {
                const p = board[row][col];
                if (p) {
                    if (p.color === byColor && (p.type === "rook" || p.type === "queen"))
                        return true;
                    break;
                }
                row += dr;
                col += dc;
            }
        }
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
            let row = square.row + dr, col = square.colon + dc;
            while (this.isInBounds(row, col)) {
                const p = board[row][col];
                if (p) {
                    if (p.color === byColor && (p.type === "bishop" || p.type === "queen"))
                        return true;
                    break;
                }
                row += dr;
                col += dc;
            }
        }
        for (const [dr, dc] of KING_OFFSETS) {
            const row = square.row + dr, col = square.colon + dc;
            if (!this.isInBounds(row, col))
                continue;
            const p = board[row][col];
            if (p && p.color === byColor && p.type === "king")
                return true;
        }
        return false;
    }
    hasAnyLegalMove(color, board) {
        for (let row = 0; row < 8; row += 1)
            for (let colon = 0; colon < 8; colon += 1) {
                const piece = board[row][colon];
                if (!piece || piece.color !== color)
                    continue;
                for (const candidate of this.getPseudoMoves({ row, colon }, piece, board, this.enPassantTarget)) {
                    const simulated = this.applyMove(board, { row, colon }, candidate, "queen");
                    if (!this.isKingInCheck(color, simulated.board))
                        return true;
                }
            }
        return false;
    }
    isCheckmate(color, board) { return this.isKingInCheck(color, board) && !this.hasAnyLegalMove(color, board); }
    isStalemate(color, board) { return !this.isKingInCheck(color, board) && !this.hasAnyLegalMove(color, board); }
    isInsufficientMaterial(board) {
        const nonKings = [];
        for (let row = 0; row < 8; row += 1)
            for (let col = 0; col < 8; col += 1) {
                const piece = board[row][col];
                if (piece && piece.type !== "king")
                    nonKings.push({ type: piece.type, row, colon: col });
            }
        if (nonKings.length === 0)
            return true;
        if (nonKings.length === 1)
            return nonKings[0].type === "bishop" || nonKings[0].type === "knight";
        if (nonKings.every((p) => p.type === "bishop")) {
            return new Set(nonKings.map((p) => (p.row + p.colon) % 2)).size === 1;
        }
        return false;
    }
    getCastlingRights(board) {
        let rights = "";
        const wk = board[7][4], bk = board[0][4];
        if (wk && wk.type === "king" && !wk.hasMoved) {
            const a = board[7][0], h = board[7][7];
            if (h && h.type === "rook" && !h.hasMoved)
                rights += "K";
            if (a && a.type === "rook" && !a.hasMoved)
                rights += "Q";
        }
        if (bk && bk.type === "king" && !bk.hasMoved) {
            const a = board[0][0], h = board[0][7];
            if (h && h.type === "rook" && !h.hasMoved)
                rights += "k";
            if (a && a.type === "rook" && !a.hasMoved)
                rights += "q";
        }
        return rights || "-";
    }
    getPositionKey(board, player, enPassant) {
        const pieces = board.map((r) => r.map((p) => p ? `${p.color[0]}${p.type[0]}${p.hasMoved ? "1" : "0"}` : ".").join("")).join("/");
        const ep = enPassant ? `${enPassant.row},${enPassant.colon}` : "-";
        return `${pieces}|${player}|${this.getCastlingRights(board)}|${ep}`;
    }
    trackCurrentPosition() {
        const key = this.getPositionKey(this.board, this.currentPlayer, this.enPassantTarget);
        this.positionCounts.set(key, (this.positionCounts.get(key) ?? 0) + 1);
    }
    isInBounds(row, colon) { return row >= 0 && row < 8 && colon >= 0 && colon < 8; }
    otherColor(color) { return color === "White" ? "Black" : "White"; }
    cloneBoard(board) { return board.map((r) => r.map((p) => (p ? { ...p } : null))); }
}
let chessGame = null;
let onlineGameId = null;
let onlinePlayerColor = null;
let pollTimer = null;
function getOrCreateClientId() {
    const key = "chessClientId";
    const existing = localStorage.getItem(key);
    if (existing)
        return existing;
    const generated = globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random()}`;
    localStorage.setItem(key, generated);
    return generated;
}
const localClientId = getOrCreateClientId();
const inOnlineMode = () => Boolean(onlineGameId && onlinePlayerColor);
function stopOnlineSync() {
    if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
    }
}
async function createOnlineGame() {
    const response = await fetch(buildApiUrl("/chess-games"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: localClientId }),
    });
    if (!response.ok)
        return alert("Impossible de créer la partie en ligne");
    const data = await response.json();
    onlineGameId = data.gameId;
    onlinePlayerColor = data.color;
    if (!chessGame)
        chessGame = new ChessGame("White");
    chessGame.loadState({ board: data.board, currentPlayer: data.currentPlayer, gameStatus: data.gameStatus, enPassantTarget: null, halfMoveClock: 0, positionHistory: [] });
    startOnlineSync();
    renderBoard();
    alert(`Partie créée. Partage ce code: ${data.gameId}`);
}
async function joinOnlineGame(gameId) {
    const response = await fetch(buildApiUrl(`/chess-games/${gameId}/join`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: localClientId }),
    });
    if (!response.ok)
        return alert("Impossible de rejoindre la partie");
    const data = await response.json();
    onlineGameId = data.gameId;
    onlinePlayerColor = data.color;
    if (!chessGame)
        chessGame = new ChessGame("White");
    chessGame.loadState({ board: data.board, currentPlayer: data.currentPlayer, gameStatus: data.gameStatus, enPassantTarget: null, halfMoveClock: 0, positionHistory: [] });
    startOnlineSync();
    renderBoard();
}
async function refreshOnlineState() {
    if (!onlineGameId || !chessGame)
        return;
    const response = await fetch(buildApiUrl(`/chess-games/${onlineGameId}`));
    if (!response.ok)
        return;
    const data = await response.json();
    chessGame.loadState({ board: data.board, currentPlayer: data.currentPlayer, gameStatus: data.gameStatus, enPassantTarget: null, halfMoveClock: 0, positionHistory: [] });
    renderBoard();
}
function startOnlineSync() {
    stopOnlineSync();
    pollTimer = window.setInterval(() => { void refreshOnlineState(); }, CHESS_POLL_INTERVAL_MS);
}
async function pushOnlineMove() {
    if (!onlineGameId || !chessGame)
        return false;
    const state = chessGame.getSerializableState();
    const response = await fetch(buildApiUrl(`/chess-games/${onlineGameId}/move`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: localClientId, board: state.board, currentPlayer: state.currentPlayer, gameStatus: state.gameStatus }),
    });
    return response.ok;
}
function askPromotionChoice() {
    const value = window.prompt("Promotion: queen, rook, bishop, knight", "queen");
    if (value === "rook" || value === "bishop" || value === "knight")
        return value;
    return "queen";
}
function getPieceSymbol(piece) {
    const symbols = {
        "White-pion": "♙", "Black-pion": "♟",
        "White-rook": "♖", "Black-rook": "♜",
        "White-knight": "♘", "Black-knight": "♞",
        "White-bishop": "♗", "Black-bishop": "♝",
        "White-queen": "♕", "Black-queen": "♛",
        "White-king": "♔", "Black-king": "♚",
    };
    return symbols[`${piece.color}-${piece.type}`] ?? "";
}
function renderBoard() {
    const chessB = document.getElementById("chess-board");
    if (!chessB || !chessGame)
        return;
    chessB.innerHTML = "";
    const board = chessGame.getBoard();
    const selected = chessGame.getSelectedPiece();
    const possible = chessGame.getPossibleMoves();
    const current = chessGame.getcurrentPlayer();
    const status = chessGame.getGameStatus();
    const onlineInfo = inOnlineMode()
        ? `<span style="margin-left:20px;">Mode: En ligne (${onlinePlayerColor})</span><span style="margin-left:20px;">Code: ${onlineGameId}</span>`
        : `<span style="margin-left:20px;">Mode: Local</span>`;
    let html = `<div style="margin-bottom:10px;"><strong>Tour: ${current === "White" ? "Blanc" : "Noir"}</strong><span style="margin-left:20px;">${status}</span>${onlineInfo}</div><div style="display:inline-block;border:2px solid #333;">`;
    for (let row = 7; row >= 0; row -= 1) {
        html += '<div style="display:flex;">';
        for (let colon = 0; colon < 8; colon += 1) {
            const piece = board[row][colon];
            const isLight = (row + colon) % 2 === 0;
            const isSelected = selected && selected.row === row && selected.colon === colon;
            const isPossible = possible.some((m) => m.row === row && m.colon === colon);
            let bg = isLight ? "#f0d9b5" : "#b58863";
            if (isSelected)
                bg = "#f7f769";
            else if (isPossible)
                bg = "#86f769";
            html += `<div class="chess-square" data-row="${row}" data-colon="${colon}" style="width:60px;height:60px;background-color:${bg};display:flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid #333;font-size:40px;">${piece ? getPieceSymbol(piece) : ""}</div>`;
        }
        html += "</div>";
    }
    html += "</div>";
    chessB.insertAdjacentHTML("beforeend", html);
    chessB.querySelectorAll(".chess-square").forEach((el) => el.addEventListener("click", handleSquareClick));
}
function handleSquareClick(event) {
    if (!chessGame)
        return;
    if (inOnlineMode() && onlinePlayerColor !== chessGame.getcurrentPlayer())
        return;
    const target = event.currentTarget;
    const row = Number.parseInt(target.dataset.row ?? "0", 10);
    const colon = Number.parseInt(target.dataset.colon ?? "0", 10);
    const clickPos = { row, colon };
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
function colorSelection() {
    const chessB = document.getElementById("chess-board");
    if (!chessB)
        return;
    chessB.innerHTML = "";
    const title = document.createElement("h2");
    title.textContent = "Choisissez un mode de jeu";
    const wrap = document.createElement("div");
    const localWhite = document.createElement("button");
    localWhite.textContent = "Local (Blanc)";
    localWhite.addEventListener("click", () => startLocalGame("White"));
    const localBlack = document.createElement("button");
    localBlack.textContent = "Local (Noir)";
    localBlack.addEventListener("click", () => startLocalGame("Black"));
    const host = document.createElement("button");
    host.textContent = "En ligne: Créer une partie";
    host.addEventListener("click", () => { void createOnlineGame(); });
    const join = document.createElement("button");
    join.textContent = "En ligne: Rejoindre une partie";
    join.addEventListener("click", () => {
        const gameId = window.prompt("Entrez le code de partie");
        if (!gameId)
            return;
        void joinOnlineGame(gameId.trim());
    });
    wrap.append(localWhite, localBlack, host, join);
    chessB.append(title, wrap);
}
function startLocalGame(color) {
    stopOnlineSync();
    onlineGameId = null;
    onlinePlayerColor = null;
    chessGame = new ChessGame(color);
    renderBoard();
}
export function initChess() {
    const chessB = document.getElementById("chess-board");
    if (!chessB)
        return;
    colorSelection();
}

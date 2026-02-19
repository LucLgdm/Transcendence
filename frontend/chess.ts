import type { PieceType, Color, Piece, Position, Board, ChessGame as IChessGame } from './init-types';

type InternalBoard = (Piece | null)[][];

export class ChessGame implements IChessGame {
    private board: InternalBoard;
    private currentPlayer: Color;
    private selectedPiece: Position | null;
    private possibleMoves: Position[];
    private gameStatus: string;

    constructor() {
        this.board = this.initializeBoard();
        // faire en sorte que ca soit alleatoire
        this.currentPlayer = 'White';
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.gameStatus = 'inProgress';
    }

    private initializeBoard(): InternalBoard {
        const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

        board[0][0] = {type: 'rook', color: 'Black', hasMoved: false};
        board[0][1] = {type: 'knight', color: 'Black', hasMoved: false};
        board[0][2] = {type: 'bishop', color: 'Black', hasMoved: false};
        board[0][3] = {type: 'queen', color: 'Black', hasMoved: false};
        board[0][4] = {type: 'king', color: 'Black', hasMoved: false};
        board[0][5] = {type: 'bishop', color: 'Black', hasMoved: false};
        board[0][6] = {type: 'knight', color: 'Black', hasMoved: false};
        board[0][7] = {type: 'rook', color: 'Black', hasMoved: false};
        for (let i = 0; i < 8; i++) {
            board[1][i] = {type: 'pion', color: 'Black', hasMoved: false};
        }
        board[7][0] = {type: 'rook', color: 'White', hasMoved: false};
        board[7][1] = {type: 'knight', color: 'White', hasMoved: false};
        board[7][2] = {type: 'bishop', color: 'White', hasMoved: false};
        board[7][3] = {type: 'queen', color: 'White', hasMoved: false};
        board[7][4] = {type: 'king', color: 'White', hasMoved: false};
        board[7][5] = {type: 'bishop', color: 'White', hasMoved: false};
        board[7][6] = {type: 'knight', color: 'White', hasMoved: false};
        board[7][7] = {type: 'rook', color: 'White', hasMoved: false};
        for (let i = 0; i < 8; i++) {
            board[6][i] = {type: 'pion', color: 'White', hasMoved: false};
        }
        return board;
    }


    getBoard(): Board {
        return this.board as unknown as Board;
    }

    getcurrentPlayer(): Color {
        return this.currentPlayer;
    }

    getSelectedPiece(): Position | null {
        return this.selectedPiece;
    }

    getPossibleMoves(): Position[] {
        return this.possibleMoves;
    }

    getGameStatus(): string {
        return this.gameStatus;
    }

    selectPiece(position: Position): boolean {
        const piece = this.board[position.row]?.[position.colon];
        if (piece && piece.color === this.currentPlayer) {
            this.selectedPiece = position;
            this.possibleMoves = this.getValidMoves(position);
            return true
        }
        return false;
    }


    private findking(board: Board, color: Color): Position | null {
        for (let row = 0; row < 8; row++) {
            for (let colon = 0; colon < 8; colon++){
                const piece = board[row][colon];
                if (piece && piece.type === 'king' && piece.color === color)
                    return {row, colon};
            }
        }
        return null;
    }

    private wouldBeinchecked(board: Board, color: Color): boolean {
        const kingPosition = this.findking(board, color);
        if (!kingPosition) 
            return false;

        let otherColor: Color;
        if (color === 'White')
        {
            otherColor = 'Black';
        } else {
            otherColor = 'White';
        }
        
        for (let row = 0; row < 8; row++) {
            for (let colon = 0; colon < 8; colon++) {
                const piece = board[row][colon];
                if (piece && piece.color === otherColor) {
                    const moves = this.getPieceMove({row, colon}, piece, board);
                    if (moves.some(move => move.row === kingPosition.row && move.colon === kingPosition.colon)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private isCheck(color: Color): boolean {
        return this.wouldBeinchecked(this.board, color);
    }


    private isCheckmate(color: Color): boolean {
        if (!this.isCheck(color)) return false;

        for (let row = 0; row < 8; row++) {
            for (let colon = 0; colon < 8; colon++) {
                const piece = this.board[row][colon];
                if (piece && piece.color === color ) {
                    const validMoves = this.getValidMoves({ row, colon});
                    if (validMoves.length > 0)
                        return false;
                }
            }
        }
        return true;
    }

    private isStalemate(color: Color): boolean {
        if (this.isCheck(color)) return false;

        for (let row = 0; row < 8; row++) {
            for (let colon = 0; colon < 8; colon++) {
                const piece = this.board[row][colon];
                if (piece && piece.color === color) {
                    const validMoves = this.getValidMoves({row, colon});
                    if (validMoves.length > 0)
                        return false;
                }
            }
        }
        return true;
    }

    movePiece(from:Position, to:Position): boolean {
        const piece = this.board[from.row]?.[from.colon];
        if (!piece || piece.color !== this.currentPlayer)
            return false;
        const validMoves = this.getValidMoves(from);
        const isValidMove = validMoves.some((move: Position) => move.row === to.row && move.colon === to.colon);
        if (!isValidMove)
            return false;

        this.board[to.row][to.colon] = piece;
        this.board[from.row][from .colon] = null;
        if (piece.hasMoved === false)
            piece.hasMoved = true;

        if (piece.type === 'pion' && (to.row === 0 || to.row === 7)) {
            // a changer la promotion en fonction de ce qu'il choisit
            type: 'queen';
            color: piece.color;
            hasMoved: true;
        }

        if (this.currentPlayer === 'White')
            this.currentPlayer = 'Black';
        else
            this.currentPlayer = 'White';

        this.selectedPiece = null;
        this.possibleMoves = [];

        if (this.isCheckmate(this.currentPlayer)) {
            this.gameStatus = 'checkmate ' + this.currentPlayer;
        }
        else if (this.isCheck(this.currentPlayer)) {
            this.gameStatus = 'check ' + this.currentPlayer;
        } else if (this.isStalemate(this.currentPlayer)) {
            this.gameStatus = 'stalemate ' + this.currentPlayer;
        }
        else {
            this.gameStatus = 'inProgress';
        }
        return true;
    }

    resetGame(): void {
        this.board = this.initializeBoard();
        // faire en sorte qu'il soit l'autre couleur
        this.currentPlayer = 'White';
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.gameStatus = 'inProgress';
    }

    private getValidMoves(position: Position): Position[] {
        const piece = this.board[position.row]?.[position.colon];
        if (!piece)
            return [];

        const moves: Position[] = [];

        switch (piece.type) {
            case 'pion':
                moves.push(...this.getPionMoves(position, piece.color));
                break;
            case 'rook':
                moves.push(...this.getRookMoves(position, piece.color));
                break;
            case 'bishop':
                moves.push(...this.getBishopMoves(position, piece.color));
                break;
            case 'knight':
                moves.push(...this.getKnightMoves(position, piece.color));
                break;
            case 'queen':
                moves.push(...this.getQueenMoves(position, piece.color));
                break;
            case 'king':
                moves.push(...this.getKingMoves(position, piece.color));
                break;
        }
        return moves.filter(move => {
            const clone = this.cloneBoard();
            clone[position.row][position.colon] = null;
            clone[move.row][move.colon] = piece ? { ...piece } : null;
            return !this.wouldBeinchecked(clone as unknown as Board, this.currentPlayer);
        });
    }

    private isvalidPosition(row: number, colon: number): boolean {
        return row >= 0 && row < 8 && colon >= 0 && colon < 8;
    }

    private getPionMoves(position: Position, color : Color): Position[] {
        const moves: Position[] = [];

        let direction: number;
        let startRow: number;
        if (color === 'White') {
            direction = -1;
            startRow = 6;
        } else {
            direction = 1;
            startRow = 1;
        }

        const oneStep = position.row + direction;
        const twoStep = position.row + 2 * direction;

        if (this.isvalidPosition(oneStep, position.colon) &&
        !this.board[oneStep][position.colon]) {
            moves.push({row: oneStep, colon: position.colon});
        }
        if (position.row === startRow &&
            this.isvalidPosition(twoStep, position.colon) &&
            !this.board[oneStep][position.colon] &&
            !this.board[twoStep][position.colon]) {
            moves.push({row: twoStep, colon: position.colon});
        }

        for (const cap of [-1, 1]) {
            const newcol = position.colon + cap;
            if (this.isvalidPosition(position.row + direction, newcol)) {
                const target = this.board[position.row + direction][newcol];
                if (target && color !== target.color) {
                    moves.push({row: position.row + direction, colon: newcol});
                }
            }
        }
        return moves;
    }

    private getRookMoves(position: Position, color: Color): Position[] {
        const moves: Position[] = [];
        const directions = [[-1,0], [1,0], [0,-1], [0,1]];

        for (const [rowDir, colDir] of directions) {
            for (let i = 1; i < 8 ; i++) {
                const newrow = position.row + i * rowDir;
                const newcol = position.colon + i * colDir;
                if (!this.isvalidPosition(newrow, newcol)) break;

                const target = this.board[newrow][newcol];
                if (!target) {
                    moves.push({row: newrow, colon: newcol});
                }
                else {
                    if (target.color !== color) {
                        moves.push({row: newrow, colon: newcol});
                    }
                    break;
                }
            }
        }
        return moves;
    }

    private getKnightMoves(position: Position, color: Color): Position[] {
        const moves: Position[] = [];
        const knightMoves = [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]];

        for (const [rowDir, colDir] of knightMoves) {
            const newrow = position.row + rowDir;
            const newcol = position.colon + colDir;

            if (this.isvalidPosition(newrow, newcol)) {
                const target = this.board[newrow][newcol];
                if (!target || target.color !== color) {
                    moves.push({row: newrow, colon : newcol});
                }
            }
        }
        return moves;
    }

    private getBishopMoves(position: Position, color: Color): Position[] {
        const moves: Position[] = [];
        const directions = [[-1,-1], [-1,1], [1,-1], [1,1]];

        for (const [rowDir, colDir] of directions) {
            for (let i = 1; i < 8 ; i++) {
                const newrow = position.row + i * rowDir;
                const newcol = position.colon + i * colDir;
                if (!this.isvalidPosition(newrow, newcol)) break;

                const target = this.board[newrow][newcol];
                if (!target) {
                    moves.push({row: newrow, colon: newcol});
                }
                else {
                    if (target.color !== color) {
                        moves.push({row: newrow, colon: newcol});
                    }
                    break;
                }
            }
        }
        return moves;
    }

    private getQueenMoves(position: Position, color: Color): Position[] {
        return [...this.getRookMoves(position, color), ...this.getBishopMoves(position, color)];
    }

    private getKingMoves(position: Position, color: Color): Position[] {
        const moves: Position[] = [];
        const KingMoves = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];

        for (const [rowDir, colDir] of KingMoves) {
            const newrow = position.row + rowDir;
            const newcol = position.colon + colDir;
            if (this.isvalidPosition(newrow, newcol)) {
                const target = this.board[newrow][newcol];
                if (!target || target.color !== color) {
                    moves.push({row: newrow, colon: newcol});
                }
            }
        }
        return moves;
    }

    private getPieceMove(position: Position, piece: Piece, board: Board): Position[] {
        const moves: Position[] = [];

        switch (piece.type) {
            case 'pion' :
                moves.push(...this.getPionMovesBoard(position, piece.color, board));
                break;
            case 'rook' :
                moves.push(...this.getRookMovesBoard(position, piece.color, board));
                break;
            case 'bishop' :
                moves.push(...this.getBishopMovesBoard(position, piece.color, board));
                break;
            case 'knight' :
                moves.push(...this.getKnightMovesBoard(position, piece.color, board));
                break;
            case 'queen' :
                moves.push(...this.getQueenMovesBoard(position, piece.color, board));
                break;
            case 'king' :
                moves.push(...this.getKingMovesBoard(position, piece.color, board));
                break;
            default :
                break;
        }
        return moves;
    }

    private getPionMovesBoard(position: Position, color: Color, board: Board): Position[] {
        const moves: Position[] = [];

        let direction: number;
        if (color === 'White') {
            direction = -1;
        }
        else {
            direction = 1;
        }

        for (const cap of [-1, 1]) {
            const newcol = position.colon + cap;
            if (this.isvalidPosition(position.row + direction, newcol)) {
                const t = board[position.row + direction][newcol];
                if (t && t.color !== color) {
                    moves.push({row: position.row + direction, colon: newcol});
                }
            }
        }
        return moves;
    }

    private getRookMovesBoard(position: Position, color: Color, board: Board): Position[] {
        const moves: Position[] = [];
        const directions = [[-1,0], [1,0], [0,-1], [0,1]];

        for (const [rowDir, colDir] of directions) {
            for (let i = 1; i < 8 ; i++) {
                const newrow = position.row + i * rowDir;
                const newcol = position.colon + i * colDir;

                if (!this.isvalidPosition(newrow, newcol))
                    break
                const t = board[newrow][newcol];
                if (!t) {
                    moves.push({row: newrow, colon: newcol});
                } else {
                    if (t.color !== color) {
                        moves.push({row: newrow, colon: newcol});
                    }
                    break;
                }
            }
        }
        return moves;
    }

    private getKnightMovesBoard(position: Position, color: Color, board: Board): Position[] {
        const moves: Position[] = [];
        const knightMoves = [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]];

        for (const [rowDir, colDir] of knightMoves) {
            const newrow = position.row + rowDir;
            const newcol = position.colon + colDir;

            if (this.isvalidPosition(newrow, newcol)) {
                const target = board[newrow][newcol];
                if (!target || target.color !== color) {
                    moves.push({row: newrow, colon: newcol});
                }
            }
        }
        return moves;
    }

    private getBishopMovesBoard(position: Position, color: Color, board: Board): Position[] {
        const moves: Position[] = [];
        const directions = [[-1,-1], [-1,1], [1,-1], [1,1]];

        for (const [rowdir, coldir] of directions) {
            for (let i = 1; i < 8 ; i++) {
                const newrow = position.row + i * rowdir;
                const newcol = position.colon + i * coldir;

                if (!this.isvalidPosition(newrow, newcol))
                    break;
                const t = board[newrow][newcol];
                if (!t) {
                    moves.push({row: newrow, colon: newcol});
                } else {
                    if (t.color !== color) {
                        moves.push({row: newrow, colon: newcol});
                    }
                    break;
                }
            }
        }
        return moves;
    }

    private getQueenMovesBoard(position: Position, color: Color, board: Board): Position[] {
        return [...this.getRookMovesBoard(position, color, board), ...this.getBishopMovesBoard(position, color, board)];
    }

    private getKingMovesBoard(position: Position, color: Color, board: Board): Position[] {
        const moves: Position[] = [];
        const KingMoves = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];

        for (const [rowDir, colDir] of KingMoves) {
            const newrow = position.row + rowDir;
            const newcol = position.colon + colDir;
            if (this.isvalidPosition(newrow, newcol)) {
                const target = board[newrow][newcol];
                if (!target || target.color !== color) {
                    moves.push({row: newrow, colon: newcol});
                }
            }
        }
        return moves;
    }

    private cloneBoard(): InternalBoard {
        return this.board.map(row => row.map(piece => piece ? {...piece} : null));
    }
}

function renderBoard(): void {
    const chessB = document.getElementById('chess-board');
    if (!chessB || !chessGame)
        return;
    chessB.innerHTML = '';
    const board = chessGame.getBoard();
    const selectedPosition = chessGame.getSelectedPiece();
    const possibleMoves = chessGame.getPossibleMoves();
    const currentPlayer = chessGame.getcurrentPlayer();
    const gameStatus = chessGame.getGameStatus();

    let html = `
        <div style="margin-bottom: 10px;">
            <strong>Tour: ${currentPlayer === 'White' ? 'Blanc' : 'Noir'}</strong>
            <span style="margin-left: 20px;">${gameStatus}</span>
        </div>
        <div style="display: inline-block; border: 2px solid #333;">
    `;

    for (let row = 0; row < 8; row++) {
        html += '<div style="display: flex;">';
        for (let colon = 0; colon < 8; colon++) {
            const piece = board[row][colon];
            const isLight = (row + colon) % 2 === 0;
            const isSelected = selectedPosition && selectedPosition.row === row && selectedPosition.colon === colon;
            const isPossibleMove = possibleMoves.some(move => move.row === row && move.colon === colon);

            let bgColor = isLight ? '#f0d9b5' : '#b58863';
            if (isSelected) bgColor = '#f7f769';
            else if (isPossibleMove) bgColor = '#86f769';

            html += `
                <div
                    class="chess-square"
                    data-row="${row}"
                    data-colon="${colon}"
                    style="
                        width: 60px;
                        height: 60px;
                        background-color: ${bgColor};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        border: 1px solid #333;
                        font-size: 40px;
                    "
                >
                    ${piece ? getPieceSymbol(piece) : ''}
                </div>
            `;
        }
        html += '</div>';
    }

    html += '</div>';

    const resetButton = chessB.querySelector('button');
    if (resetButton) {
        chessB.appendChild(resetButton);
    }
    chessB.insertAdjacentHTML('beforeend', html);

    const squares = chessB.querySelectorAll('.chess-square');
    squares.forEach(squares => { squares.addEventListener('click', handleSquareClick);});


}

function getPieceSymbol(piece: Piece): string {
    console.log(piece ? 1 : 0);
    const symbols: Record<string, string> = {
        'White-pion': '♟',
        'Black-pion': '♙',
        'White-rook': '♜',
        'Black-rook': '♖',
        'White-knight': '♞',
        'Black-knight': '♘',
        'White-bishop': '♝',
        'Black-bishop': '♗',
        'White-queen': '♛',
        'Black-queen': '♕',
        'White-king': '♚',
        'Black-king': '♔',
    }
    const key = `${piece.color}-${piece.type}`;
    console.log(key, symbols[key]);
    return symbols[key];
}

function handleSquareClick(event: Event): void {
    if (!chessGame)
        return;

    const t = event.currentTarget as HTMLElement;
    const row = parseInt(t.dataset.row || '0');
    const colon = parseInt(t.dataset.colon || '0');
    const position: Position = {row, colon};
    const selectedPosition = chessGame.getSelectedPiece();

    if (selectedPosition && selectedPosition.row === row && selectedPosition.colon === colon) {
        chessGame.selectPiece({row: -1, colon: -1});
        renderBoard();
    } else if (selectedPosition) {
        if (chessGame.movePiece(selectedPosition, position)) {
            renderBoard();
        } else {
            chessGame.selectPiece(position);
            renderBoard();
        }
    } else {
        chessGame.selectPiece(position);
        renderBoard();
    }

}

let chessGame: ChessGame | null = null;

export function initChess(): void {
    const chessB = document.getElementById('chess-board');
    if (!chessB)
        return;
    chessGame = new ChessGame();
    renderBoard();
}
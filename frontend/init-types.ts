export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pion';
export type Color = 'Black' | 'White';

export interface Piece {
    type : PieceType;
    color : Color;
    hasMoved? : boolean;
}

export interface Position {
    row : number;
    colon : number;
}

export type Board = (Piece | null)[][];

export interface ChessGame {
    getBoard(): Board;
    getcurrentPlayer(): Color;
    getSelectedPiece(): Position | null;
    getPossibleMoves(): Position[];
    getGameStatus(): string;
    selectPiece(position: Position): boolean;
    movePiece(from: Position, to : Position): boolean;
    resetGame(): void;
}
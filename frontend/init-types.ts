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

export type Friend = {
    id: number;
    username: string;
    email: string;
    // avatarUrl?: string;
};

export type Match = {
        id: number;
        game: string;
        player1ID: number;
        player2ID: number;
        winnerID: number | null;
        scoreP1: number | null;
        scoreP2: number | null;
        createdAt: string;
};

export type ChatMessage = {
    id: number;
    senderId: number;
    receiverId: number;
    content: string;
    createdAt?: string;
    createdTimer?: string;
}
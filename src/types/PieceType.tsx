

export enum PieceType {
    Pawn, Rook, Knight, Bishop, Queen, King,
}

export function isPawn(pieceType: PieceType): boolean {
    return pieceType === PieceType.Pawn;
}
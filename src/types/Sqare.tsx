import { Piece } from './Piece';

export interface Square {
    x: number;
    y: number;
    piece: Piece;
    isPossibleMove?: boolean; 
}
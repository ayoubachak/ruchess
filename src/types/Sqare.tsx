import { Piece } from './Piece';

export interface Square {
    x: number;
    y: number;
    piece: Piece | null;
    isPossibleMove?: boolean; 
}
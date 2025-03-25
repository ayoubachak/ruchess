export enum Color {
    White = 'WHITE',
    Black = 'BLACK',
}

export function isWhite(color: Color | null): boolean {
    return color === Color.White;
}

export function isBlack(color: Color | null): boolean {
    return color === Color.Black;
}

export function oppositeColor(color: Color | null): Color {
    return isWhite(color) ? Color.Black : Color.White;
}
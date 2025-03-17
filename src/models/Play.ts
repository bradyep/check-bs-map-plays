export interface Play {
    playerName: string;
    score: number;
    modifiers: string[];
    datePlayed: number; // Unix time
}
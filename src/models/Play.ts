export interface Play {
    playerName: string;
    accScore: number;
    modifiers: string;
    datePlayed: number; // Unix time
    scoreId: string;
    playerTotalPp: number;
    totalMistakes: number;
}

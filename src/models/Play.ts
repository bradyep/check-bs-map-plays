export interface Play {
    playerName: string;
    accScore: number;
    modifiers: string[];
    datePlayed: number; // Unix time
    replayUrl: string;
    playerTotalPp: number;
    totalMistakes: number;
}

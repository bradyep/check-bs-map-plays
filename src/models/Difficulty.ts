export interface Difficulty {
    difficultyId: string; // difficulty IDs are strings in the BL API 🤷
    difficultyName: string;
    modeName: string;
    plays: number;
}

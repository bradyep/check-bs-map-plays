import { Difficulty } from './Difficulty';

export interface Map {
    id: string; // map IDs are strings in the BL API 🤷
    name: string;
    mapperId: number;
    difficulties: Difficulty[];
    lastChecked: number; // Unix time
    totalPlays: number;
    upvotes: number;
    downvotes: number;
}

import { Difficulty } from './Difficulty';

export interface Map {
    id: string;
    name: string;
    mapperId: number;
    difficulties: Difficulty[];
    lastChecked: number; // Unix time
    totalPlays: number;
    upvotes: number;
    downvotes: number;
}

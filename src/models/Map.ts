import { Difficulty } from './Difficulty';

export interface Map {
    mapId: number;
    mapperId: number;
    difficulties: Difficulty[];
    lastChecked: number; // Unix time
    totalPlays: number;
    upvotes: number;
    downvotes: number;
}

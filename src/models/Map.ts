import { Leaderboard } from './Leaderboard';

export interface Map {
    id: string; // BeatSaver map IDs are hex
    name: string;
    mapperId: number;
    leaderboards: Leaderboard[];
    lastChecked?: number; // Unix time
    totalPlays?: number;
    upvotes: number;
    downvotes: number;
    bsScore: number; // BeatSaver score
}

import { Leaderboard } from './Leaderboard';

export interface Map {
    id: string; // BeatSaver map IDs are hex
    name: string;
    mapperId: number;
    mapperName: string;
    coverUrl?: string;
    // lastChecked?: number; // Unix time
    totalPlays?: number;
    upvotes: number;
    downvotes: number;
    bsScore?: number; // BeatSaver vote rating score
    // Only used for generated HTML reports
    totalPlaysWhenLastChecked?: number;
    upvotesWhenLastChecked?: number;
    downvotesWhenLastChecked?: number;
    bsScoreWhenLastChecked?: number;
    // Collections
    leaderboards: Leaderboard[];
}

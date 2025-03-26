import { Play } from './Play';

export interface Leaderboard {
    leaderboardId: string; // leaderboard IDs are strings since BeatSaver map ids are hex
    mapId: string;
    difficultyName: string;
    modeName: string;
    playCount: number;
    // Only used for generated HTML reports
    playCountWhenLastChecked?: number;
    // Collections
    recentPlays: Play[];
}

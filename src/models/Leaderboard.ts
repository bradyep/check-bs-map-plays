export interface Leaderboard {
    leaderboardId: string; // leaderboard IDs are strings since BeatSaver map ids are hex
    mapId: string;
    difficultyName: string;
    modeName: string;
    plays: number;
}

import axios from 'axios';
import { Map } from '../models/Map';
import { Leaderboard } from '../models/Leaderboard';
// import { Play } from '../models/Play';

export async function getMapsFromBeatSaver(mapperId: string): Promise<Map[]> {
    const response = await axios.get(`https://api.beatsaver.com/maps/uploader/${mapperId}/0`);
    return response.data.docs.map((map: any) => ({
        id: map.id, // BeatSaver map ID
        name: map.name,
        mapperId: map.uploader.id,
        /*
        leaderboards: map.versions.flatMap((version: any) =>
            version.diffs.map((diff: any) => ({
                leaderboardId: `${map.id}-${diff.difficulty}`, // Generate a unique leaderboard ID
                difficultyName: diff.difficulty,
                modeName: diff.characteristic,
                plays: 0 // Beat Saver does not provide play counts
            }))
        ) as Leaderboard[],
        */
        lastChecked: Date.now(), // Set the current timestamp
        // totalPlays: 0, // Beat Saver does not provide total play counts
        upvotes: map.stats.upvotes || 0,
        downvotes: map.stats.downvotes || 0
    })) as Map[];
}

export async function getLeaderboards(mapperId: string): Promise<Map[]> {
    const response = await axios.get(`https://api.beatleader.com/maps?mappers=${mapperId}`);
    return response.data.data.map((map: any) => ({
        id: map.id, // Set the Map's id property
        name: map.name,
        mapperId: map.mapperId,
        leaderboards: map.difficulties.map((difficulty: any) => ({
            leaderboardId: difficulty.leaderboardId,
            difficultyName: difficulty.difficultyName,
            modeName: difficulty.modeName,
            plays: difficulty.plays
        })) as Leaderboard[], // Map difficulties to the Leaderboard interface
        lastChecked: Date.now(), // Set a default value for lastChecked
        totalPlays: map.difficulties.reduce((sum: number, difficulty: any) => sum + difficulty.plays, 0), // Sum up plays across all difficulties
        upvotes: map.positiveVotes || 0, // Default to 0 if not provided
        downvotes: map.negativeVotes || 0 // Default to 0 if not provided
    })) as Map[];
}

export async function getLeaderboardData(leaderboardId: string): Promise<Leaderboard> {
    const response = await axios.get(`https://api.beatleader.com/leaderboard/${leaderboardId}`);

    const difficulty: Leaderboard = { 
        leaderboardId: response.data.id,
        mapId: response.data.song.id,
        difficultyName: response.data.difficulty.difficultyName,
        modeName: response.data.difficulty.modeName,
        plays: response.data.plays
     }

    return difficulty;
}

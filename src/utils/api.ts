import axios from 'axios';
import { Map } from '../models/Map';
import { Leaderboard } from '../models/Leaderboard';

export async function getMapsFromBeatSaver(mapperId: number): Promise<Map[]> {
    const response = await axios.get(`https://api.beatsaver.com/maps/uploader/${mapperId}/0`);
    return response.data.docs.map((map: any) => ({
        id: map.id,
        name: map.name,
        mapperId: map.uploader.id,
        mapperName: map.uploader.name,
        lastChecked: Date.now(),
        upvotes: map.stats.upvotes || 0,
        downvotes: map.stats.downvotes || 0,
        bsScore: map.stats.score || 0
    })) as Map[];
}

export async function getMapFromBeatSaver(mapId: string): Promise<Map> {
    const response = await axios.get(`https://api.beatsaver.com/maps/id/${mapId}`);
    const data = response.data;

    return { 
        id: data.id,
        name: data.name,
        mapperId: data.uploader.id,
        mapperName: data.uploader.name,
        leaderboards: [],
        lastChecked: Date.now(),
        upvotes: data.stats.upvotes || 0,
        downvotes: data.stats.downvotes || 0,
        bsScore: data.stats.score || 0
     }
}

export async function getLeaderboards(mapperId: number): Promise<Map[]> {
    const response = await axios.get(`https://api.beatleader.com/maps?mappers=${mapperId}`);
    return response.data.data.map((map: any) => ({
        id: map.id,
        name: map.name,
        mapperId: map.mapperId,
        mapperName: map.mapper,
        leaderboards: map.difficulties.map((difficulty: any) => ({
            leaderboardId: difficulty.leaderboardId,
            difficultyName: difficulty.difficultyName,
            modeName: difficulty.modeName,
            plays: difficulty.plays
        })) as Leaderboard[],
        lastChecked: Date.now(),
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

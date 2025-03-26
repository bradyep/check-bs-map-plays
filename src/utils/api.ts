import axios from 'axios';
import { Map } from '../models/Map';
import { Leaderboard } from '../models/Leaderboard';
import { Play } from '../models/Play';

const BEAT_SAVER_API = 'https://api.beatsaver.com';
const BEAT_LEADER_API = 'https://api.beatleader.com';

export async function getMapsFromBeatSaver(mapperId: number): Promise<Map[]> {
    const response = await axios.get(`${BEAT_SAVER_API}/maps/uploader/${mapperId}/0`);
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
    const response = await axios.get(`${BEAT_SAVER_API}/maps/id/${mapId}`);
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
    const response = await axios.get(`${BEAT_LEADER_API}/maps?mappers=${mapperId}`);
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
    const response = await axios.get(`${BEAT_LEADER_API}/leaderboard/${leaderboardId}?page=1&count=100&sortBy=date&order`);
    const data = response.data;

    return { 
        leaderboardId: data.id,
        mapId: data.song.id,
        difficultyName: data.difficulty.difficultyName,
        modeName: data.difficulty.modeName,
        playCount: data.plays,
        recentPlays: data.scores.map((score: any) => ({
            playerName: score.player.name,
            accScore: score.accuracy,
            modifiers: score.modifiers,
            datePlayed: score.timepost,
            scoreId: score.id,
            playerTotalPp: score.player.pp || 0,
            totalMistakes: (score.missedNotes || 0) + (score.badCuts || 0) + (score.bombCuts || 0) + (score.wallsHit || 0)
        })) as Play[]
     }
}

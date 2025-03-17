import axios from 'axios';
import { Map } from '../models/Map';
import { Play } from '../models/Play';

export async function fetchMapsByMapper(mapperId: string): Promise<Map[]> {
    const response = await axios.get(`https://api.beatleader.com/maps?mappers=${mapperId}`);
    return response.data.data.flatMap((map: any) => 
        map.difficulties.map((difficulty: any) => ({
            id: difficulty.leaderboardId,
            name: map.name
        }))
    );
}

export async function fetchPlays(mapId: string): Promise<number> {
    const response = await axios.get(`https://api.beatleader.com/leaderboard/${mapId}`);
    return response.data.plays;
}

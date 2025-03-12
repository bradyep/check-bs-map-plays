import axios from 'axios';

interface Map {
    id: string;
    name: string;
}

interface Play {
    playerName: string;
    score: number;
}

export async function fetchMapsByMapper(mapperId: string): Promise<Map[]> {
    // Example: https://api.beatleader.com/maps?mappers=132909
    const response = await axios.get(`https://api.beatleader.com/maps?mappers=${mapperId}`);
    return response.data.data.flatMap((map: any) => 
        map.difficulties.map((difficulty: any) => ({
            id: difficulty.leaderboardId,
            name: map.name
        }))
    );
}

export async function fetchPlays(mapId: string): Promise<number> {
    // Example: https://api.beatleader.com/leaderboard/scores/442a6x91
    const response = await axios.get(`https://api.beatleader.com/leaderboard/scores/${mapId}`);

    return response.data.scores.length;
    /*
    return response.data.map((play: any) => ({
        playerName: play.player.name,
        score: play.score
    }));
    */
}
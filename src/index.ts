import fs from 'fs';
import path from 'path';
import { getLeaderboardData, getLeaderboards, getMapsFromBeatSaver, getMapFromBeatSaver } from './utils/api';
import { Leaderboard } from './models/Leaderboard';
import { Mapper } from './models/Mapper';

const MAPPER_ID: number = 132909; // TODO: Get this from JSON or console input
const UNKNOWN_MAPPER_NAME = 'Unknown Mapper'

async function main() {
    // Fetch maps from Beat Saver
    const beatSaverMaps = await getMapsFromBeatSaver(MAPPER_ID);
    console.log('Number of maps from Beat Saver:', beatSaverMaps.length);

    // Fetch leaderboards from Beat Leader
    const beatLeaderMaps = await getLeaderboards(MAPPER_ID);
    console.log('Number of maps from Beat Leader:', beatLeaderMaps.length);

    let mapperName: string = UNKNOWN_MAPPER_NAME;
    for (const blMap of beatLeaderMaps) {
        if (mapperName === UNKNOWN_MAPPER_NAME) { mapperName = blMap.mapperName; }
        let matchingBeatSaverMap = beatSaverMaps.find((beatSaverMap) => beatSaverMap.id === blMap.id);

        if (!matchingBeatSaverMap) {
            console.log(`Cannot find matching Beat Saver map for BeatLeader map with id: ${blMap.id} | Attempting to remove last character from id`);
            matchingBeatSaverMap = beatSaverMaps.find((beatSaverMap) => beatSaverMap.id === blMap.id.slice(0, -1) );
            console.log(matchingBeatSaverMap ? 'Found map with id: ' + blMap.id.slice(0, -1) : 'Still no matching map found for ' + blMap.id.slice(0, -1));

            if (!matchingBeatSaverMap) {
                // Most likely a collaboration map, make separate BeatSaber api call to get votes
                const beatSaverMap = await getMapFromBeatSaver(blMap.id);
                if (!beatSaverMap) {
                    console.log('No BeatSaver map found for id: ' + blMap.id + 'throwing in the towel');
                    continue; // Nothing more we can do
                } else {
                    matchingBeatSaverMap = beatSaverMap;
                    beatSaverMaps.push(matchingBeatSaverMap);
                }
            }
        }

        for (const leaderboard of blMap.leaderboards) {
            const leaderboardData: Leaderboard = await getLeaderboardData(leaderboard.leaderboardId);

            // Add leaderboard data to the matching Beat Saver map
            matchingBeatSaverMap.leaderboards = matchingBeatSaverMap.leaderboards || [];
            matchingBeatSaverMap.leaderboards.push(leaderboardData);
            matchingBeatSaverMap.totalPlays = matchingBeatSaverMap.leaderboards.reduce((sum: number, lb: Leaderboard) => sum + lb.plays, 0);
        }
    }

    const mapper: Mapper = {
        mapperId: MAPPER_ID,
        mapperName: mapperName,
        maps: beatSaverMaps
    };

    console.log('Mapper:', JSON.stringify(mapper));
    // console.log('Maps:', beatSaverMaps);
}

main().catch((err) => {
    console.error('Error:', err);
});

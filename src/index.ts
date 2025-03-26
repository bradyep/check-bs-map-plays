import fs from 'fs';
import path from 'path';
import { getLeaderboardData, getLeaderboards, getMapsFromBeatSaver, getMapFromBeatSaver } from './utils/api';
import { getLastReportFile } from './utils/file';
import { Leaderboard } from './models/Leaderboard';
import { Report } from './models/Report';
import { Map } from './models/Map';

const MAPPER_ID: number = 132909; // TODO: Get this from JSON or console input
const UNKNOWN_MAPPER_NAME = 'Unknown Mapper';
const SAVED_REPORT_FILE = 'map-play-report.json';
const REPORT_FILE_PATH = path.join(__dirname, SAVED_REPORT_FILE);

async function main() {
    // Load last generated report file for mappers and differences
    let lastReport = await getLastReportFile(REPORT_FILE_PATH);
    console.log('Last report:', lastReport);

    // Fetch maps
    const beatSaverMaps = await getMapsFromBeatSaver(MAPPER_ID);
    const beatLeaderMaps = await getLeaderboards(MAPPER_ID);
    console.log(`${beatLeaderMaps.length} maps from Beat Leader | ${beatSaverMaps.length} maps from Beat Saver`);

    let mapperName: string = UNKNOWN_MAPPER_NAME;
    for (const blMap of beatLeaderMaps) {
        if (mapperName === UNKNOWN_MAPPER_NAME) {
            mapperName = blMap.mapperName;
        }
        let matchingBeatSaverMap = beatSaverMaps.find((beatSaverMap) => beatSaverMap.id === blMap.id);

        if (!matchingBeatSaverMap) {
            console.log(`Cannot find matching Beat Saver map for BeatLeader map with id: ${blMap.id} | Attempting to remove last character from id`);
            matchingBeatSaverMap = beatSaverMaps.find((beatSaverMap) => beatSaverMap.id === blMap.id.slice(0, -1));
            console.log(matchingBeatSaverMap ? 'Found map with id: ' + blMap.id.slice(0, -1) : 'Still no matching map found for ' + blMap.id.slice(0, -1));

            if (!matchingBeatSaverMap) {
                // Most likely a collaboration map, make separate BeatSaber API call to get votes
                const beatSaverMap = await getMapFromBeatSaver(blMap.id);
                if (!beatSaverMap) {
                    console.log('No BeatSaver map found for id: ' + blMap.id + ' throwing in the towel');
                    continue; // Nothing more we can do
                } else {
                    matchingBeatSaverMap = beatSaverMap;
                    beatSaverMaps.push(matchingBeatSaverMap);
                }
            }
        }
        blMap.id = matchingBeatSaverMap.id;

        let currentReportMap: Map | undefined = undefined;
        // Check for differences in map plays/upvotes/downvotes/bsScore
        if (lastReport) {
            const currentReportMapper = lastReport.mappers.find((mapper) => mapper.mapperId === MAPPER_ID);
            if (currentReportMapper) {
                currentReportMap = currentReportMapper.maps.find((map) => map.id === blMap.id);
                if (currentReportMap) {
                    matchingBeatSaverMap.totalPlaysWhenLastChecked = currentReportMap.totalPlays;
                    matchingBeatSaverMap.upvotesWhenLastChecked = currentReportMap.upvotes;
                    matchingBeatSaverMap.downvotesWhenLastChecked = currentReportMap.downvotes;
                    matchingBeatSaverMap.bsScoreWhenLastChecked = currentReportMap.bsScore;
                } else {
                    console.log('Could not find this map id in report: ' + blMap.id);
                }
            } else {
                console.log('Could not find this mapper id in report: ' + MAPPER_ID);
            }
        }

        for (const leaderboard of blMap.leaderboards) {
            const leaderboardData: Leaderboard = await getLeaderboardData(leaderboard.leaderboardId);

            // Check for differences in play count
            if (currentReportMap) {
                const currentReportLeaderboard = currentReportMap.leaderboards.find((lb) => lb.leaderboardId === leaderboard.leaderboardId);
                if (currentReportLeaderboard) {
                    leaderboardData.playCountWhenLastChecked = currentReportLeaderboard.playCount;
                }
            }

            matchingBeatSaverMap.leaderboards = matchingBeatSaverMap.leaderboards || [];
            matchingBeatSaverMap.leaderboards.push(leaderboardData);
            matchingBeatSaverMap.totalPlays = matchingBeatSaverMap.leaderboards.reduce((sum: number, lb: Leaderboard) => sum + lb.playCount, 0);
        }
    }

    const report: Report = {
        mapperIdsToTrack: [MAPPER_ID],
        mappers: [{
            mapperId: MAPPER_ID,
            mapperName: mapperName,
            maps: beatSaverMaps
        }],
        generatedDate: Date.now()
    };

    fs.writeFileSync(REPORT_FILE_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Report saved to: ${REPORT_FILE_PATH}`);
}

main().catch((err) => {
    console.error('Error:', err);
});

import fs from 'fs';
import path from 'path';
import { getLeaderboardData, getLeaderboards, getMapsFromBeatSaver, getMapFromBeatSaver } from './utils/api';
import { getLastReportFile } from './utils/file';
import { Leaderboard } from './models/Leaderboard';
import { Report } from './models/Report';
import { Map } from './models/Map';
import { removeNonHex } from './utils/string';

const UNKNOWN_MAPPER_NAME = 'Unknown Mapper';
const SAVED_REPORT_FILE = 'map-play-report.json';
const REPORT_FILE_PATH = path.join(__dirname, SAVED_REPORT_FILE);

async function main() {
    // Load last generated report file for mappers and differences
    let lastReport = await getLastReportFile(REPORT_FILE_PATH);
    console.log('Last report:', lastReport);

    if (!lastReport || !lastReport.mapperIdsToTrack || lastReport.mapperIdsToTrack.length === 0) {
        console.log('No mappers found in JSON file');
        return;
    }

    const mapperIdsToTrack = lastReport.mapperIdsToTrack;
    const allMappersData = [];

    for (const mapperId of mapperIdsToTrack) {
        console.log(`Processing mapper ID: ${mapperId}`);

        // Fetch maps
        const beatSaverMaps = await getMapsFromBeatSaver(mapperId);
        const beatLeaderMaps = await getLeaderboards(mapperId);
        console.log(`${beatLeaderMaps.length} maps from Beat Leader | ${beatSaverMaps.length} maps from Beat Saver`);

        let mapperName: string = UNKNOWN_MAPPER_NAME;
        for (const blMap of beatLeaderMaps) {
            if (mapperName === UNKNOWN_MAPPER_NAME) {
                mapperName = blMap.mapperName;
            }
            const nonHexId = removeNonHex(blMap.id);
            let matchingBeatSaverMap = beatSaverMaps.find((beatSaverMap) => beatSaverMap.id === nonHexId);

            if (!matchingBeatSaverMap) {
                // Most likely a collaboration map, make separate BeatSaber API call to get votes
                const beatSaverMap = await getMapFromBeatSaver(nonHexId);
                if (!beatSaverMap) {
                    console.log('No BeatSaver map found for id: ' + nonHexId + ' throwing in the towel');
                    continue; // Nothing more we can do
                } else {
                    console.log('Found likely collab map with id: ' + nonHexId + ' from BeatSaver API');
                    matchingBeatSaverMap = beatSaverMap;
                    beatSaverMaps.push(matchingBeatSaverMap);
                }
            }

            blMap.id = matchingBeatSaverMap.id;

            let currentReportMap: Map | undefined = undefined;
            // Check for differences in map plays/upvotes/downvotes/bsScore
            if (lastReport) {
                const currentReportMapper = lastReport.mappers.find((mapper) => mapper.mapperId === mapperId);
                if (currentReportMapper) {
                    currentReportMap = currentReportMapper.maps.find((map) => map.id === blMap.id);
                    if (currentReportMap) {
                        matchingBeatSaverMap.totalPlaysWhenLastChecked = currentReportMap.totalPlays;
                        matchingBeatSaverMap.upvotesWhenLastChecked = currentReportMap.upvotes;
                        matchingBeatSaverMap.downvotesWhenLastChecked = currentReportMap.downvotes;
                        matchingBeatSaverMap.bsScoreWhenLastChecked = currentReportMap.bsScore;
                    } else {
                        console.log('Map lastChecked values will be null since we could not find this map id in report: ' + blMap.id);
                    }
                } else {
                    console.log('Map lastChecked values will be null since we could not find this mapper id in report: ' + mapperId);
                }
            }

            for (const leaderboard of blMap.leaderboards) {
                const leaderboardData: Leaderboard = await getLeaderboardData(leaderboard.leaderboardId);

                // Check for differences in play count
                if (currentReportMap) {
                    const currentReportLeaderboard = currentReportMap.leaderboards.find((lb) => lb.leaderboardId === leaderboard.leaderboardId);
                    if (currentReportLeaderboard) {
                        leaderboardData.playCountWhenLastChecked = currentReportLeaderboard.playCount;
                    } else {
                        console.log('Leaderboard last checked play count will be null since we could not find this leaderboard id in report: ' + leaderboard.leaderboardId);
                    }
                } else {
                    console.log('Leaderboard last checked play count will be null since we could not find this map id in report: ' + blMap.id);
                }

                matchingBeatSaverMap.leaderboards = matchingBeatSaverMap.leaderboards || [];
                matchingBeatSaverMap.leaderboards.push(leaderboardData);
                matchingBeatSaverMap.totalPlays = matchingBeatSaverMap.leaderboards.reduce((sum: number, lb: Leaderboard) => sum + lb.playCount, 0);
            }
        }

        allMappersData.push({
            mapperId: mapperId,
            mapperName: mapperName,
            maps: beatSaverMaps
        });
    } // for (const mapperId of mapperIdsToTrack) {

    const report: Report = {
        mapperIdsToTrack: mapperIdsToTrack,
        mappers: allMappersData,
        generatedDate: Date.now()
    };

    fs.writeFileSync(REPORT_FILE_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Report saved to: ${REPORT_FILE_PATH}`);
}

main().catch((err) => {
    console.error('Error:', err);
});

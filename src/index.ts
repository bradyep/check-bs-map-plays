import fs from 'fs';
import path from 'path';
import { getLeaderboardData, getLeaderboards, getMapsFromBeatSaver} from './utils/api';
import { getLastReportFile, generateHtmlReport } from './utils/file';
import { Leaderboard } from './models/Leaderboard';
import { Report } from './models/Report';
import { Map } from './models/Map';
import { removeNonHex } from './utils/string';

const UNKNOWN_MAPPER_NAME = 'Unknown Mapper';
const SAVED_REPORT_FILE_NAME = 'map-play-report.json';
const HTML_REPORT_FILE_NAME = 'map-play-report.html';
const REPORT_FILE_PATH = path.join(__dirname, SAVED_REPORT_FILE_NAME);
const HTML_REPORT_FILE = path.join(__dirname, HTML_REPORT_FILE_NAME);

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
        console.log(`${beatSaverMaps.length} maps from Beat Saver: ` + beatSaverMaps.map((map) => map.id).join(', '));
        console.log(`${beatLeaderMaps.length} maps from Beat Leader: ` + beatLeaderMaps.map((map) => map.id).join(', '));

        let mapperName: string = UNKNOWN_MAPPER_NAME;
        for (const blMap of beatLeaderMaps) {
            const nonHexId = removeNonHex(blMap.id);
            console.log(`Processing blMap.id: ${blMap.id} | nonHexId: ${nonHexId}`);
            let matchingBeatSaverMap = beatSaverMaps.find((beatSaverMap) => beatSaverMap.id === nonHexId);

            if (!matchingBeatSaverMap) {
                console.log('No matching BeatSaver map found for id: ' + nonHexId + ', this should not happen. Throwing in the towel');
                continue; // Nothing more we can do
            }

            blMap.id = matchingBeatSaverMap.id;
            if (mapperName === UNKNOWN_MAPPER_NAME) {
                mapperName = matchingBeatSaverMap.mapperName;
            }

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
                        console.log('Map lastChecked values will be undefined since we could not find this map id in report: ' + blMap.id);
                    }
                } else {
                    console.log('Map lastChecked values will be undefined since we could not find this mapper id in report: ' + mapperId);
                }
            }

            console.log(`blMap.leaderboards.length: ${blMap.leaderboards.length}`);
            for (const leaderboard of blMap.leaderboards) {
                const leaderboardData: Leaderboard = await getLeaderboardData(leaderboard.leaderboardId);
                // Check for differences in play count
                if (currentReportMap && currentReportMap.leaderboards) {
                    const currentReportLeaderboard = currentReportMap.leaderboards.find((lb) => lb.leaderboardId === leaderboard.leaderboardId);
                    if (currentReportLeaderboard) {
                        leaderboardData.playCountWhenLastChecked = currentReportLeaderboard.playCount;
                    } else {
                        console.log('Leaderboard last checked play count will be undefined since we could not find this leaderboard id in report: ' + leaderboard.leaderboardId);
                    }
                } else {
                    console.log('Leaderboard last checked play count will be undefined since we could not find this map id in report (or it didnt have leaderboards): ' + blMap.id);
                }
                // Populate leaderboard data of matchingBeatSaverMap
                matchingBeatSaverMap.leaderboards = matchingBeatSaverMap.leaderboards || [];
                matchingBeatSaverMap.leaderboards.push(leaderboardData);
                matchingBeatSaverMap.totalPlays = matchingBeatSaverMap.leaderboards.reduce((sum: number, lb: Leaderboard) => sum + lb.playCount, 0);
            }
        } // for (const blMap of beatLeaderMaps) {

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

    // Write JSON report
    fs.writeFileSync(REPORT_FILE_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Report saved to: ${REPORT_FILE_PATH}`);

    // Write HTML report
    const htmlContent = generateHtmlReport(report);
    fs.writeFileSync(HTML_REPORT_FILE, htmlContent, 'utf-8');
    console.log(`HTML report saved to: ${HTML_REPORT_FILE}`);
}

main().catch((err) => {
    console.error('Error:', err);
});

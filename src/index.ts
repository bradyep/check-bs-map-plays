import fs from 'fs';
import path from 'path';
import { getLeaderboardData, getLeaderboards, getMapsFromBeatSaver } from './utils/api';
import { getLastReportFile, generateHtmlReport, generateJsonReport } from './utils/file';
import { sortMapDifficulties } from './utils/map-data';
import { Leaderboard } from './models/Leaderboard';
import { Report } from './models/Report';
import { Map } from './models/Map';
import { Play } from './models/Play';
import { Mapper } from './models/Mapper';
import { removeNonHex } from './utils/string';

const UNKNOWN_MAPPER_NAME = 'Unknown Mapper';
const SAVED_REPORT_FILE_NAME = 'map-play-report.json';
const HTML_REPORT_FILE_NAME = 'map-play-report.html';
const JSON_REPORT_FILE_PATH = path.join(__dirname, SAVED_REPORT_FILE_NAME);
const HTML_REPORT_FILE_PATH = path.join(__dirname, HTML_REPORT_FILE_NAME);

async function main() {
    // Load last generated report file for mappers and differences
    const lastReport = await getLastReportFile(JSON_REPORT_FILE_PATH);
    console.log('Last report:', lastReport);

    if (!lastReport || !lastReport.mapperIdsToTrack || lastReport.mapperIdsToTrack.length === 0) {
        console.log('No mappers found in JSON file');
        return;
    }

    const mapperIdsToTrack = lastReport.mapperIdsToTrack;
    const allMappersData: Mapper[] = [];

    for (const mapperId of mapperIdsToTrack) {
        console.log(`Processing mapper ID: ${mapperId}`);
        let mapperName: string = UNKNOWN_MAPPER_NAME;
        const currentReportMapper = lastReport.mappers.find((mapper) => mapper.mapperId === mapperId);

        // Fetch maps
        const beatSaverMaps = await getMapsFromBeatSaver(mapperId);
        const beatLeaderMaps = await getLeaderboards(mapperId);
        console.log(`${beatSaverMaps.length} maps from Beat Saver: ` + beatSaverMaps.map((map) => map.id).join(', '));
        console.log(`${beatLeaderMaps.length} maps from Beat Leader: ` + beatLeaderMaps.map((map) => map.id).join(', '));

        for (const blMap of beatLeaderMaps) {
            const nonHexId = removeNonHex(blMap.id);
            console.log(`Processing blMap.id: ${blMap.id} | nonHexId: ${nonHexId}`);
            let matchingBeatSaverMap = beatSaverMaps.find((beatSaverMap) => beatSaverMap.id === nonHexId);

            if (!matchingBeatSaverMap) {
                console.log('No matching BeatSaver map found for id: ' + nonHexId + ', this should not happen. Throwing in the towel');
                continue; // Nothing more we can do
            }
            // QUESTION: Do we need to set this? Can't we just use matchingBeatSaverMap.id in its place?
            // Seems like unnecessary mutation which complicates things
            blMap.id = matchingBeatSaverMap.id;
            if (mapperName === UNKNOWN_MAPPER_NAME) {
                mapperName = matchingBeatSaverMap.mapperName;
            }

            let currentReportMap: Map | undefined = undefined;
            // Check for differences in map plays/upvotes/downvotes/bsScore
            if (currentReportMapper) {
                currentReportMap = currentReportMapper.maps.find((map) => map.id === blMap.id);
                if (currentReportMap) {
                    matchingBeatSaverMap.lastChecked = currentReportMap.lastChecked;
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

            console.log(`blMap.leaderboards.length: ${blMap.leaderboards.length}`);
            for (const leaderboard of blMap.leaderboards) {
                const leaderboardData: Leaderboard = await getLeaderboardData(leaderboard.leaderboardId);
                // Check for differences in play count
                if (currentReportMap && currentReportMap.leaderboards) {
                    const currentReportLeaderboard = currentReportMap.leaderboards.find((lb) => lb.leaderboardId === leaderboard.leaderboardId);
                    if (currentReportLeaderboard) {
                        leaderboardData.playCountWhenLastChecked = currentReportLeaderboard.playCount;
                        // Also remove any plays that have already been seen in the last report
                        // NOTE: We have to use a non-null assertion here since TypeScript does not perform control flow analysis across async/await boundaries
                        console.log(`Found a leaderboard in last report with id: ${currentReportLeaderboard.leaderboardId} | will compare play times with matchingBeatSaverMap.lastChecked: ${new Date(matchingBeatSaverMap!.lastChecked).toLocaleString()} aka ${matchingBeatSaverMap!.lastChecked}`);
                        const newRecentPlays: Play[] = [];
                        for (const play of leaderboardData.recentPlays) {
                            console.log(`play.datePlayed: ${new Date(play.datePlayed * 1000).toLocaleString()} aka ${play.datePlayed * 1000}`);
                            if (play.datePlayed * 1000 > (matchingBeatSaverMap!.lastChecked || 0)) {
                                console.log('Adding play');
                                newRecentPlays.push(play);
                            }
                        }
                        leaderboardData.recentPlays = newRecentPlays;                        
                    } else {
                        console.log('Leaderboard last checked play count will be undefined since we could not find this leaderboard id in report: ' + leaderboard.leaderboardId + ' | Also all plays will be shown');
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

    // Sort difficulties before writing the reports
    sortMapDifficulties(allMappersData);

    const htmlReport: Report = {
        mapperIdsToTrack: mapperIdsToTrack,
        mappers: allMappersData,
        generatedDate: lastReport.generatedDate
    };

    // Write HTML report
    const htmlContent = generateHtmlReport(htmlReport);
    fs.writeFileSync(HTML_REPORT_FILE_PATH, htmlContent, 'utf-8');
    console.log(`HTML report saved to: ${HTML_REPORT_FILE_PATH}`);
    
    // Create and write JSON report with updated lastChecked values
    const jsonReport = generateJsonReport(htmlReport);
    fs.writeFileSync(JSON_REPORT_FILE_PATH, JSON.stringify(jsonReport, null, 2), 'utf-8');
    console.log(`Report saved to: ${JSON_REPORT_FILE_PATH}`);
}

main().catch((err) => {
    console.error('Error:', err);
});

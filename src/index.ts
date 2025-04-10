import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { getLeaderboardData, getBeatLeaderLeaderboards, getMapsFromBeatSaver } from './utils/api';
import { Report } from './models/Report';
import { removeNonHex } from './utils/string';

const SAVED_REPORT_FILE_NAME = 'map-play-report.json';
const HTML_REPORT_FILE_NAME = 'map-play-report.html';
const JSON_REPORT_FILE_PATH = path.join(__dirname, SAVED_REPORT_FILE_NAME);
const HTML_REPORT_FILE_PATH = path.join(__dirname, HTML_REPORT_FILE_NAME);

async function main() {
    // Load last generated report file for mappers and differences
    const lastReport: Report | undefined = await Report.getLastReportFile(JSON_REPORT_FILE_PATH);
    console.log('Last report:', lastReport);

    let mapperIdsToTrack: number[] = [];
    if (!lastReport || !lastReport.mapperIdsToTrack || lastReport.mapperIdsToTrack.length === 0) {
        console.log('No mappers found in JSON file.');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const mapperId = await new Promise<number | undefined>((resolve) => {
            rl.question('Please enter a mapper ID to track (or press Enter to exit): ', (answer) => {
                rl.close();
                const parsedId = parseInt(answer, 10);
                resolve(isNaN(parsedId) ? undefined : parsedId);
            });
        });

        if (mapperId === undefined) {
            console.log('No mapper ID provided. Exiting...');
            return;
        }

        mapperIdsToTrack = [mapperId];
    } else {
        mapperIdsToTrack = lastReport.mapperIdsToTrack;
    }

    const allMappersData = await Report.assembleMappersData(
        mapperIdsToTrack,
        lastReport?.mappers || [],
        getMapsFromBeatSaver,
        getBeatLeaderLeaderboards,
        removeNonHex,
        getLeaderboardData
    );

    const htmlReport = new Report(
        allMappersData,
        lastReport?.generatedDate || Date.now(),
        mapperIdsToTrack
    );

    htmlReport.sortMapDifficulties();

    // Write HTML report
    const htmlContent = htmlReport.generateHtmlReport();
    fs.writeFileSync(HTML_REPORT_FILE_PATH, htmlContent, 'utf-8');
    console.log(`HTML report saved to: ${HTML_REPORT_FILE_PATH}`);

    // Create and write JSON report with updated lastChecked values
    const jsonReport = htmlReport.generateJsonReport();
    fs.writeFileSync(JSON_REPORT_FILE_PATH, JSON.stringify(jsonReport, null, 2), 'utf-8');
    console.log(`Report saved to: ${JSON_REPORT_FILE_PATH}`);
}

main().catch((err) => {
    console.error('Error:', err);
});

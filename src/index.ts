import fs from 'fs';
import path from 'path';
import { getLeaderboardData, getBeatLeaderLeaderboards, getMapsFromBeatSaver } from './utils/api';
import { getLastReportFile, generateHtmlReport, generateJsonReport } from './utils/file';
import { sortMapDifficulties } from './utils/map-data';
import { Report } from './models/Report';
import { removeNonHex } from './utils/string';

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

    const allMappersData = await Report.assembleMappersData(
        lastReport.mapperIdsToTrack,
        lastReport.mappers,
        getMapsFromBeatSaver,
        getBeatLeaderLeaderboards,
        removeNonHex,
        getLeaderboardData
    );

    sortMapDifficulties(allMappersData);

    const htmlReport = new Report(
        allMappersData,
        lastReport.generatedDate,
        lastReport.mapperIdsToTrack
    );

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

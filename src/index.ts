import fs from 'fs';
import path from 'path';
import readline from 'readline';
import express from 'express';
import { getLeaderboardData, getBeatLeaderLeaderboards, getMapsFromBeatSaver } from './utils/api';
import { Report } from './models/Report';
import { removeNonHex } from './utils/string';

const JSON_REPORT_FILE_PATH = path.join(__dirname, 'map-play-report.json');
const HTML_REPORT_FILE_PATH = path.join(__dirname, 'map-play-report.html');
const DEBOUNCE_TIME_IN_MS = 5 * 60000; // 5 minutes
const DEBUGGING = process.argv.includes('debug');

export async function runLocal() {
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
        if ((Date.now() - lastReport.generatedDate) < DEBOUNCE_TIME_IN_MS) {
            console.log(`Map data already up-to-date (last report was generated less than ${DEBOUNCE_TIME_IN_MS / 60000} minutes ago). Exiting...`);

            return;
        }
        mapperIdsToTrack = lastReport.mapperIdsToTrack;
    }

    const allMappersData = await Report.assembleMappersData(
        mapperIdsToTrack,
        lastReport?.mappers || [],
        getMapsFromBeatSaver,
        getBeatLeaderLeaderboards,
        removeNonHex,
        getLeaderboardData,
        DEBUGGING
    );

    const htmlReport = new Report(allMappersData, Date.now(), mapperIdsToTrack);

    // Write HTML report
    const htmlContent = htmlReport.generateHtmlReport();
    fs.writeFileSync(HTML_REPORT_FILE_PATH, htmlContent, 'utf-8');
    console.log(`HTML report saved to: ${HTML_REPORT_FILE_PATH}`);

    // Open the HTML report in the default browser
    const open = await import('open'); // Use dynamic import
    await open.default(HTML_REPORT_FILE_PATH);
    console.log('HTML report opened in the default browser.');

    // Create and write JSON report with updated lastChecked values
    const jsonReport = htmlReport.generateJsonReport();
    fs.writeFileSync(JSON_REPORT_FILE_PATH, JSON.stringify(jsonReport, null, 2), 'utf-8');
    console.log(`Report saved to: ${JSON_REPORT_FILE_PATH}`);
}

export async function startServer() {
    const app = express();
    const PORT = 3000;

    // Serve static files from the "public" directory
    app.use(express.static(path.join(__dirname, '../public')));

    app.get('/report', async (req, res) => {
        const lastReport: Report | undefined = await Report.getLastReportFile(JSON_REPORT_FILE_PATH);

        let htmlContent: string;
        if (lastReport && (Date.now() - lastReport.generatedDate) < DEBOUNCE_TIME_IN_MS) {
            console.log(`Serving cached report (last report was generated less than ${DEBOUNCE_TIME_IN_MS / 60000} minutes ago).`);
            htmlContent = new Report(lastReport.mappers, lastReport.generatedDate, lastReport.mapperIdsToTrack).generateHtmlReport();
        } else {
            console.log('Generating new report...');
            const mapperIdsToTrack = lastReport?.mapperIdsToTrack || [];

            if (mapperIdsToTrack.length === 0) {
                res.status(400).send('No mapper IDs to track. Please run the program in CLI mode to add mapper IDs.');
                return;
            }

            const allMappersData = await Report.assembleMappersData(
                mapperIdsToTrack,
                lastReport?.mappers || [],
                getMapsFromBeatSaver,
                getBeatLeaderLeaderboards,
                removeNonHex,
                getLeaderboardData,
                DEBUGGING
            );

            const newReport = new Report(allMappersData, Date.now(), mapperIdsToTrack);
            htmlContent = newReport.generateHtmlReport();

            // Save the new report
            const jsonReport = newReport.generateJsonReport();
            fs.writeFileSync(JSON_REPORT_FILE_PATH, JSON.stringify(jsonReport, null, 2), 'utf-8');
            console.log(`New report saved to: ${JSON_REPORT_FILE_PATH}`);
        }

        res.send(htmlContent);
    });

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

if (process.argv.includes('server')) {
    startServer().catch((err) => {
        console.error('Error starting server:', err);
    });
} else {
    runLocal().catch((err) => {
        console.error('Error:', err);
    });
}

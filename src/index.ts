import fs from 'fs';
import path from 'path';
import readline from 'readline';
import express from 'express';
import { getLeaderboardData, getBeatLeaderLeaderboards, getMapsFromBeatSaver } from './utils/api';
import { logError } from './utils/error';
import { Report } from './models/Report';
import { removeNonHex } from './utils/string';

const JSON_REPORT_FILE_PATH = path.join(__dirname, 'map-play-report.json');
const HTML_REPORT_FILE_PATH = path.join(__dirname, 'map-play-report.html');
const DEBOUNCE_TIME_IN_MS = 1000; // 1 second for testing
// const DEBOUNCE_TIME_IN_MS = 15 * 60000; // 15 minutes
const DEBUGGING = process.argv.includes('debug');

export async function runLocal() {
    try {
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
                rl.question('Please enter a BeatSaver mapper ID to track (or press Enter to exit): ', (answer) => {
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

        try {
            // Write HTML report
            const htmlContent = htmlReport.generateHtmlReport();
            fs.writeFileSync(HTML_REPORT_FILE_PATH, htmlContent, 'utf-8');
            console.log(`HTML report saved to: ${HTML_REPORT_FILE_PATH}`);

            // Open the HTML report in the default browser
            const open = await import('open');
            await open.default(HTML_REPORT_FILE_PATH);
            console.log('HTML report opened in the default browser.');

            // Create and write JSON report with updated lastChecked values
            const jsonReport = htmlReport.generateJsonReport();
            fs.writeFileSync(JSON_REPORT_FILE_PATH, JSON.stringify(jsonReport, null, 2), 'utf-8');
            console.log(`Report saved to: ${JSON_REPORT_FILE_PATH}`);
        } catch (error) {
            logError(error);
            console.error('Error writing report files:', error);
        }
    } catch (error) {
        logError(error);
        console.error('Error in runLocal:', error);
    }
}

export async function startServer() {
    const app = express();
    const PORT = 3000;

    // Serve static files from the "public" directory
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.static(path.join(__dirname, '../src/public')));

    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        logError(err);
        console.error('Server error:', err);
        res.status(500).send('Internal Server Error');
    });

    app.get('/report', async (req, res) => {
        try {
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

                try {
                    // Save the new report
                    const jsonReport = newReport.generateJsonReport();
                    fs.writeFileSync(JSON_REPORT_FILE_PATH, JSON.stringify(jsonReport, null, 2), 'utf-8');
                    console.log(`New report saved to: ${JSON_REPORT_FILE_PATH}`);
                } catch (error) {
                    logError(error);
                    console.error('Error saving JSON report:', error);
                    // Continue serving the HTML content even if saving JSON fails
                }
            }

            res.send(htmlContent);
        } catch (error) {
            logError(error);
            console.error('Error generating report:', error);
            res.status(500).send('Error generating report. Please check the error.log file for details.');
        }
    });

    const server = app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });

    // Handle server errors
    server.on('error', (error: Error) => {
        logError(error);
        console.error('Server error:', error);
    });

    return server;
}

if (process.argv.includes('server')) {
    startServer().catch((err) => {
        logError(err);
        console.error('Error starting server:', err);
    });
} else {
    runLocal().catch((err) => {
        logError(err);
        console.error('Error:', err);
    });
}

import fs from 'fs';
import { Report } from '../models/Report';

export function getLastReportFile(reportFilePath: string): Promise<Report | undefined> {
    let lastReport: Report | undefined;
    return new Promise((resolve) => {
        if (fs.existsSync(reportFilePath)) {
            try {
                const fileContent = fs.readFileSync(reportFilePath, 'utf-8');
                lastReport = JSON.parse(fileContent) as Report;
                console.log('Successfully loaded last report');
                resolve(lastReport);
            } catch (error) {
                console.error('Failed to load last report:', error);
                lastReport = undefined; 
                resolve(lastReport);
            }
        } else {
            console.log('No previous report file found.');
            resolve(lastReport);
        }
    });
}

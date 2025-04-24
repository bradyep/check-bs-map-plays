import fs from 'fs';
import path from 'path';

const ERROR_LOG_PATH = path.join(__dirname, 'error.log');

export function logError(error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const truncatedMessage = errorMessage.slice(0, 300);
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${truncatedMessage}\n`;
    fs.appendFileSync(ERROR_LOG_PATH, logEntry);
}

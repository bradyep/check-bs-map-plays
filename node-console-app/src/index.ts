// import fs from 'fs';
import path from 'path';
import { fetchPlays, fetchMapsByMapper } from './utils/api';

// const LAST_EXECUTION_FILE = path.join(__dirname, 'lastExecution.txt');
const MAPPER_ID = '132909'; // Replace with the actual mapper ID

async function main() {
    const maps = await fetchMapsByMapper(MAPPER_ID);

    for (const map of maps) {
        const playsCount = await fetchPlays(map.id);

        console.log(`Total plays for map ${map.name}: ${playsCount}`);
    }

    // updateLastExecutionTimestamp();
}

/*
function getLastExecutionTimestamp(): string {
    if (fs.existsSync(LAST_EXECUTION_FILE)) {
        return fs.readFileSync(LAST_EXECUTION_FILE, 'utf-8');
    }
    return new Date(0).toISOString(); // Default to epoch if file doesn't exist
}

function updateLastExecutionTimestamp(): void {
    fs.writeFileSync(LAST_EXECUTION_FILE, new Date().toISOString());
}
*/

main().catch(err => {
    console.error('Error:', err);
});
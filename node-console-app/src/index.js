const fs = require('fs');
const path = require('path');
const { fetchNewPlays, fetchMapsByMapper } = require('./utils/api');

const LAST_EXECUTION_FILE = path.join(__dirname, 'lastExecution.txt');
const MAPPER_ID = 'your_mapper_id_here'; // Replace with the actual mapper ID

async function main() {
    let lastExecutionTimestamp = getLastExecutionTimestamp();
    const maps = await fetchMapsByMapper(MAPPER_ID);

    for (const map of maps) {
        const newPlays = await fetchNewPlays(map.id, lastExecutionTimestamp);

        if (newPlays.length > 0) {
            console.log(`New plays for map ${map.name} since last execution:`);
            newPlays.forEach(play => {
                console.log(`- ${play.playerName}: ${play.score}`);
            });
        } else {
            console.log(`No new plays for map ${map.name} since last execution.`);
        }
    }

    updateLastExecutionTimestamp();
}

function getLastExecutionTimestamp() {
    if (fs.existsSync(LAST_EXECUTION_FILE)) {
        return fs.readFileSync(LAST_EXECUTION_FILE, 'utf-8');
    }
    return new Date(0).toISOString(); // Default to epoch if file doesn't exist
}

function updateLastExecutionTimestamp() {
    fs.writeFileSync(LAST_EXECUTION_FILE, new Date().toISOString());
}

main().catch(err => {
    console.error('Error:', err);
});
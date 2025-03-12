"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("./utils/api");
// const LAST_EXECUTION_FILE = path.join(__dirname, 'lastExecution.txt');
const MAPPER_ID = '132909'; // Replace with the actual mapper ID
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const maps = yield (0, api_1.fetchMapsByMapper)(MAPPER_ID);
        for (const map of maps) {
            const playsCount = yield (0, api_1.fetchPlays)(map.id);
            console.log(`Total plays for map ${map.name}: ${playsCount}`);
        }
        // updateLastExecutionTimestamp();
    });
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

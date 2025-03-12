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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPlays = exports.fetchMapsByMapper = void 0;
const axios_1 = __importDefault(require("axios"));
function fetchMapsByMapper(mapperId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Example: https://api.beatleader.com/maps?mappers=132909
        const response = yield axios_1.default.get(`https://api.beatleader.com/maps?mappers=${mapperId}`);
        return response.data.data.flatMap((map) => map.difficulties.map((difficulty) => ({
            id: difficulty.leaderboardId,
            name: map.name
        })));
    });
}
exports.fetchMapsByMapper = fetchMapsByMapper;
function fetchPlays(mapId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Example: https://api.beatleader.com/leaderboard/scores/442a6x91
        const response = yield axios_1.default.get(`https://api.beatleader.com/leaderboard/scores/${mapId}`);
        return response.data.scores.length;
        /*
        return response.data.map((play: any) => ({
            playerName: play.player.name,
            score: play.score
        }));
        */
    });
}
exports.fetchPlays = fetchPlays;

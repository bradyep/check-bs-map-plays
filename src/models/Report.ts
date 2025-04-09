import { Mapper } from './Mapper';
import { Leaderboard } from './Leaderboard';
import { Map } from './Map';
import { Play } from './Play';

export class Report {
    static readonly UNKNOWN_MAPPER_NAME = 'Unknown Mapper';
    
    constructor(
        public mappers: Mapper[],
        public generatedDate: number,
        public mapperIdsToTrack: number[]
    ) { }

    public static async assembleMappersData(
        mapperIds: number[],
        mappersFromLastReport: Mapper[],
        getMapsFromBeatSaver: (mapperId: number) => Promise<Map[]>,
        getLeaderboards: (mapperId: number) => Promise<Map[]>,
        removeNonHex: (id: string) => string,
        getLeaderboardData: (leaderboardId: string) => Promise<Leaderboard>
    ): Promise<Mapper[]> {
        const allMappersData: Mapper[] = [];

        for (const mapperId of mapperIds) {
            console.log(`Processing mapper ID: ${mapperId}`);
            let mapperName: string = Report.UNKNOWN_MAPPER_NAME;
            const currentReportMapper = mappersFromLastReport.find((mapper) => mapper.mapperId === mapperId);

            const beatSaverMaps: Map[] = await getMapsFromBeatSaver(mapperId);
            const beatLeaderMaps: Map[] = await getLeaderboards(mapperId);
            console.log(`${beatSaverMaps.length} maps from Beat Saver: ` + beatSaverMaps.map((map) => map.id).join(', '));
            console.log(`${beatLeaderMaps.length} maps from Beat Leader: ` + beatLeaderMaps.map((map) => map.id).join(', '));

            for (const blMap of beatLeaderMaps) {
                // TODO: Instead of mutating maps we get from API, create new mergedMaps
                const nonHexId = removeNonHex(blMap.id);
                console.log(`Processing blMap.id: ${blMap.id} | nonHexId: ${nonHexId}`);
                let matchingBeatSaverMap = beatSaverMaps.find((beatSaverMap) => beatSaverMap.id === nonHexId);

                if (!matchingBeatSaverMap) {
                    console.log('No matching BeatSaver map found for id: ' + nonHexId + ', this should not happen. Throwing in the towel');
                    continue;
                }
                // QUESTION: Do we need to set this? Use mergedMaps in the future.
                blMap.id = matchingBeatSaverMap.id;
                if (mapperName === Report.UNKNOWN_MAPPER_NAME) {
                    mapperName = matchingBeatSaverMap.mapperName;
                }

                let currentReportMap: Map | undefined = undefined;
                if (currentReportMapper) {
                    currentReportMap = currentReportMapper.maps.find((map) => map.id === blMap.id);
                    if (currentReportMap) {
                        matchingBeatSaverMap.lastChecked = currentReportMap.lastChecked;
                        matchingBeatSaverMap.totalPlaysWhenLastChecked = currentReportMap.totalPlays;
                        matchingBeatSaverMap.upvotesWhenLastChecked = currentReportMap.upvotes;
                        matchingBeatSaverMap.downvotesWhenLastChecked = currentReportMap.downvotes;
                        matchingBeatSaverMap.bsScoreWhenLastChecked = currentReportMap.bsScore;
                    } else {
                        console.log('Map lastChecked values will be undefined since we could not find this map id in report: ' + blMap.id);
                    }
                } else {
                    console.log('Map lastChecked values will be undefined since we could not find this mapper id in report: ' + mapperId);
                }

                console.log(`blMap.leaderboards.length: ${blMap.leaderboards.length}`);
                for (const leaderboard of blMap.leaderboards) {
                    const leaderboardData: Leaderboard = await getLeaderboardData(leaderboard.leaderboardId);
                    if (currentReportMap && currentReportMap.leaderboards) {
                        const currentReportLeaderboard = currentReportMap.leaderboards.find((lb) => lb.leaderboardId === leaderboard.leaderboardId);
                        if (currentReportLeaderboard) {
                            leaderboardData.playCountWhenLastChecked = currentReportLeaderboard.playCount;
                            const newRecentPlays: Play[] = [];
                            for (const play of leaderboardData.recentPlays) {
                                if (play.datePlayed * 1000 > (matchingBeatSaverMap!.lastChecked || 0)) {
                                    newRecentPlays.push(play);
                                }
                            }
                            leaderboardData.recentPlays = newRecentPlays;
                        } else {
                            console.log('Leaderboard last checked play count will be undefined since we could not find this leaderboard id in report: ' + leaderboard.leaderboardId);
                        }
                    } else {
                        console.log('Leaderboard last checked play count will be undefined since we could not find this map id in report (or it didnt have leaderboards): ' + blMap.id);
                    }
                    matchingBeatSaverMap.leaderboards = matchingBeatSaverMap.leaderboards || [];
                    matchingBeatSaverMap.leaderboards.push(leaderboardData);
                    matchingBeatSaverMap.totalPlays = matchingBeatSaverMap.leaderboards.reduce((sum: number, lb: Leaderboard) => sum + lb.playCount, 0);
                }
            }

            allMappersData.push({
                mapperId: mapperId,
                mapperName: mapperName,
                maps: beatSaverMaps
            });
        }

        return allMappersData;
    } // public static async assembleMappersData(

}

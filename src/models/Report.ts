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
        getBeatLeaderLeaderboards: (mapperId: number) => Promise<Map[]>,
        removeNonHex: (id: string) => string,
        getLeaderboardData: (leaderboardId: string) => Promise<Leaderboard>
    ): Promise<Mapper[]> {
        const allMappersData: Mapper[] = [];
        for (const mapperId of mapperIds) {
            console.log(`Processing mapper ID: ${mapperId}`);
            let mapperName: string = Report.UNKNOWN_MAPPER_NAME;
            const currentReportMapper = mappersFromLastReport.find((mapper) => mapper.mapperId === mapperId);
            // Don't mutate data from API calls
            const beatSaverMaps: ReadonlyArray<Map> = await getMapsFromBeatSaver(mapperId);
            const beatLeaderMaps: ReadonlyArray<Map> = await getBeatLeaderLeaderboards(mapperId);
            console.log(`${beatSaverMaps.length} maps from Beat Saver: ` + beatSaverMaps.map((map) => map.id).join(', '));
            console.log(`${beatLeaderMaps.length} maps from Beat Leader: ` + beatLeaderMaps.map((map) => map.id).join(', '));

            const mapperData: Map[] = [];

            for (const blMap of beatLeaderMaps) {
                const nonHexId = removeNonHex(blMap.id);
                console.log(`Processing blMap.id: ${blMap.id} | nonHexId: ${nonHexId}`);
                const matchingBeatSaverMap: Readonly<Map> | undefined = beatSaverMaps.find((beatSaverMap) => beatSaverMap.id === nonHexId);

                if (!matchingBeatSaverMap) {
                    console.log('No matching BeatSaver map found for id: ' + nonHexId + ', this should not happen. Throwing in the towel');
                    continue;
                }
                const mergedMap = { ...matchingBeatSaverMap };
                if (mapperName === Report.UNKNOWN_MAPPER_NAME) {
                    mapperName = mergedMap.mapperName;
                }

                let currentReportMap: Map | undefined = undefined;
                if (currentReportMapper) {
                    currentReportMap = currentReportMapper.maps.find((map) => map.id === mergedMap.id);
                    if (currentReportMap) {
                        mergedMap.lastChecked = currentReportMap.lastChecked;
                        mergedMap.totalPlaysWhenLastChecked = currentReportMap.totalPlays;
                        mergedMap.upvotesWhenLastChecked = currentReportMap.upvotes;
                        mergedMap.downvotesWhenLastChecked = currentReportMap.downvotes;
                        mergedMap.bsScoreWhenLastChecked = currentReportMap.bsScore;
                    } else {
                        console.log('Map lastChecked values will be undefined since we could not find this map id in report: ' + mergedMap.id);
                    }
                } else {
                    console.log('Map lastChecked values will be undefined since we could not find this mapper id in report: ' + mapperId);
                }

                console.log(`blMap.leaderboards.length: ${blMap.leaderboards.length}`);
                for (const leaderboard of blMap.leaderboards) {
                    // Do not mutate data from API calls
                    const leaderboardData: Readonly<Leaderboard> = await getLeaderboardData(leaderboard.leaderboardId);
                    const mergedMapLeaderboardData = { ...leaderboardData };
                    if (currentReportMap && currentReportMap.leaderboards) {
                        const currentReportLeaderboard = currentReportMap.leaderboards.find((lb) => lb.leaderboardId === leaderboard.leaderboardId);
                        if (currentReportLeaderboard) {
                            mergedMapLeaderboardData.playCountWhenLastChecked = currentReportLeaderboard.playCount;
                            const newRecentPlays: Play[] = [];
                            for (const play of mergedMapLeaderboardData.recentPlays) {
                                if (play.datePlayed * 1000 > (mergedMap!.lastChecked || 0)) {
                                    newRecentPlays.push(play);
                                }
                            }
                            mergedMapLeaderboardData.recentPlays = newRecentPlays;
                        } else {
                            console.log('Leaderboard last checked play count will be undefined since we could not find this leaderboard id in report: ' + leaderboard.leaderboardId);
                        }
                    } else {
                        console.log('Leaderboard last checked play count will be undefined since we could not find this map id in report (or it didnt have leaderboards): ' + mergedMap.id);
                    }
                    mergedMap.leaderboards = mergedMap.leaderboards || [];
                    mergedMap.leaderboards.push(mergedMapLeaderboardData);
                    mergedMap.totalPlays = mergedMap.leaderboards.reduce((sum: number, lb: Leaderboard) => sum + lb.playCount, 0);
                }

                mapperData.push(mergedMap);
            }

            allMappersData.push({
                mapperId: mapperId,
                mapperName: mapperName,
                maps: mapperData
            });
        } // for (const mapperId of mapperIds) {

        return allMappersData;
    } // public static async assembleMappersData(

}

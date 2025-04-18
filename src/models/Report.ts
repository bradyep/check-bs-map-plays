import { Mapper } from './Mapper';
import { Leaderboard } from './Leaderboard';
import { Map } from './Map';
import { Play } from './Play';
import fs from 'fs';

export class Report {
  static readonly UNKNOWN_MAPPER_NAME = 'Unknown Mapper';

  constructor(
    public mappers: Mapper[],
    public generatedDate: number,
    public mapperIdsToTrack: number[]
  ) { }

  public generateJsonReport(): Report {
    // Need deep cloning to get correct lastChecked values
    const jsonReport = structuredClone(this);
    for (const mapper of jsonReport.mappers) {
      for (const map of mapper.maps) {
        map.lastChecked = Date.now();
        map.totalPlaysWhenLastChecked = map.totalPlays;
        map.upvotesWhenLastChecked = map.upvotes;
        map.downvotesWhenLastChecked = map.downvotes;
        map.bsScoreWhenLastChecked = map.bsScore;
        for (const leaderboard of map.leaderboards) {
          leaderboard.playCountWhenLastChecked = leaderboard.playCount;
        }
      }
    }

    return jsonReport;
  }

  public static async getLastReportFile(reportFilePath: string): Promise<Report | undefined> {
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

  public sortMapDifficulties(): void {
    const difficultyOrder = ["ExpertPlus", "Expert", "Hard", "Normal", "Easy"];
    for (const mapperData of this.mappers) {
      for (const map of mapperData.maps) {
        if (map.leaderboards) {
          map.leaderboards.sort((a, b) => {
            const indexA = difficultyOrder.indexOf(a.difficultyName);
            const indexB = difficultyOrder.indexOf(b.difficultyName);

            // If difficultyName is not in the predefined order, place it after "Easy"
            const adjustedIndexA = indexA === -1 ? difficultyOrder.length : indexA;
            const adjustedIndexB = indexB === -1 ? difficultyOrder.length : indexB;

            return adjustedIndexA - adjustedIndexB;
          });
        }
      }
    }
  }

  public static async assembleMappersData(
    mapperIds: number[],
    mappersFromLastReport: Mapper[],
    getMapsFromBeatSaver: (mapperId: number) => Promise<Map[]>,
    getBeatLeaderLeaderboards: (mapperId: number) => Promise<Map[]>,
    removeNonHex: (id: string) => string,
    getLeaderboardData: (leaderboardId: string) => Promise<Leaderboard>,
    debugging: boolean = false
  ): Promise<Mapper[]> {
    const allMappersData: Mapper[] = [];
    for (const mapperId of mapperIds) {
      console.log(`Processing mapper ID: ${mapperId}`);
      let mapperName: string = Report.UNKNOWN_MAPPER_NAME;
      const currentReportMapper = mappersFromLastReport.find((mapper) => mapper.mapperId === mapperId);
      
      // Handle potential API errors gracefully
      let beatSaverMaps: ReadonlyArray<Map> = [];
      let beatLeaderMaps: ReadonlyArray<Map> = [];
      
      try {
        beatSaverMaps = await getMapsFromBeatSaver(mapperId);
      } catch (error) {
        console.error('Error fetching Beat Saver maps:', error);
      }

      try {
        beatLeaderMaps = await getBeatLeaderLeaderboards(mapperId);
      } catch (error) {
        console.error('Error fetching Beat Leader maps:', error);
      }

      console.log(`${beatSaverMaps.length} maps from Beat Saver` + (debugging ? ' : ' + beatSaverMaps.map((map) => map.id).join(', ') : ''));
      console.log(`${beatLeaderMaps.length} maps from Beat Leader` + (debugging ? ' : ' + beatLeaderMaps.map((map) => map.id).join(', ') : ''));

      const mapperData: Map[] = [];

      for (const blMap of beatLeaderMaps) {
        const nonHexId = removeNonHex(blMap.id);
        console.log(`Processing blMap.id: ${blMap.id}` + (debugging ? ` | nonHexId: ${nonHexId}` : ''));
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
            if (debugging) { console.log('Map lastChecked values will be undefined since we could not find this map id in report: ' + mergedMap.id); }
          }
        } else {
          if (debugging) { console.log('Map lastChecked values will be undefined since we could not find this mapper id in report: ' + mapperId); }
        }

        if (debugging) { console.log(`blMap.leaderboards.length: ${blMap.leaderboards.length}`); }
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
              if (debugging) { console.log('Leaderboard last checked play count will be undefined since we could not find this leaderboard id in report: ' + leaderboard.leaderboardId); }
            }
          } else {
            if (debugging) { console.log('Leaderboard last checked play count will be undefined since we could not find this map id in report (or it didnt have leaderboards): ' + mergedMap.id); }
          }
          mergedMap.leaderboards = mergedMap.leaderboards || [];
          mergedMap.leaderboards.push(mergedMapLeaderboardData);
          mergedMap.totalPlays = mergedMap.leaderboards.reduce((sum: number, lb: Leaderboard) => sum + lb.playCount, 0);
        }

        mapperData.push(mergedMap);
      } // for (const blMap of beatLeaderMaps) {

      // Sort maps by uploadDate in descending order
      mapperData.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

      allMappersData.push({
        mapperId: mapperId,
        mapperName: mapperName,
        maps: mapperData
      });
    } // for (const mapperId of mapperIds) {

    return allMappersData;
  } // public static async assembleMappersData(

  public generateHtmlReport(): string {
    this.sortMapDifficulties();

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Map Play Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #0d1117;
          color: #c9d1d9;
        }
        header {
          background-color: #161b22;
          color: #f0f6fc;
          padding: 1rem;
          text-align: center;
          font-size: 1.5rem;
          font-weight: bold;
          border-bottom: 1px solid #30363d;
        }
        .creationDate {
          font-size: 0.8rem;
          color: #aab4bd;
        }
        .container {
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .mapper {
          margin-bottom: 2rem;
          border: 1px solid #30363d;
          border-radius: 8px;
          background-color: #161b22;
          padding: 1rem;
        }
        .mapper h2 {
          margin-top: 0;
          color: #58a6ff;
        }
        .map {
          margin-bottom: 1rem;
          padding: 1rem;
          border: 1px solid #30363d;
          border-radius: 8px;
          background-color: #0d1117;
        }
        .map-details {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        .map-info {
          flex: 1;
        }
        .map-info p {
          margin-top: 0.6rem;
          margin-bottom: 0.6rem;
        }
        .map h3 {
          margin-top: 0;
          color: #79c0ff;
        }
        span.lastChecked {
          font-size: 0.8rem;
          color: #5f6f8b;
          margin-left: 0.4rem;
        }
        .map img {
          max-width: 150px;
          max-height: 150px;
          border-radius: 8px;
          border: 1px solid #30363d;
          float: right;
        }
        td.replayCell {
          display: flex;
          justify-content: center;
        }
        .replayIcon {
          width: 1.6em;
          height: 1.6em;
        }
        .leaderboard {
          margin-top: 1.5rem;
          padding: 0.5rem;
          border: 1px solid #30363d;
          border-radius: 8px;
          background-color: #161b22;
          width: 100%;
          box-sizing: border-box;
        }
        .leaderboard h4 {
          margin: 0;
          color: #8b949e;
        }
        .recent-plays {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: #0d1117;
          border-radius: 8px;
        }
        .recent-plays table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.5rem;
        }
        .recent-plays th, .recent-plays td {
          border: 1px solid #30363d;
          padding: 0.5rem;
          text-align: left;
        }
        .recent-plays th {
          background-color: #161b22;
          color: #f0f6fc;
        }
        .recent-plays td {
          background-color: #0d1117;
        }
        .positive-change {
          color: #28a745;
        }
        .negative-change {
          color: #d73a49;
        }
      </style>
    </head>
    <body>
      <header>Map Play Report <span class="creationDate">Created: ${new Date(this.generatedDate).toLocaleString()}</span></header>
      <div class="container">
        ${this.mappers.map(mapper => `
          <div class="mapper">
            <h2>Mapper: ${mapper.mapperName}</h2>
            ${mapper.maps.map(map => `
              <div class="map">
                <div class="map-details">
                  <div class="map-info">
                    ${map.coverUrl ? `<img src="${map.coverUrl}" alt="Cover for ${map.name}">` : ''}
                    <h3>Map: ${map.name}<span class="lastChecked">Last Checked: ${new Date(map.lastChecked).toLocaleString()}</span></h3>
                    <p><strong>Upvotes:</strong> ${map.upvotes}${map.upvotes !== (map.upvotesWhenLastChecked || 0) ? ` (<span class="${map.upvotes - (map.upvotesWhenLastChecked || 0) >= 0 ? 'positive-change' : 'negative-change'}">${map.upvotes - (map.upvotesWhenLastChecked || 0) >= 0 ? '+' : ''}${map.upvotes - (map.upvotesWhenLastChecked || 0)}</span>)` : ''}</p>
                    <p><strong>Downvotes:</strong> ${map.downvotes}${map.downvotes !== (map.downvotesWhenLastChecked || 0) ? ` (<span class="${map.downvotes - (map.downvotesWhenLastChecked || 0) >= 0 ? 'negative-change' : 'positive-change'}">${map.downvotes - (map.downvotesWhenLastChecked || 0) >= 0 ? '+' : ''}${map.downvotes - (map.downvotesWhenLastChecked || 0)}</span>)` : ''}</p>
                    <p><strong>Beatsaver Vote Rating:</strong> ${map.bsScore}${map.bsScore !== (map.bsScoreWhenLastChecked || 0) ? ` (<span class="${(map.bsScore || 0) - (map.bsScoreWhenLastChecked || 0) >= 0 ? 'positive-change' : 'negative-change'}">${(map.bsScore || 0) - (map.bsScoreWhenLastChecked || 0) >= 0 ? '+' : ''}${((map.bsScore || 0) - (map.bsScoreWhenLastChecked || 0)).toFixed(1)}</span>)` : ''}</p>
                    <p><strong>Total Plays:</strong> ${map.totalPlays}${map.totalPlays !== (map.totalPlaysWhenLastChecked || 0) ? ` (<span class="${(map.totalPlays || 0) - (map.totalPlaysWhenLastChecked || 0) >= 0 ? 'positive-change' : 'negative-change'}">${(map.totalPlays || 0) - (map.totalPlaysWhenLastChecked || 0) >= 0 ? '+' : ''}${(map.totalPlays || 0) - (map.totalPlaysWhenLastChecked || 0)}</span>)` : ''}</p>
                    ${map.leaderboards.map(leaderboard => `
                      <div class="leaderboard">
                        <h4>${leaderboard.difficultyName} - ${leaderboard.modeName}</h4>
                        <p><strong>Total Play Count:</strong> ${leaderboard.playCount}${leaderboard.playCount !== (leaderboard.playCountWhenLastChecked || 0) ? ` (<span class="${leaderboard.playCount - (leaderboard.playCountWhenLastChecked || 0) >= 0 ? 'positive-change' : 'negative-change'}">${leaderboard.playCount - (leaderboard.playCountWhenLastChecked || 0) >= 0 ? '+' : ''}${leaderboard.playCount - (leaderboard.playCountWhenLastChecked || 0)}</span>)` : ''}</p>
                        <div class="recent-plays">
                          <h5>Recent Plays:</h5>
                          ${leaderboard.recentPlays.length > 0 ? `
                          <table>
                            <thead>
                              <tr>
                                <th>Player (Total PP)</th>
                                <th>Accuracy</th>
                                <th>Modifiers</th>
                                <th>Total Mistakes</th>
                                <th>Date Played</th>
                                <th>Replay</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${leaderboard.recentPlays.map(play => `
                                <tr>
                                  <td>${play.playerName || 'Unknown'} (${Math.round(play.playerTotalPp)})</td>
                                  <td>${(play.accScore * 100).toFixed(2)}</td>
                                  <td>${play.modifiers || ''}</td>
                                  <td>${play.totalMistakes}</td>
                                  <td>${new Date(play.datePlayed * 1000).toLocaleString()}</td>
                                  <td class="replayCell">
                                    <a href="https://replay.beatleader.com/?scoreId=${play.scoreId}" target="_blank">
                                      <img src="/images/replays.svg" class="replayIcon"></img>
                                    </a>
                                  </td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                          ` : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </body>
    </html>
    `;
  } // public generateHtmlReport(): string {
} // export class Report {

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

export function generateHtmlReport(report: Report): string {
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
    .map h3 {
      margin-top: 0;
      color: #79c0ff;
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
      margin-top: 1rem;
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
  </style>
</head>
<body>
  <header>Map Play Report (Last Report: ${new Date(report.generatedDate).toLocaleString()})</header>
  <div class="container">
    ${report.mappers.map(mapper => `
      <div class="mapper">
        <h2>Mapper: ${mapper.mapperName}</h2>
        ${mapper.maps.map(map => `
          <div class="map">
            <div class="map-details">
              <div class="map-info">
                ${map.coverUrl ? `<img src="${map.coverUrl}" alt="Cover for ${map.name}">` : ''}
                <h3>Map: ${map.name} (Last Checked: ${new Date(map.lastChecked).toLocaleString()})</h3>
                <p><strong>Upvotes:</strong> ${map.upvotes} (Old Value: ${map.upvotesWhenLastChecked})</p>
                <p><strong>Downvotes:</strong> ${map.downvotes} (Old Value: ${map.downvotesWhenLastChecked})</p>
                <p><strong>BS Score:</strong> ${map.bsScore} (Old Value: ${map.bsScoreWhenLastChecked})</p>
                <p><strong>Total Plays:</strong> ${map.totalPlays} (Old Value: ${map.totalPlaysWhenLastChecked})</p>
                ${map.leaderboards.map(leaderboard => `
                  <div class="leaderboard">
                    <h4>Leaderboard: ${leaderboard.difficultyName} - ${leaderboard.modeName}</h4>
                    <p><strong>Total Play Count:</strong> ${leaderboard.playCount} (Old Value: ${leaderboard.playCountWhenLastChecked})</p>
                    <div class="recent-plays">
                      <h5>Recent Plays:</h5>
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
                                  <img src="./images/replays.svg" class="replayIcon"></img>
                                </a>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
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
}

export function generateJsonReport(htmlReport: Report): Report {
  const jsonReport = { ...htmlReport };
  jsonReport.generatedDate = Date.now();
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

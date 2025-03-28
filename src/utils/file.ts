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
    .map h3 {
      margin-top: 0;
      color: #79c0ff;
    }
    .leaderboard {
      margin-top: 1rem;
      padding: 0.5rem;
      border: 1px solid #30363d;
      border-radius: 8px;
      background-color: #161b22;
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
    .recent-plays p {
      margin: 0.2rem 0;
    }
  </style>
</head>
<body>
  <header>Map Play Report</header>
  <div class="container">
    ${report.mappers.map(mapper => `
      <div class="mapper">
        <h2>Mapper: ${mapper.mapperName}</h2>
        ${mapper.maps.map(map => `
          <div class="map">
            <h3>Map: ${map.name}</h3>
            <p><strong>Upvotes:</strong> ${map.upvotes}</p>
            <p><strong>Downvotes:</strong> ${map.downvotes}</p>
            <p><strong>BS Score:</strong> ${map.bsScore}</p>
            <p><strong>Total Plays:</strong> ${map.totalPlays}</p>
            ${map.leaderboards.map(leaderboard => `
              <div class="leaderboard">
                <h4>Leaderboard: ${leaderboard.difficultyName} - ${leaderboard.modeName}</h4>
                <p><strong>Play Count:</strong> ${leaderboard.playCount}</p>
                <div class="recent-plays">
                  <h5>Recent Plays:</h5>
                  ${leaderboard.recentPlays.map(play => `
                    <p><strong>Player:</strong> ${play.playerName || 'Unknown'} | <strong>Mistakes:</strong> ${play.totalMistakes}</p>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `).join('')}
  </div>
</body>
</html>
    `;
}

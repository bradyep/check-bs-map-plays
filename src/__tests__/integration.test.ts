import { Report } from '../models/Report';
import { getLeaderboardData, getBeatLeaderLeaderboards, getMapsFromBeatSaver } from '../utils/api';
import { removeNonHex } from '../utils/string';
import fs from 'fs';
import path from 'path';

jest.mock('../utils/api');
jest.mock('../utils/string');
jest.mock('fs');
jest.mock('path');

describe('Integration Tests', () => {
  const mockDate = new Date('2024-01-01').getTime();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate);
  });

  it('should generate a complete report with data from multiple sources', async () => {
    // Mock BeatSaver API response
    (getMapsFromBeatSaver as jest.Mock).mockResolvedValue([{
      id: 'map1',
      name: 'Test Map',
      mapperId: 1,
      mapperName: 'TestMapper',
      upvotes: 10,
      downvotes: 2,
      bsScore: 0.8,
      uploadDate: '2024-01-01',
      coverUrl: 'test.jpg'
    }]);

    // Mock BeatLeader API response
    (getBeatLeaderLeaderboards as jest.Mock).mockResolvedValue([{
      id: 'map1',
      name: 'Test Map',
      mapperId: 1,
      mapperName: 'TestMapper',
      leaderboards: [{
        leaderboardId: 'lb1',
        difficultyName: 'ExpertPlus',
        modeName: 'Standard',
        plays: 100
      }]
    }]);

    // Mock Leaderboard data
    (getLeaderboardData as jest.Mock).mockResolvedValue({
      leaderboardId: 'lb1',
      mapId: 'map1',
      difficultyName: 'ExpertPlus',
      modeName: 'Standard',
      playCount: 100,
      recentPlays: [{
        playerName: 'Player1',
        accScore: 0.95,
        modifiers: 'NA',
        datePlayed: mockDate / 1000,
        scoreId: 'score1',
        playerTotalPp: 1000,
        totalMistakes: 1
      }]
    });

    (removeNonHex as jest.Mock).mockImplementation(id => id);

    // Mock file system
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      mappers: [],
      generatedDate: mockDate - 1000000,
      mapperIdsToTrack: [1]
    }));

    const mappersData = await Report.assembleMappersData(
      [1],
      [],
      getMapsFromBeatSaver,
      getBeatLeaderLeaderboards,
      removeNonHex,
      getLeaderboardData
    );

    const report = new Report(mappersData, mockDate, [1]);
    const htmlReport = report.generateHtmlReport();
    const jsonReport = report.generateJsonReport();

    // Verify the assembled data
    expect(mappersData).toHaveLength(1);
    expect(mappersData[0].maps[0].leaderboards).toHaveLength(1);
    expect(mappersData[0].maps[0].leaderboards[0].recentPlays).toHaveLength(1);

    // Verify HTML report contains key elements
    expect(htmlReport).toContain('Test Map');
    expect(htmlReport).toContain('ExpertPlus');
    expect(htmlReport).toContain('Player1');

    // Verify JSON report has updated timestamps
    expect(jsonReport.mappers[0].maps[0].lastChecked).toBe(mockDate);
    expect(jsonReport.mappers[0].maps[0].totalPlaysWhenLastChecked).toBe(100);
  });

  it('should handle API errors gracefully', async () => {
    (getMapsFromBeatSaver as jest.Mock).mockRejectedValue(new Error('API Error'));
    (getBeatLeaderLeaderboards as jest.Mock).mockResolvedValue([]);
    (removeNonHex as jest.Mock).mockImplementation(id => id);
    (getLeaderboardData as jest.Mock).mockResolvedValue({
      leaderboardId: 'test',
      mapId: 'test',
      difficultyName: 'Expert',
      modeName: 'Standard',
      playCount: 0,
      recentPlays: []
    });

    const mappersData = await Report.assembleMappersData(
      [1],
      [],
      getMapsFromBeatSaver,
      getBeatLeaderLeaderboards,
      removeNonHex,
      getLeaderboardData
    );

    // When API fails, we should still get a mapper with empty maps
    expect(mappersData).toHaveLength(1);
    expect(mappersData[0].mapperId).toBe(1);
    expect(mappersData[0].maps).toHaveLength(0);
  });
});
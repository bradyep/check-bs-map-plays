import { Report } from '../models/Report';
import { Map } from '../models/Map';
import { Mapper } from '../models/Mapper';
import { Leaderboard } from '../models/Leaderboard';
import fs from 'fs';

jest.mock('fs');

describe('Report', () => {
  const mockDate = new Date('2024-01-01').getTime();
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate);
  });

  describe('generateJsonReport', () => {
    it('should create a new report with updated timestamps', () => {
      const mockLeaderboard: Leaderboard = {
        leaderboardId: 'lb1',
        mapId: 'map1',
        difficultyName: 'Expert',
        modeName: 'Standard',
        playCount: 100,
        recentPlays: []
      };

      const mockMap: Map = {
        id: 'map1',
        name: 'Test Map',
        mapperId: 1,
        mapperName: 'TestMapper',
        lastChecked: 0,
        totalPlays: 100,
        upvotes: 10,
        downvotes: 2,
        bsScore: 0.8,
        uploadDate: '2024-01-01',
        leaderboards: [mockLeaderboard]
      };

      const mockMapper: Mapper = {
        mapperId: 1,
        mapperName: 'TestMapper',
        maps: [mockMap]
      };

      const report = new Report([mockMapper], mockDate, [1]);
      const jsonReport = report.generateJsonReport();

      expect(jsonReport.mappers[0].maps[0].lastChecked).toBe(mockDate);
      expect(jsonReport.mappers[0].maps[0].totalPlaysWhenLastChecked).toBe(100);
      expect(jsonReport.mappers[0].maps[0].leaderboards[0].playCountWhenLastChecked).toBe(100);
    });
  });

  describe('sortMapDifficulties', () => {
    it('should sort difficulties in correct order', () => {
      const mockMap: Map = {
        id: 'map1',
        name: 'Test Map',
        mapperId: 1,
        mapperName: 'TestMapper',
        lastChecked: 0,
        uploadDate: '2024-01-01',
        upvotes: 0,
        downvotes: 0,
        leaderboards: [
          { leaderboardId: 'lb1', mapId: 'map1', difficultyName: 'Normal', modeName: 'Standard', playCount: 0, recentPlays: [] },
          { leaderboardId: 'lb2', mapId: 'map1', difficultyName: 'ExpertPlus', modeName: 'Standard', playCount: 0, recentPlays: [] },
          { leaderboardId: 'lb3', mapId: 'map1', difficultyName: 'Hard', modeName: 'Standard', playCount: 0, recentPlays: [] }
        ]
      };

      const report = new Report([{ mapperId: 1, mapperName: 'TestMapper', maps: [mockMap] }], mockDate, [1]);
      report.sortMapDifficulties();

      const difficulties = report.mappers[0].maps[0].leaderboards.map(lb => lb.difficultyName);
      expect(difficulties).toEqual(['ExpertPlus', 'Hard', 'Normal']);
    });
  });

  describe('getLastReportFile', () => {
    it('should load and parse last report file', async () => {
      const mockFileContent = JSON.stringify({
        mappers: [],
        generatedDate: mockDate,
        mapperIdsToTrack: [1]
      });

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockFileContent);

      const report = await Report.getLastReportFile('test.json');

      expect(report).toBeDefined();
      expect(report?.generatedDate).toBe(mockDate);
      expect(report?.mapperIdsToTrack).toEqual([1]);
    });

    it('should handle missing report file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const report = await Report.getLastReportFile('test.json');

      expect(report).toBeUndefined();
    });
  });

  describe('assembleMappersData', () => {
    it('should assemble mapper data from multiple sources', async () => {
      const mockGetMapsFromBeatSaver = jest.fn().mockResolvedValue([{
        id: 'map1',
        name: 'Test Map',
        mapperId: 1,
        mapperName: 'TestMapper',
        upvotes: 10,
        downvotes: 2,
        uploadDate: '2024-01-01'
      }]);

      const mockGetBeatLeaderLeaderboards = jest.fn().mockResolvedValue([{
        id: 'map1',
        name: 'Test Map',
        mapperId: 1,
        mapperName: 'TestMapper',
        leaderboards: [{
          leaderboardId: 'lb1',
          difficultyName: 'Expert',
          modeName: 'Standard',
          plays: 100
        }]
      }]);

      const mockGetLeaderboardData = jest.fn().mockResolvedValue({
        leaderboardId: 'lb1',
        mapId: 'map1',
        difficultyName: 'Expert',
        modeName: 'Standard',
        playCount: 100,
        recentPlays: []
      });

      const mockRemoveNonHex = jest.fn(id => id);

      const result = await Report.assembleMappersData(
        [1],
        [],
        mockGetMapsFromBeatSaver,
        mockGetBeatLeaderLeaderboards,
        mockRemoveNonHex,
        mockGetLeaderboardData
      );

      expect(result).toHaveLength(1);
      expect(result[0].mapperId).toBe(1);
      expect(result[0].maps).toHaveLength(1);
      expect(result[0].maps[0].leaderboards).toHaveLength(1);
    });
  });
});
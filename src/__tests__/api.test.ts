import { getMapsFromBeatSaver, getBeatLeaderLeaderboards, getLeaderboardData } from '../utils/api';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMapsFromBeatSaver', () => {
    it('should fetch and transform maps from BeatSaver', async () => {
      const mockResponse = {
        data: {
          docs: [{
            id: 'abc123',
            name: 'Test Map',
            uploader: { id: 1, name: 'TestMapper' },
            collaborators: [{ id: 2, name: 'Collaborator' }],
            stats: { upvotes: 10, downvotes: 2, score: 0.8 },
            versions: [{ coverURL: 'test.jpg' }],
            uploaded: '2023-01-01'
          }]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getMapsFromBeatSaver(2);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/maps/collaborations/2'));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('abc123');
      expect(result[0].mapperName).toBe('Collaborator');
      expect(result[0].bsScore).toBe(80); // Score is multiplied by 100 in the API
    });
  });

  describe('getBeatLeaderLeaderboards', () => {
    it('should fetch and transform maps from BeatLeader', async () => {
      const mockResponse = {
        data: {
          data: [{
            id: 'abc123',
            name: 'Test Map',
            mapperId: 1,
            mapper: 'TestMapper',
            difficulties: [{
              leaderboardId: 'lb1',
              difficultyName: 'Expert',
              modeName: 'Standard',
              plays: 100
            }]
          }]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getBeatLeaderLeaderboards(1);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/maps?mappers=1'));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('abc123');
      expect(result[0].leaderboards[0].difficultyName).toBe('Expert');
    });
  });

  describe('getLeaderboardData', () => {
    it('should fetch and transform leaderboard data', async () => {
      const mockResponse = {
        data: {
          id: 'lb1',
          song: { id: 'map1' },
          difficulty: { difficultyName: 'Expert', modeName: 'Standard' },
          plays: 100,
          scores: [{
            player: { name: 'Player1', pp: 1000 },
            accuracy: 0.95,
            modifiers: 'NA',
            timepost: 1234567890,
            id: 'score1',
            missedNotes: 1,
            badCuts: 0,
            bombCuts: 0,
            wallsHit: 0
          }]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getLeaderboardData('lb1');
      
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/leaderboard/lb1'));
      expect(result.leaderboardId).toBe('lb1');
      expect(result.playCount).toBe(100);
      expect(result.recentPlays).toHaveLength(1);
      expect(result.recentPlays[0].playerName).toBe('Player1');
      expect(result.recentPlays[0].totalMistakes).toBe(1);
    });
  });
});
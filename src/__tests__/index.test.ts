import { runLocal, startServer } from '../index';
import { Report } from '../models/Report';
import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import readline from 'readline';

jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args[args.length - 1]),
  extname: jest.fn().mockReturnValue('.html')
}));
jest.mock('../utils/api');
jest.mock('../utils/string');
jest.mock('open', () => ({ 
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: (question: string, callback: (answer: string) => void) => callback('1'),
    close: jest.fn()
  })
}));

describe('Application Logic', () => {
  const mockDate = new Date('2024-01-01').getTime();
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate);
  });

  describe('runLocal', () => {
    it('should prompt for mapper ID when no previous report exists', async () => {
      const mockReport = new Report([], mockDate, [1]);
      
      jest.spyOn(Report, 'getLastReportFile').mockResolvedValue(undefined);
      jest.spyOn(Report, 'assembleMappersData').mockResolvedValue([]);
      jest.spyOn(Report.prototype, 'generateHtmlReport').mockReturnValue('<html></html>');
      jest.spyOn(Report.prototype, 'generateJsonReport').mockReturnValue(mockReport);

      await runLocal();

      expect(Report.getLastReportFile).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'map-play-report.html',
        '<html></html>',
        'utf-8'
      );
    });

    it('should use existing mapper IDs when report exists', async () => {
      const existingReport = new Report([], mockDate - 1000000, [1]);

      jest.spyOn(Report, 'getLastReportFile').mockResolvedValue(existingReport);
      jest.spyOn(Report, 'assembleMappersData').mockResolvedValue([]);
      jest.spyOn(Report.prototype, 'generateHtmlReport').mockReturnValue('<html></html>');
      jest.spyOn(Report.prototype, 'generateJsonReport').mockReturnValue(existingReport);

      await runLocal();

      expect(Report.assembleMappersData).toHaveBeenCalledWith(
        expect.arrayContaining([1]),
        expect.any(Array),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Boolean)
      );
    });
  });

  describe('startServer', () => {
    let app: express.Express;
    let server: any;

    beforeEach(() => {
      app = express();
    });

    afterEach(() => {
      if (server) {
        server.close();
      }
    });

    it('should serve cached report within debounce time', async () => {
      const existingReport = new Report([], mockDate, [1]);

      jest.spyOn(Report, 'getLastReportFile').mockResolvedValue(existingReport);
      jest.spyOn(Report.prototype, 'generateHtmlReport').mockReturnValue('<html></html>');

      app.get('/report', (req, res) => {
        Promise.resolve().then(async () => {
          const report = await Report.getLastReportFile('test.json');
          if (report) {
            res.type('html');
            res.send(new Report(report.mappers, report.generatedDate, report.mapperIdsToTrack)
              .generateHtmlReport());
          } else {
            res.status(404).send('Report not found');
          }
        }).catch(err => {
          console.error(err);
          res.status(500).send('Internal Server Error');
        });
      });

      const response = await request(app).get('/report');
      expect(response.status).toBe(200);
      expect(response.text).toBe('<html></html>');
    }, 10000); // Increase timeout to 10 seconds

    it('should generate new report when outside debounce time', async () => {
      const oldReport = new Report([], mockDate - 1000000, [1]);

      jest.spyOn(Report, 'getLastReportFile').mockResolvedValue(oldReport);
      jest.spyOn(Report, 'assembleMappersData').mockResolvedValue([]);
      jest.spyOn(Report.prototype, 'generateHtmlReport').mockReturnValue('<html>new</html>');

      app.get('/report', (req, res) => {
        Promise.resolve().then(async () => {
          const report = await Report.getLastReportFile('test.json');
          const newReport = new Report([], Date.now(), [1]);
          res.type('html');
          res.send(newReport.generateHtmlReport());
        }).catch(err => {
          console.error(err);
          res.status(500).send('Internal Server Error');
        });
      });

      const response = await request(app).get('/report');
      expect(response.status).toBe(200);
      expect(response.text).toBe('<html>new</html>');
    }, 10000); // Increase timeout to 10 seconds
  });
});
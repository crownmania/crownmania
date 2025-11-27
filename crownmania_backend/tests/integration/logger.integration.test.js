import fs from 'fs';
import path from 'path';
import logger from '../../src/config/logger.js';

describe('Logger Integration Tests', () => {
  const logsDir = path.join(process.cwd(), 'logs');
  const testLogFile = path.join(logsDir, 'test.log');

  beforeAll(() => {
    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }
  });

  afterEach(() => {
    // Clean up test log files
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  describe('Log File Rotation', () => {
    it('should create new log file when size limit is reached', async () => {
      const largeMessage = 'x'.repeat(1024 * 1024); // 1MB message
      
      // Write enough logs to trigger rotation
      for (let i = 0; i < 11; i++) {
        logger.info(largeMessage);
      }

      const logFiles = fs.readdirSync(logsDir);
      const rotatedFiles = logFiles.filter(f => f.includes('combined') && f.endsWith('.log'));
      
      expect(rotatedFiles.length).toBeGreaterThan(1);
    });
  });

  describe('Sensitive Data Filtering', () => {
    it('should redact sensitive information', () => {
      const sensitiveData = {
        user: 'test',
        password: 'secret123',
        creditCard: '4111-1111-1111-1111',
        email: 'test@example.com',
        message: 'Regular message'
      };

      logger.info('Test message with sensitive data', sensitiveData);

      const logContent = fs.readFileSync(path.join(logsDir, 'combined.log'), 'utf8');
      
      expect(logContent).not.toContain('secret123');
      expect(logContent).not.toContain('4111-1111-1111-1111');
      expect(logContent).not.toContain('test@example.com');
      expect(logContent).toContain('[REDACTED]');
      expect(logContent).toContain('Regular message');
    });
  });

  describe('Log Compression', () => {
    it('should compress rotated log files', async () => {
      const largeMessage = 'x'.repeat(1024 * 1024); // 1MB message
      
      // Write enough logs to trigger rotation and compression
      for (let i = 0; i < 12; i++) {
        logger.info(largeMessage);
      }

      // Wait for compression to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const logFiles = fs.readdirSync(logsDir);
      const compressedFiles = logFiles.filter(f => f.endsWith('.gz'));
      
      expect(compressedFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Log Cleanup', () => {
    it('should delete old log files', async () => {
      // Create an old log file
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 15); // 15 days old
      
      const oldLogFile = path.join(logsDir, 'old.log');
      fs.writeFileSync(oldLogFile, 'old log content');
      
      // Set file's modified time to 15 days ago
      fs.utimesSync(oldLogFile, oldDate, oldDate);

      // Trigger cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(fs.existsSync(oldLogFile)).toBe(false);
    });
  });

  describe('Request Context Logging', () => {
    it('should include request context in logs', () => {
      const requestContext = {
        requestId: '123',
        userId: 'user123',
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      };

      logger.info('API request', { requestContext });

      const logContent = fs.readFileSync(path.join(logsDir, 'combined.log'), 'utf8');
      
      expect(logContent).toContain('requestId');
      expect(logContent).toContain('123');
      expect(logContent).toContain('127.0.0.1');
      expect(logContent).not.toContain('user123'); // Should be redacted
    });
  });
});

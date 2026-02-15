/**
 * Unit tests for 2FA Service
 * Uses jest.unstable_mockModule for proper ESM mocking
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mock functions
const mockAdd = jest.fn().mockResolvedValue({ id: 'test-code-id' });
const mockUpdate = jest.fn().mockResolvedValue({});
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ update: mockUpdate }));
const mockCollection = jest.fn(() => ({
    add: mockAdd,
    doc: mockDoc,
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn(() => ({
        get: mockGet,
    })),
    get: mockGet,
}));

// Must use unstable_mockModule for ESM
jest.unstable_mockModule('../../src/config/firebase.js', () => ({
    db: { collection: mockCollection },
}));

jest.unstable_mockModule('../../src/config/email.js', () => ({
    sgMail: { send: jest.fn().mockResolvedValue([{ statusCode: 202 }]) },
    EMAIL_CONFIG: { from: { email: 'test@test.com', name: 'Test' } },
}));

jest.unstable_mockModule('../../src/services/smsService.js', () => ({
    default: {
        sendVerificationCode: jest.fn().mockResolvedValue({ success: true }),
    },
    smsService: {
        sendVerificationCode: jest.fn().mockResolvedValue({ success: true }),
    },
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// Dynamic import AFTER mocks are set up
const { default: twoFactorService } = await import('../../src/services/twoFactorService.js');

describe('Two-Factor Authentication Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockReset();
        mockAdd.mockClear().mockResolvedValue({ id: 'test-code-id' });
        mockUpdate.mockClear().mockResolvedValue({});
    });

    describe('generateCode', () => {
        it('should generate a 6-digit string', () => {
            const code = twoFactorService.generateCode();
            expect(code).toMatch(/^\d{6}$/);
        });

        it('should generate unique codes', () => {
            const codes = new Set();
            for (let i = 0; i < 100; i++) {
                codes.add(twoFactorService.generateCode());
            }
            expect(codes.size).toBeGreaterThan(90);
        });

        it('should respect custom length of 4', () => {
            const code = twoFactorService.generateCode(4);
            expect(code).toMatch(/^\d{4}$/);
        });

        it('should respect custom length of 8', () => {
            const code = twoFactorService.generateCode(8);
            expect(code).toMatch(/^\d{8}$/);
        });
    });

    describe('sendEmailCode', () => {
        it('should store code and send email', async () => {
            const result = await twoFactorService.sendEmailCode('0xabc123', 'test@example.com');
            expect(result.sent).toBe(true);
            expect(result.expiresAt).toBeInstanceOf(Date);
            expect(mockAdd).toHaveBeenCalled();
        });

        it('should store code with correct structure', async () => {
            await twoFactorService.sendEmailCode('0xabc123', 'test@example.com');

            const addCall = mockAdd.mock.calls[0][0];
            expect(addCall).toHaveProperty('userId', '0xabc123');
            expect(addCall).toHaveProperty('type', 'email');
            expect(addCall).toHaveProperty('code');
            expect(addCall.code).toMatch(/^\d{6}$/);
            expect(addCall).toHaveProperty('verified', false);
            expect(addCall).toHaveProperty('attempts', 0);
        });
    });

    describe('sendPhoneCode', () => {
        it('should store code and send SMS', async () => {
            const result = await twoFactorService.sendPhoneCode('0xabc123', '+12025551234');
            expect(result.sent).toBe(true);
            expect(result.expiresAt).toBeInstanceOf(Date);
            expect(mockAdd).toHaveBeenCalled();
        });

        it('should store code with sms type', async () => {
            await twoFactorService.sendPhoneCode('0xabc123', '+12025551234');

            const addCall = mockAdd.mock.calls[0][0];
            expect(addCall).toHaveProperty('type', 'sms');
            expect(addCall).toHaveProperty('userId', '0xabc123');
            expect(addCall.code).toMatch(/^\d{6}$/);
        });
    });

    describe('verifyCode', () => {
        it('should throw when no code found', async () => {
            mockGet.mockResolvedValueOnce({ empty: true, docs: [] });
            await expect(
                twoFactorService.verifyCode('0xabc', 'email', '123456')
            ).rejects.toThrow('No pending verification code found');
        });

        it('should throw when code expired', async () => {
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    id: 'code-1',
                    data: () => ({
                        code: '123456',
                        expiresAt: { toDate: () => new Date(Date.now() - 60000) },
                        attempts: 0,
                    }),
                }],
            });
            await expect(
                twoFactorService.verifyCode('0xabc', 'email', '123456')
            ).rejects.toThrow('expired');
        });

        it('should throw when too many attempts', async () => {
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    id: 'code-1',
                    data: () => ({
                        code: '123456',
                        expiresAt: { toDate: () => new Date(Date.now() + 300000) },
                        attempts: 5,
                    }),
                }],
            });
            await expect(
                twoFactorService.verifyCode('0xabc', 'email', '123456')
            ).rejects.toThrow('Too many failed attempts');
        });

        it('should throw on wrong code and increment attempts', async () => {
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    id: 'code-1',
                    data: () => ({
                        code: '123456',
                        expiresAt: { toDate: () => new Date(Date.now() + 300000) },
                        attempts: 0,
                    }),
                }],
            });
            await expect(
                twoFactorService.verifyCode('0xabc', 'email', '000000')
            ).rejects.toThrow('Invalid verification code');
        });

        it('should verify correct code successfully', async () => {
            // verificationCodes query
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    id: 'code-1',
                    data: () => ({
                        code: '123456',
                        expiresAt: { toDate: () => new Date(Date.now() + 300000) },
                        attempts: 0,
                    }),
                }],
            });
            // users query for updating verified flag
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'user-doc-1' }],
            });

            const result = await twoFactorService.verifyCode('0xabc', 'email', '123456');
            expect(result).toBe(true);
        });
    });
});

/**
 * Unit tests for SMS Service (Twilio)
 * Uses jest.unstable_mockModule for proper ESM mocking
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock logger BEFORE importing smsService
jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// Mock module (createRequire) to provide a fake twilio
const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM_test_123' });
jest.unstable_mockModule('module', () => ({
    createRequire: jest.fn(() => {
        return (mod) => {
            if (mod === 'twilio') {
                return () => ({
                    messages: { create: mockCreate },
                });
            }
            throw new Error(`Unexpected require: ${mod}`);
        };
    }),
}));

// Dynamic import AFTER mocks
const { smsService } = await import('../../src/services/smsService.js');

describe('SMS Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreate.mockClear().mockResolvedValue({ sid: 'SM_test_123' });

        process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
        process.env.TWILIO_AUTH_TOKEN = 'test_token';
        process.env.TWILIO_PHONE_NUMBER = '+10000000000';

        // Reset client so it re-initializes
        smsService.client = null;
    });

    describe('isValidPhone', () => {
        it('should accept valid US E.164 number', () => {
            expect(smsService.isValidPhone('+12025551234')).toBe(true);
        });

        it('should accept valid UK E.164 number', () => {
            expect(smsService.isValidPhone('+442071234567')).toBe(true);
        });

        it('should reject short numbers', () => {
            expect(smsService.isValidPhone('+1234')).toBe(false);
        });

        it('should reject non-E.164 format', () => {
            expect(smsService.isValidPhone('12345678901')).toBe(false);
        });

        it('should reject empty string', () => {
            expect(smsService.isValidPhone('')).toBe(false);
        });

        it('should reject alphabetic input', () => {
            expect(smsService.isValidPhone('not-a-number')).toBe(false);
        });

        it('should reject numbers starting with +0', () => {
            expect(smsService.isValidPhone('+0123456789')).toBe(false);
        });
    });

    describe('checkRateLimit', () => {
        it('should allow first request', () => {
            const result = smsService.checkRateLimit('+19998887777');
            expect(result.allowed).toBe(true);
        });
    });

    describe('sendVerificationCode', () => {
        it('should reject invalid phone format', async () => {
            await expect(
                smsService.sendVerificationCode('invalid', '123456')
            ).rejects.toThrow('Invalid phone number format');
        });

        it('should succeed with valid phone (dev mode fallback)', async () => {
            // Clear Twilio creds to trigger dev mode fallback
            delete process.env.TWILIO_ACCOUNT_SID;
            delete process.env.TWILIO_AUTH_TOKEN;
            smsService.client = null;

            const result = await smsService.sendVerificationCode('+12025551234', '123456');
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('dev-mode');
        });
    });
});

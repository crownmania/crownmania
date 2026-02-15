/**
 * Unit tests for Email Service
 * Uses jest.unstable_mockModule for proper ESM mocking
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mock SendGrid + email config BEFORE importing emailService ──
const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);

jest.unstable_mockModule('../../src/config/email.js', () => ({
    sgMail: {
        send: mockSend,
        setApiKey: jest.fn(),
    },
    EMAIL_CONFIG: {
        from: {
            email: 'test@crownmania.com',
            name: 'Crownmania Test',
        },
    },
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendClaimConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
    sendConnectionAttemptEmail: jest.fn().mockResolvedValue(undefined),
    sendScanAttemptEmail: jest.fn().mockResolvedValue(undefined),
    sendCodeEntryEmail: jest.fn().mockResolvedValue(undefined),
    sendClaimAttemptEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// Dynamic import AFTER mocks are registered
const emailService = await import('../../src/services/emailService.js');
const { sgMail: mockSgMail } = await import('../../src/config/email.js');

describe('Email Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSend.mockClear().mockResolvedValue([{ statusCode: 202 }]);
    });

    describe('sendOrderReceiptEmail', () => {
        it('should send order receipt email with correct parameters', async () => {
            const orderData = {
                sessionId: 'cs_test_123456789',
                amount: 29900,
                currency: 'usd',
                paymentStatus: 'paid',
            };

            await emailService.sendOrderReceiptEmail('customer@test.com', orderData);

            expect(mockSgMail.send).toHaveBeenCalledTimes(1);
            expect(mockSgMail.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'customer@test.com',
                    subject: expect.stringContaining('Order Confirmation'),
                })
            );
        });

        it('should not throw on email failure', async () => {
            mockSend.mockRejectedValueOnce(new Error('SendGrid error'));

            await expect(
                emailService.sendOrderReceiptEmail('customer@test.com', { sessionId: 'test' })
            ).resolves.not.toThrow();
        });
    });

    describe('sendOrderAdminAlert', () => {
        it('should send admin alert for new order', async () => {
            const orderData = {
                sessionId: 'cs_test_123456789',
                customerEmail: 'customer@example.com',
                amount: 29900,
                currency: 'usd',
                timestamp: '2026-01-12T20:00:00Z',
            };

            await emailService.sendOrderAdminAlert(orderData);

            expect(mockSgMail.send).toHaveBeenCalledTimes(1);
            expect(mockSgMail.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('New Order'),
                })
            );
        });
    });

    describe('sendPaymentFailedAlert', () => {
        it('should send admin alert for failed payment', async () => {
            const paymentData = {
                paymentIntentId: 'pi_test_123456789',
                error: 'Card declined',
                customerEmail: 'customer@example.com',
                amount: 29900,
                currency: 'usd',
                timestamp: '2026-01-12T20:00:00Z',
            };

            await emailService.sendPaymentFailedAlert(paymentData);

            expect(mockSgMail.send).toHaveBeenCalledTimes(1);
            expect(mockSgMail.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('Payment Failed'),
                })
            );
        });

        it('should handle missing error message gracefully', async () => {
            const paymentData = {
                paymentIntentId: 'pi_test_123456789',
            };

            await expect(
                emailService.sendPaymentFailedAlert(paymentData)
            ).resolves.not.toThrow();
        });
    });

    describe('re-exports', () => {
        it('should export sendVerificationEmail', () => {
            expect(emailService.sendVerificationEmail).toBeDefined();
        });

        it('should export sendClaimConfirmationEmail', () => {
            expect(emailService.sendClaimConfirmationEmail).toBeDefined();
        });

        it('should export notification functions', () => {
            expect(emailService.sendConnectionAttemptEmail).toBeDefined();
            expect(emailService.sendScanAttemptEmail).toBeDefined();
            expect(emailService.sendCodeEntryEmail).toBeDefined();
            expect(emailService.sendClaimAttemptEmail).toBeDefined();
        });
    });
});

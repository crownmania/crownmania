import { jest } from '@jest/globals';

// Mock the SendGrid module
jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([{ statusCode: 202 }])
}));

// Mock the notification service
jest.mock('../notificationService.js', () => ({
    sendConnectionAttemptEmail: jest.fn().mockResolvedValue(undefined),
    sendScanAttemptEmail: jest.fn().mockResolvedValue(undefined),
    sendCodeEntryEmail: jest.fn().mockResolvedValue(undefined),
    sendClaimAttemptEmail: jest.fn().mockResolvedValue(undefined)
}));

// Mock the email config
jest.mock('../../config/email.js', () => ({
    sgMail: {
        send: jest.fn().mockResolvedValue([{ statusCode: 202 }])
    },
    EMAIL_CONFIG: {
        from: {
            email: 'test@crownmania.com',
            name: 'Crownmania Test'
        }
    },
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendClaimConfirmationEmail: jest.fn().mockResolvedValue(undefined)
}));

describe('Email Service', () => {
    let emailService;
    let mockSgMail;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Import the module after mocks are set up
        emailService = await import('../emailService.js');
        mockSgMail = (await import('../../config/email.js')).sgMail;
    });

    describe('sendOrderReceiptEmail', () => {
        it('should send order receipt email with correct parameters', async () => {
            const orderData = {
                sessionId: 'cs_test_123456789',
                amount: 29900,
                currency: 'usd',
                paymentStatus: 'paid'
            };

            await emailService.sendOrderReceiptEmail('customer@test.com', orderData);

            expect(mockSgMail.send).toHaveBeenCalledTimes(1);
            expect(mockSgMail.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'customer@test.com',
                    subject: expect.stringContaining('Order Confirmation')
                })
            );
        });

        it('should not throw on email failure', async () => {
            mockSgMail.send.mockRejectedValueOnce(new Error('SendGrid error'));

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
                timestamp: '2026-01-12T20:00:00Z'
            };

            await emailService.sendOrderAdminAlert(orderData);

            expect(mockSgMail.send).toHaveBeenCalledTimes(1);
            expect(mockSgMail.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('New Order')
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
                timestamp: '2026-01-12T20:00:00Z'
            };

            await emailService.sendPaymentFailedAlert(paymentData);

            expect(mockSgMail.send).toHaveBeenCalledTimes(1);
            expect(mockSgMail.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('Payment Failed')
                })
            );
        });

        it('should handle missing error message gracefully', async () => {
            const paymentData = {
                paymentIntentId: 'pi_test_123456789'
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

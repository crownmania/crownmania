import { sgMail, EMAIL_CONFIG, sendVerificationEmail, sendClaimConfirmationEmail } from '../config/email.js';
import {
    sendConnectionAttemptEmail,
    sendScanAttemptEmail,
    sendCodeEntryEmail,
    sendClaimAttemptEmail
} from './notificationService.js';

// Admin email for receiving notifications
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'crown@crownmania.com';

/**
 * Send order receipt email to customer after successful checkout
 * @param {string} toEmail - Customer email address
 * @param {object} orderData - Order details
 */
export const sendOrderReceiptEmail = async (toEmail, orderData) => {
    const { sessionId, amount, currency, paymentStatus, items = [] } = orderData;

    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency?.toUpperCase() || 'USD'
    }).format((amount || 0) / 100);

    const subject = '🛍️ Your Crownmania Order Confirmation';
    const plainText = `Thank you for your Crownmania order!

Order ID: ${sessionId}
Total: ${formattedAmount}
Status: ${paymentStatus || 'Paid'}

Your collectible is on its way! Once it arrives, scan the QR code on your product to claim your digital twin NFT.

Questions? Reply to this email or visit crownmania.com

Thank you for being part of the Crownmania community!
`;

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a1628 0%, #1a2f4a 100%); padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00ff88; font-size: 28px; margin: 0;">🛍️ Order Confirmed!</h1>
        <p style="color: rgba(255,255,255,0.7); margin-top: 8px;">Thank you for your purchase</p>
      </div>
      
      <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">ORDER ID</td>
            <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: white; font-size: 14px; text-align: right; font-family: monospace;">${sessionId?.slice(0, 20)}...</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">TOTAL</td>
            <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #00ff88; font-size: 18px; text-align: right; font-weight: bold;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: rgba(255,255,255,0.6); font-size: 13px;">STATUS</td>
            <td style="padding: 12px 0; color: #00ff88; font-size: 14px; text-align: right;">✅ ${paymentStatus || 'Paid'}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: rgba(0, 200, 255, 0.1); border: 1px solid rgba(0, 200, 255, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #00c8ff; margin: 0 0 12px 0; font-size: 14px;">📱 WHAT'S NEXT?</h3>
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; line-height: 1.6;">
          Your collectible will ship soon! Once it arrives, <strong style="color: #00ff88;">scan the QR code</strong> on your product to claim your exclusive digital twin NFT.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://crownmania.com" style="display: inline-block; background: linear-gradient(135deg, #00ff88, #00c8ff); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Visit Crownmania →</a>
      </div>
      
      <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin-top: 32px;">
        Questions? Reply to this email or visit crownmania.com<br>
        © 2025 Crownmania. All rights reserved.
      </p>
    </div>
  `;

    try {
        await sgMail.send({
            to: toEmail,
            from: EMAIL_CONFIG.from,
            subject,
            text: plainText,
            html
        });
        console.log(`Order receipt email sent to ${toEmail}`);
    } catch (error) {
        console.error('Error sending order receipt email:', error);
        // Don't throw - email failure shouldn't block order flow
    }
};

/**
 * Send admin notification for new order
 * @param {object} orderData - Order details for admin
 */
export const sendOrderAdminAlert = async (orderData) => {
    const { sessionId, customerEmail, amount, currency, timestamp } = orderData;

    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency?.toUpperCase() || 'USD'
    }).format((amount || 0) / 100);

    const subject = `💰 New Order: ${formattedAmount}`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a1628; color: white;">
      <h2 style="color: #00ff88;">💰 New Order Received</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Session ID</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; font-family: monospace;">${sessionId}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Customer</td>
          <td style="padding: 10px; border-bottom: 1px solid #333;">${customerEmail || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Amount</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #00ff88; font-weight: bold;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 10px; color: #aaa;">Time</td>
          <td style="padding: 10px;">${timestamp || new Date().toISOString()}</td>
        </tr>
      </table>
    </div>
  `;

    try {
        await sgMail.send({
            to: ADMIN_EMAIL,
            from: EMAIL_CONFIG.from,
            subject,
            html
        });
        console.log('Order admin alert sent');
    } catch (error) {
        console.error('Failed to send order admin alert:', error.message);
    }
};

/**
 * Send admin notification for failed payment
 * @param {object} paymentData - Payment failure details
 */
export const sendPaymentFailedAlert = async (paymentData) => {
    const { paymentIntentId, error, customerEmail, amount, currency, timestamp } = paymentData;

    const formattedAmount = amount ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency?.toUpperCase() || 'USD'
    }).format(amount / 100) : 'Unknown';

    const subject = `⚠️ Payment Failed: ${paymentIntentId?.slice(0, 20)}...`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a1628; color: white;">
      <h2 style="color: #ff4444;">⚠️ Payment Failed</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Payment Intent</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; font-family: monospace;">${paymentIntentId}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Customer</td>
          <td style="padding: 10px; border-bottom: 1px solid #333;">${customerEmail || 'Not available'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Amount</td>
          <td style="padding: 10px; border-bottom: 1px solid #333;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Error</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #ff4444;">${error || 'Unknown error'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; color: #aaa;">Time</td>
          <td style="padding: 10px;">${timestamp || new Date().toISOString()}</td>
        </tr>
      </table>
    </div>
  `;

    try {
        await sgMail.send({
            to: ADMIN_EMAIL,
            from: EMAIL_CONFIG.from,
            subject,
            html
        });
        console.log('Payment failed alert sent');
    } catch (error) {
        console.error('Failed to send payment failed alert:', error.message);
    }
};

// Re-export all email functions for centralized access
export {
    // From email.js
    sendVerificationEmail,
    sendClaimConfirmationEmail,
    // From notificationService.js  
    sendConnectionAttemptEmail,
    sendScanAttemptEmail,
    sendCodeEntryEmail,
    sendClaimAttemptEmail
};

export default {
    // Order emails
    sendOrderReceiptEmail,
    sendOrderAdminAlert,
    sendPaymentFailedAlert,
    // Claim/verification emails
    sendVerificationEmail,
    sendClaimConfirmationEmail,
    // Admin notifications
    sendConnectionAttemptEmail,
    sendScanAttemptEmail,
    sendCodeEntryEmail,
    sendClaimAttemptEmail
};

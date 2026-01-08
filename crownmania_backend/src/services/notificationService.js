import { sgMail, EMAIL_CONFIG } from '../config/email.js';

// Admin email for receiving notifications
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'crown@crownmania.com';

/**
 * Send notification email when someone attempts to connect their wallet
 * @param {object} userInfo - Connection attempt details
 */
export const sendConnectionAttemptEmail = async (userInfo) => {
  const { walletAddress, timestamp, userAgent, ip } = userInfo;

  const subject = '🔗 New Wallet Connection Attempt';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a1628; color: white;">
      <h2 style="color: #00c8ff;">Wallet Connection Attempt</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Wallet</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; font-family: monospace;">${walletAddress || 'Not available'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Time</td>
          <td style="padding: 10px; border-bottom: 1px solid #333;">${timestamp || new Date().toISOString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">IP Address</td>
          <td style="padding: 10px; border-bottom: 1px solid #333;">${ip || 'Unknown'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; color: #aaa;">User Agent</td>
          <td style="padding: 10px; font-size: 12px;">${userAgent || 'Unknown'}</td>
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
    console.log('Connection attempt notification sent');
  } catch (error) {
    console.error('Failed to send connection notification:', error.message);
  }
};

/**
 * Send notification email when someone scans a QR code
 * @param {string} claimCodeId - The claim code being scanned
 * @param {string} method - How it was scanned (qr_scan, manual_entry)
 * @param {object} details - Additional details
 */
export const sendScanAttemptEmail = async (claimCodeId, method, details = {}) => {
  const { ip, userAgent, verified, productName } = details;

  const subject = `📸 QR Code ${method === 'qr_scan' ? 'Scanned' : 'Entered'}: ${claimCodeId?.substring(0, 8)}...`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a1628; color: white;">
      <h2 style="color: #ffd700;">Code Verification Attempt</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Claim Code</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; font-family: monospace;">${claimCodeId}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Method</td>
          <td style="padding: 10px; border-bottom: 1px solid #333;">${method === 'qr_scan' ? '📱 QR Scan' : '⌨️ Manual Entry'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Verified</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: ${verified ? '#00ff88' : '#ff4444'};">${verified ? '✅ Valid' : '❌ Invalid'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Product</td>
          <td style="padding: 10px; border-bottom: 1px solid #333;">${productName || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Time</td>
          <td style="padding: 10px; border-bottom: 1px solid #333;">${new Date().toISOString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px; color: #aaa;">IP Address</td>
          <td style="padding: 10px;">${ip || 'Unknown'}</td>
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
    console.log('Scan attempt notification sent');
  } catch (error) {
    console.error('Failed to send scan notification:', error.message);
  }
};

/**
 * Send notification email when someone enters a claim code
 * @param {string} claimCodeId - The claim code entered
 * @param {object} details - Additional details
 */
export const sendCodeEntryEmail = async (claimCodeId, details = {}) => {
  return sendScanAttemptEmail(claimCodeId, 'manual_entry', details);
};

/**
 * Send notification email when someone attempts to claim an NFT
 * @param {object} claimDetails - Claim attempt details
 */
export const sendClaimAttemptEmail = async (claimDetails) => {
  const { claimCodeId, walletAddress, success, edition, ip } = claimDetails;

  const subject = success
    ? `🎉 NFT Claimed Successfully: Edition #${edition}`
    : `⚠️ NFT Claim Attempt Failed`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #0a1628; color: white;">
      <h2 style="color: ${success ? '#00ff88' : '#ff4444'};">${success ? 'NFT Claimed!' : 'Claim Failed'}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Claim Code</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; font-family: monospace;">${claimCodeId}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Wallet</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; font-family: monospace;">${walletAddress}</td>
        </tr>
        ${success ? `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Edition</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #00c8ff; font-weight: bold;">#${edition} of 500</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #aaa;">Status</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: ${success ? '#00ff88' : '#ff4444'};">${success ? '✅ Success' : '❌ Failed'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; color: #aaa;">Time</td>
          <td style="padding: 10px;">${new Date().toISOString()}</td>
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
    console.log('Claim attempt notification sent');
  } catch (error) {
    console.error('Failed to send claim notification:', error.message);
  }
};

export default {
  sendConnectionAttemptEmail,
  sendScanAttemptEmail,
  sendCodeEntryEmail,
  sendClaimAttemptEmail
};

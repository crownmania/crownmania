import { sgMail, EMAIL_CONFIG } from '../config/email.js';
import logger from '../config/logger.js';

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
    logger.info('Connection attempt notification sent');
  } catch (error) {
    logger.error('Failed to send connection notification:', error.message);
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
    logger.info('Scan attempt notification sent');
  } catch (error) {
    logger.error('Failed to send scan notification:', error.message);
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
    logger.info('Claim attempt notification sent');
  } catch (error) {
    logger.error('Failed to send claim notification:', error.message);
  }
};

export { sendContentDropNotification };

export default {
  sendConnectionAttemptEmail,
  sendScanAttemptEmail,
  sendCodeEntryEmail,
  sendClaimAttemptEmail,
  sendContentDropNotification,
};

/**
 * Send immediate content-drop notification (email + SMS if enabled)
 * @param {object} drop      - { title, description, contentType }
 * @param {object} user      - Firestore user doc data
 * @param {object} prefs     - notificationPreferences doc data
 */
async function sendContentDropNotification(drop, user, prefs) {
  const tasks = [];

  // Email notification
  if (prefs.emailDrops && user.email) {
    const { encryptionService } = await import('../services/encryptionService.js');
    const email = encryptionService.decrypt(user.email);

    tasks.push(
      sgMail.send({
        to: email,
        from: EMAIL_CONFIG.from,
        subject: `🎁 New Drop: ${drop.title}`,
        html: `
          <div style="font-family:Arial,sans-serif;padding:24px;background:#0a1628;color:#fff;">
            <h2 style="color:#ffd700;">New Content Drop!</h2>
            <p><strong>${drop.title}</strong></p>
            <p style="color:#aaa;">${drop.description || ''}</p>
            <p style="margin-top:16px;">
              <a href="${process.env.FRONTEND_URL || 'https://crownmania.com'}/vault"
                 style="background:#ffd700;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Open Vault
              </a>
            </p>
          </div>`,
      }).catch(err => console.error('Content drop email failed:', err.message))
    );
  }

  // SMS notification
  if (prefs.smsDrops && user.phone && user.phoneVerified) {
    const smsService = (await import('../services/smsService.js')).default;
    const { encryptionService } = await import('../services/encryptionService.js');
    const phone = encryptionService.decrypt(user.phone);

    tasks.push(
      smsService.getClient()?.messages?.create({
        body: `CrownMania: New drop "${drop.title}" is available! Open your Vault to view.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      }).catch(err => console.error('Content drop SMS failed:', err.message))
    );
  }

  await Promise.allSettled(tasks);
}


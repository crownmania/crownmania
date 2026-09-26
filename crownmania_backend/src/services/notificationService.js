import { sgMail, EMAIL_CONFIG, sendBrandedAdminEmail, renderEmailShell, ctaButton, escapeHtml } from '../config/email.js';
import logger from '../config/logger.js';

// Claim codes / serials are bearer credentials — never email full values.
const maskClaimCode = (code) => {
  const s = String(code ?? '');
  return s.length > 8 ? `${s.substring(0, 8)}…` : s;
};

/**
 * Send notification email when someone attempts to connect their wallet
 * @param {object} userInfo - Connection attempt details
 */
export const sendConnectionAttemptEmail = async (userInfo) => {
  const { walletAddress, timestamp, userAgent, ip } = userInfo;

  try {
    await sendBrandedAdminEmail({
      subject: 'Wallet connection attempt',
      title: 'Wallet Connection Attempt',
      subtitle: 'Someone connected a wallet to the Vault',
      rows: {
        Wallet: walletAddress || 'Not available',
        Time: timestamp || new Date().toISOString(),
        IP: ip || 'Unknown',
        Device: userAgent || 'Unknown'
      }
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

  const wasScanned = method === 'qr_scan';

  try {
    await sendBrandedAdminEmail({
      subject: `Serial ${wasScanned ? 'scanned' : 'entered'}: ${String(claimCodeId ?? '').substring(0, 8)}…`,
      title: verified ? 'Valid Serial Checked' : 'Invalid Serial Attempt',
      subtitle: wasScanned ? 'Via QR scan' : 'Via manual entry',
      rows: {
        'Claim code': maskClaimCode(claimCodeId),
        Method: wasScanned ? 'QR scan' : 'Manual entry',
        Result: verified ? 'Valid' : 'Invalid',
        Product: productName || 'N/A',
        Time: new Date().toISOString(),
        IP: ip || 'Unknown',
        Device: userAgent || 'Unknown'
      }
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
  const { claimCodeId, walletAddress, claimEmail, success, edition, ip } = claimDetails;

  try {
    await sendBrandedAdminEmail({
      subject: success
        ? `Collectible claimed — edition #${edition}`
        : 'Collectible claim failed',
      title: success ? 'Collectible Claimed' : 'Claim Failed',
      subtitle: success
        ? 'A customer claimed their digital collectible'
        : 'A claim attempt did not complete',
      rows: {
        'Claim code': maskClaimCode(claimCodeId),
        Wallet: walletAddress,
        ...(claimEmail ? { 'Claim email': claimEmail } : {}),
        ...(success && edition ? { Edition: `#${edition}` } : {}),
        Status: success ? 'Success' : 'Failed',
        Time: new Date().toISOString(),
        IP: ip || 'Unknown'
      }
    });
    logger.info('Claim attempt notification sent');
  } catch (error) {
    logger.error('Failed to send claim notification:', error.message);
  }
};

export { sendContentDropNotification, sendAdminSMS };

/**
 * Send SMS notification to admin phone number
 * @param {string} message - The SMS body text
 */
async function sendAdminSMS(message) {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) {
    logger.warn('[SMS] ADMIN_PHONE not configured – skipping admin SMS');
    return;
  }

  try {
    const smsService = (await import('../services/smsService.js')).default;
    const client = smsService.getClient();
    if (!client) {
      logger.warn('[SMS] Twilio client not available – skipping admin SMS');
      return;
    }
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: adminPhone,
    });
    logger.info('[SMS] Admin notification sent');
  } catch (error) {
    logger.error('[SMS] Failed to send admin notification:', error.message);
  }
}

export default {
  sendConnectionAttemptEmail,
  sendScanAttemptEmail,
  sendCodeEntryEmail,
  sendClaimAttemptEmail,
  sendContentDropNotification,
  sendAdminSMS,
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
        subject: `New Crownmania drop: ${drop.title}`,
        text: `New drop: ${drop.title}\n\n${drop.description || ''}\n\nOpen your Vault: ${process.env.FRONTEND_URL || 'https://crownmania.com'}/vault`,
        html: renderEmailShell({
          preheader: `New drop: ${drop.title}`,
          title: 'New Content Drop',
          subtitle: 'Exclusive to verified collectors',
          bodyHtml: `
            <p class="cm-w" style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:700; color:#B4BBC7; text-align:center;">${escapeHtml(drop.title)}</p>
            ${drop.description ? `<p class="cm-mut" style="margin:14px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:#99A2B0; text-align:center;">${escapeHtml(drop.description)}</p>` : ''}
            ${ctaButton(`${process.env.FRONTEND_URL || 'https://crownmania.com'}/vault`, 'Open The Vault')}`
        }),
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


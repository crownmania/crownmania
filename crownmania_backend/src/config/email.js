import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email templates
const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: 'd-xxxxxxxxxxxxx',
  SHIPPING_CONFIRMATION: 'd-xxxxxxxxxxxxx',
  TOKEN_CLAIM: 'd-xxxxxxxxxxxxx',
  WELCOME: 'd-xxxxxxxxxxxxx'
};

// Email sender configuration
const EMAIL_CONFIG = {
  from: {
    email: process.env.SENDGRID_FROM_EMAIL || 'noreply@crownmania.com',
    name: 'Crownmania'
  }
};

export { sgMail, EMAIL_TEMPLATES, EMAIL_CONFIG };

/**
 * Send the verification email containing a one-time token
 * @param {string} toEmail - Recipient email address
 * @param {string} token - One-time verification token
 * @param {string} serialNumber - Associated product serial number
 */
export const sendVerificationEmail = async (toEmail, token, serialNumber) => {
  const subject = 'Your Crownmania verification code';
  const plainText = `Your Crownmania verification code is:\n\n${token}\n\nSerial: ${serialNumber}\n\nThis code expires in 15 minutes. If you did not request this, you can ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Crownmania Verification</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 18px; font-weight: bold; letter-spacing: 0.08em;">${token}</p>
      <p>Serial: <strong>${serialNumber}</strong></p>
      <p>This code expires in <strong>15 minutes</strong>.</p>
      <p>If you did not request this code, please ignore this email.</p>
    </div>
  `;

  const msg = {
    to: toEmail,
    from: EMAIL_CONFIG.from,
    subject,
    text: plainText,
    html
  };

  await sgMail.send(msg);
};

/**
 * Send claim confirmation email after successful NFT claim
 * @param {string} toEmail - Recipient email address
 * @param {object} claimData - Claim details
 */
export const sendClaimConfirmationEmail = async (toEmail, claimData) => {
  const { productName, serialNumber, walletAddress, tokenId, claimDate, editionNumber } = claimData;

  const subject = `🎉 Your ${productName} NFT Has Been Claimed!`;
  const plainText = `Congratulations! Your Crownmania NFT has been successfully claimed.

Product: ${productName}
Edition: #${editionNumber || '1'} of 500
Serial Number: ${serialNumber}
Token ID: ${tokenId || 'Pending'}
Wallet: ${walletAddress}
Claimed: ${claimDate || new Date().toLocaleDateString()}

View your collectible in The Vault at https://crownmania.com

Thank you for being part of the Crownmania community!
`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a1628 0%, #1a2f4a 100%); padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00ff88; font-size: 28px; margin: 0;">🎉 NFT Claimed Successfully!</h1>
      </div>
      
      <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #00c8ff; margin: 0 0 16px 0; font-size: 20px;">${productName}</h2>
        <p style="color: #00ff88; font-size: 14px; margin: 0;">Lil Durk: Free The Voice Series</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">EDITION</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #00c8ff; font-size: 14px; text-align: right; font-family: monospace;">#${editionNumber || '1'} of 500</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">SERIAL NUMBER</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: white; font-size: 14px; text-align: right; font-family: monospace;">${serialNumber.slice(0, 8)}...${serialNumber.slice(-8)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">TOKEN ID</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: white; font-size: 14px; text-align: right; font-family: monospace;">${tokenId || 'NFT-' + (editionNumber || '001')}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">WALLET</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: white; font-size: 14px; text-align: right; font-family: monospace;">${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: rgba(255,255,255,0.6); font-size: 13px;">CLAIMED</td>
          <td style="padding: 12px 0; color: white; font-size: 14px; text-align: right;">${claimDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://crownmania.com" style="display: inline-block; background: linear-gradient(135deg, #00ff88, #00c8ff); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in The Vault →</a>
      </div>
      
      <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin-top: 32px;">
        This is a confirmation of your NFT claim on the Polygon blockchain.<br>
        © 2025 Crownmania. All rights reserved.
      </p>
    </div>
  `;

  const msg = {
    to: toEmail,
    from: EMAIL_CONFIG.from,
    subject,
    text: plainText,
    html
  };

  try {
    await sgMail.send(msg);
    console.log(`Claim confirmation email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending claim confirmation email:', error);
    // Don't throw - email failure shouldn't block the claim
  }
};

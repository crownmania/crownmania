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
    email: process.env.SENDGRID_FROM_EMAIL,
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
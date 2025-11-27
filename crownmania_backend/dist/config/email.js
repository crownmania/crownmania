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
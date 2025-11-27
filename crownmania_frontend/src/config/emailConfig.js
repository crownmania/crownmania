import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(import.meta.env.VITE_SENDGRID_API_KEY);

// Email templates
const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: 'd-xxxxxxxxxxxxx',
  SHIPPING_CONFIRMATION: 'd-xxxxxxxxxxxxx',
  COLLECTIBLE_UPDATE: 'd-xxxxxxxxxxxxx'
};

export { sgMail, EMAIL_TEMPLATES };

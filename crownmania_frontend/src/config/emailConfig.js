// DEPRECATED (S2): SendGrid was previously imported in the browser bundle,
// which exposed VITE_SENDGRID_API_KEY to anyone with DevTools. All
// transactional email is now sent from the backend (see
// crownmania_backend/src/config/email.js and services/notificationService.js).
//
// This file is intentionally left as an empty placeholder. You can safely
// delete it once you confirm no build step references the path.
export {};

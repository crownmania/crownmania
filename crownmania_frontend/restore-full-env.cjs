const fs = require('fs');
const content = `VITE_WEB3AUTH_CLIENT_ID=BAUmbZP04KfsjmqfinxmW1xx0GwYmetkTwMqSRA3UcIDBzWG5f_TZ4ozEdP5zrKucSUxuU4tY8YPnpFgNzMmdMw
VITE_WEB3_RPC_TARGET=https://api.web3auth.io/infura-service/v1/0x1
VITE_FIREBASE_AUTH_DOMAIN=crownmania-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=crownmania-prod
VITE_FIREBASE_STORAGE_BUCKET=crownmania-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=4886730691
VITE_API_URL=http://localhost:5001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
`;
fs.writeFileSync('.env', content, 'utf8');
console.log('.env file updated with FULL length Client ID');

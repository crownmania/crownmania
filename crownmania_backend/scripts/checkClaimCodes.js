import 'dotenv/config';
import { db } from '../src/config/firebase.js';

const claimCodes = await db.collection('claimCodes').count().get();
const claimed = await db.collection('claimCodes').where('claimed', '==', true).count().get();
const inventory = await db.collection('inventory').count().get();

console.log('claimCodes total:', claimCodes.data().count);
console.log('claimCodes claimed:', claimed.data().count);
console.log('inventory total:', inventory.data().count);
process.exit(0);

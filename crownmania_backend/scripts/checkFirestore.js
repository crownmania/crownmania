import '../src/env.js';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import service account helper logic or just use firebase.js logic
import { db as currentDb } from '../src/config/firebase.js';

async function checkDatabases() {
    console.log('🔍 Starting Firestore Diagnosis...\n');

    try {
        // 1. Check current configured DB (named 'crownmania')
        console.log('--- Checking "crownmania" database ---');
        const crownmaniaSnapshot = await currentDb.collection('claimCodes').limit(5).get();
        console.log(`Found ${crownmaniaSnapshot.size} documents in "crownmania" database 'claimCodes' collection.`);

        if (crownmaniaSnapshot.size > 0) {
            console.log('First 2 IDs:', crownmaniaSnapshot.docs.map(d => d.id).slice(0, 2));
        }

        // 2. Check default database
        console.log('\n--- Checking "(default)" database ---');
        const defaultDb = getFirestore(admin.app());
        const defaultSnapshot = await defaultDb.collection('claimCodes').limit(5).get();
        console.log(`Found ${defaultSnapshot.size} documents in "(default)" database 'claimCodes' collection.`);

        if (defaultSnapshot.size > 0) {
            console.log('First 2 IDs:', defaultSnapshot.docs.map(d => d.id).slice(0, 2));
        }

        // 3. Check for specific problematic code from CSV
        const testCode = 'd1933d38167b4686857b5c2cf7ded774';
        console.log(`\n--- Looking for specific code: ${testCode} ---`);

        const doc1 = await currentDb.collection('claimCodes').doc(testCode).get();
        console.log(`In "crownmania" DB: ${doc1.exists ? '✅ FOUND' : '❌ NOT FOUND'}`);

        const doc2 = await defaultDb.collection('claimCodes').doc(testCode).get();
        console.log(`In "(default)" DB: ${doc2.exists ? '✅ FOUND' : '❌ NOT FOUND'}`);

    } catch (error) {
        console.error('\n❌ Error during diagnosis:', error.message);
        if (error.message.includes('NOT_FOUND')) {
            console.error('💡 The "crownmania" database might not exist in your Firebase project.');
        }
    }

    process.exit(0);
}

checkDatabases();

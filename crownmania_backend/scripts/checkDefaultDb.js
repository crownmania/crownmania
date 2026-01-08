import '../src/env.js';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const jsonPath = join(__dirname, '../src/config/serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(jsonPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = getFirestore(); // Default database

async function run() {
    console.log('Project ID:', serviceAccount.project_id);

    const collections = ['claimCodes', 'products', 'collectibles'];

    for (const collName of collections) {
        const snapshot = await db.collection(collName).limit(5).get();
        console.log(`Collection "${collName}": ${snapshot.size} docs found (limit 5)`);
        if (snapshot.size > 0) {
            console.log(`  Sample ID: ${snapshot.docs[0].id}`);
        }
    }

    const testCode = 'd1933d38167b4686857b5c2cf7ded774';
    const doc = await db.collection('claimCodes').doc(testCode).get();
    console.log(`\nTest Code "${testCode}" in default DB: ${doc.exists ? 'FOUND' : 'NOT FOUND'}`);
}

run().catch(console.error);

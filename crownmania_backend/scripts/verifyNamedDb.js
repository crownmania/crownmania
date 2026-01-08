import '../src/env.js';
import { db } from '../src/config/firebase.js';

async function verify() {
    console.log('📊 Checking "crownmania" named database...');

    const claimCodesSnapshot = await db.collection('claimCodes').get();
    console.log(`Total claim codes: ${claimCodesSnapshot.size}`);

    const productsSnapshot = await db.collection('products').get();
    console.log(`Total products: ${productsSnapshot.size}`);

    if (productsSnapshot.size > 0) {
        console.log('Products:', productsSnapshot.docs.map(d => ({ id: d.id, name: d.data().name })));
    }

    const testCode = 'd1933d38167b4686857b5c2cf7ded774';
    const doc = await db.collection('claimCodes').doc(testCode).get();
    console.log(`\nTest Code "${testCode}": ${doc.exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
}

verify().catch(console.error);

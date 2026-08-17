/**
 * Crownmania Claim Codes Import Script
 * 
 * This script imports claim codes from a CSV file into Firestore.
 * 
 * CSV Format Expected:
 * - Column with claim code IDs (the random 32-character hex strings)
 * 
 * Usage:
 *   node scripts/importClaimCodes.js path/to/your/codes.csv
 */

// Load environment variables first
import '../src/env.js';

import { db } from '../src/config/firebase.js';
import fs from 'fs';
import path from 'path';

// Product ID for Lil Durk Figure
const PRODUCT_ID = 'lil-durk-figure';

async function importClaimCodes(csvPath) {
    console.log('📂 Reading CSV file:', csvPath);

    // Read the CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Skip header row if present (check if first line looks like a header)
    const hasHeader = !lines[0].match(/^[a-f0-9]{32}$/i);
    const codes = hasHeader ? lines.slice(1) : lines;

    // Deduplicate codes
    const uniqueCodes = [...new Set(codes.map(line => {
        const parts = line.split(',');
        return parts[0].trim().replace(/"/g, '').toLowerCase();
    }).filter(code => code.match(/^[a-f0-9]{32}$/)))];

    const duplicates = codes.length - uniqueCodes.length;
    console.log(`📊 Found ${codes.length} total entries (${duplicates} duplicates removed → ${uniqueCodes.length} unique codes)`);

    // Batch write for efficiency (Firestore limit: 500 per batch)
    const batchSize = 400;
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < uniqueCodes.length; i += batchSize) {
        const batch = db.batch();
        const chunk = uniqueCodes.slice(i, Math.min(i + batchSize, uniqueCodes.length));

        for (const claimCode of chunk) {
            // Validate format (32 hex characters)
            if (!claimCode.match(/^[a-f0-9]{32}$/)) {
                console.log(`⚠️  Skipping invalid code: ${claimCode}`);
                skipped++;
                continue;
            }

            // Create the claim code document with merge so existing claims aren't overwritten
            const claimCodeRef = db.collection('claimCodes').doc(claimCode);
            batch.set(claimCodeRef, {
                productId: PRODUCT_ID,
                claimed: false,
                claimedBy: null,
                claimedAt: null,
                tokenId: null,
                createdAt: new Date(),
            }, { merge: true });

            imported++;
        }

        await batch.commit();
        console.log(`✅ Imported ${Math.min(i + batchSize, uniqueCodes.length)} / ${uniqueCodes.length}`);
    }

    console.log('');
    console.log('🎉 Import complete!');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   🔁 Duplicates removed: ${duplicates}`);
}

// Create the Lil Durk product if it doesn't exist
async function createProduct() {
    const productRef = db.collection('products').doc(PRODUCT_ID);
    const productDoc = await productRef.get();

    if (productDoc.exists) {
        console.log('✅ Product already exists');
        return;
    }

    await productRef.set({
        name: 'Lil Durk 10-inch Resin Figure',
        type: 1,
        description: `The Lil Durk 10-inch Resin Figure is a premium collectible made for true fans. Crafted from high-quality resin, this figure features detailed sculpting and a solid, display-ready build.

Designed to capture Lil Durk's signature style and presence, it's the perfect piece for shelves, desks, or display cases.

• 10-inch tall resin figure
• High-quality, durable build
• Detailed design and finish
• Limited edition collectible`,
        images: [
            'https://storage.googleapis.com/sonorous-crane-440603-s6.appspot.com/products/lil-durk-figure/front.jpg',
            'https://storage.googleapis.com/sonorous-crane-440603-s6.appspot.com/products/lil-durk-figure/body.jpg',
            'https://storage.googleapis.com/sonorous-crane-440603-s6.appspot.com/products/lil-durk-figure/back.jpg',
            'https://storage.googleapis.com/sonorous-crane-440603-s6.appspot.com/products/lil-durk-figure/detail1.jpg',
            'https://storage.googleapis.com/sonorous-crane-440603-s6.appspot.com/products/lil-durk-figure/detail2.jpg'
        ],
        imageUrl: 'https://storage.googleapis.com/sonorous-crane-440603-s6.appspot.com/products/lil-durk-figure/front.jpg',
        modelUrl: null, // 3D model URL if available
        price: null, // Set your price
        totalEditions: 500,
        createdAt: new Date(),
        active: true
    });

    console.log('✅ Created Lil Durk Figure product');
}

// Main execution
async function main() {
    const csvPath = process.argv[2];

    if (!csvPath) {
        console.log('Usage: node scripts/importClaimCodes.js path/to/codes.csv');
        process.exit(1);
    }

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ File not found: ${csvPath}`);
        process.exit(1);
    }

    try {
        // First ensure product exists
        await createProduct();

        // Then import claim codes
        await importClaimCodes(csvPath);

        console.log('');
        console.log('🚀 Your QR codes are now ready to use!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();

/**
 * Generate Firestore batch import data from CSV
 * 
 * This script reads the serial numbers CSV and generates a JSON file
 * that can be imported into Firestore using the Firebase Console.
 * 
 * Usage: node scripts/generateImportData.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../data/serial_numbers.csv');
const OUTPUT_PATH = path.join(__dirname, '../data/claim_codes_import.json');

// Product configuration
const PRODUCT_ID = 'lil-durk-figure';

function parseCSV() {
    console.log('📂 Reading CSV file...');

    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Skip header
    const dataLines = lines.slice(1);

    console.log(`📊 Found ${dataLines.length} serial numbers`);

    const claimCodes = {};
    const seen = new Set();
    let duplicates = 0;

    for (const line of dataLines) {
        const parts = line.split(',');
        const serialNumber = parts[0].trim().toLowerCase();

        // Validate format (32 hex characters)
        if (!serialNumber.match(/^[a-f0-9]{32}$/)) {
            continue;
        }

        // Skip duplicates
        if (seen.has(serialNumber)) {
            duplicates++;
            continue;
        }
        seen.add(serialNumber);

        claimCodes[serialNumber] = {
            productId: PRODUCT_ID,
            claimed: false,
            claimedBy: null,
            claimedAt: null,
            tokenId: null,
            createdAt: new Date().toISOString()
        };
    }

    console.log(`✅ Unique codes: ${Object.keys(claimCodes).length}`);
    console.log(`⚠️  Duplicates skipped: ${duplicates}`);

    return claimCodes;
}

function generateOutput(claimCodes) {
    // Generate JSON for Firestore import
    const output = {
        claimCodes: claimCodes,
        product: {
            [PRODUCT_ID]: {
                name: 'Lil Durk 10-inch Resin Figure',
                type: 1,
                description: `The Lil Durk 10-inch Resin Figure is a premium collectible made for true fans. Crafted from high-quality resin, this figure features detailed sculpting and a solid, display-ready build.

Designed to capture Lil Durk's signature style and presence, it's the perfect piece for shelves, desks, or display cases.

• 10-inch tall resin figure
• High-quality, durable build
• Detailed design and finish
• Limited edition collectible`,
                images: [],
                imageUrl: null,
                modelUrl: null,
                createdAt: new Date().toISOString(),
                active: true
            }
        }
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`\n💾 Saved to: ${OUTPUT_PATH}`);

    // Also generate a simple list of codes for quick reference
    const codesListPath = path.join(__dirname, '../data/claim_codes_list.txt');
    fs.writeFileSync(codesListPath, Object.keys(claimCodes).join('\n'));
    console.log(`💾 Codes list saved to: ${codesListPath}`);
}

// Main
const claimCodes = parseCSV();
generateOutput(claimCodes);

console.log('\n🎉 Import data generated!');
console.log('\nNext steps:');
console.log('1. Upload product images to Firebase Storage');
console.log('2. Update the imageUrl in the product data');
console.log('3. Import the data to Firestore using the Firebase Console or CLI');

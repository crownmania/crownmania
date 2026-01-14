#!/usr/bin/env node
/**
 * Seed Inventory Script
 * Imports serial numbers from CSV into Firestore inventory collection
 * 
 * Usage: node scripts/seedInventory.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../src/config/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../data/serial_numbers.csv');

/**
 * Parse CSV file and extract serial numbers
 */
function parseCSV(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    // Skip header row
    const header = lines[0];
    const dataLines = lines.slice(1);

    console.log(`Found ${dataLines.length} serial numbers to import`);
    console.log(`CSV Header: ${header}`);

    // Parse each line: Serial Number,Verification Status,Token Claimed,...
    const serials = [];
    const seen = new Set();

    for (const line of dataLines) {
        const columns = line.split(',');
        const serialNumber = columns[0]?.trim();

        if (!serialNumber) continue;

        // Skip duplicates
        if (seen.has(serialNumber)) {
            continue;
        }
        seen.add(serialNumber);

        serials.push({
            serialNumber,
            verificationStatus: columns[1]?.trim() || 'Unused',
            tokenClaimed: columns[2]?.trim() === 'Yes',
            collectibleName: columns[3]?.trim() || null,
            collectibleNumber: columns[4]?.trim() || null,
        });
    }

    console.log(`Unique serials after deduplication: ${serials.length}`);
    return serials;
}

/**
 * Seed inventory collection in Firestore
 */
async function seedInventory() {
    console.log('\n=== CrownMania Inventory Seeder ===\n');

    // Check if CSV exists
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`CSV file not found: ${CSV_PATH}`);
        process.exit(1);
    }

    // Parse CSV
    const serials = parseCSV(CSV_PATH);

    if (serials.length === 0) {
        console.log('No serials to import');
        return;
    }

    // Check existing inventory count
    const existingCount = await db.collection('inventory').count().get();
    console.log(`Existing inventory items: ${existingCount.data().count}`);

    if (existingCount.data().count > 0) {
        console.log('\n⚠️  Inventory already has data. Skipping to avoid duplicates.');
        console.log('To reseed, delete the inventory collection first.');
        return;
    }

    // Batch insert
    const BATCH_SIZE = 500;
    let imported = 0;

    console.log(`\nImporting ${serials.length} serials in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < serials.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = serials.slice(i, i + BATCH_SIZE);

        for (const item of chunk) {
            const docRef = db.collection('inventory').doc();
            batch.set(docRef, {
                serialNumber: item.serialNumber,
                productId: null, // Will be assigned when linked to product
                status: item.tokenClaimed ? 'claimed' : 'available',
                orderId: null,
                allocatedAt: null,
                claimedAt: item.tokenClaimed ? new Date() : null,
                createdAt: new Date(),
                updatedAt: new Date(),
                // Preserve original CSV data
                originalData: {
                    verificationStatus: item.verificationStatus,
                    collectibleName: item.collectibleName,
                    collectibleNumber: item.collectibleNumber
                }
            });
        }

        await batch.commit();
        imported += chunk.length;
        console.log(`Progress: ${imported} / ${serials.length} (${Math.round(imported / serials.length * 100)}%)`);
    }

    console.log(`\n✅ Successfully imported ${imported} serial numbers to Firestore`);

    // Verify
    const finalCount = await db.collection('inventory').count().get();
    console.log(`Final inventory count: ${finalCount.data().count}`);
}

// Run
seedInventory()
    .then(() => {
        console.log('\nDone!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    });

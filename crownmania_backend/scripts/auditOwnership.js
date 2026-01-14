#!/usr/bin/env node
/**
 * Ownership Audit Script
 * Verifies data integrity across claimCodes, collectibles, and counters
 *
 * Usage: node scripts/auditOwnership.js [productId]
 */

// Load environment variables first
import '../src/env.js';

import { db } from '../src/config/firebase.js';
import { dataValidationService } from '../src/services/dataValidationService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function auditOwnership(productId = null) {
    console.log('🔍 CrownMania Ownership Audit');
    console.log('============================');
    console.log('');

    if (productId) {
        console.log(`📦 Auditing product: ${productId}`);
    } else {
        console.log('📦 Auditing all products');
    }
    console.log('');

    const report = {
        timestamp: new Date().toISOString(),
        productId: productId || 'ALL',
        summary: {},
        orphanedClaimCodes: [],
        orphanedCollectibles: [],
        editionStats: {},
        issues: []
    };

    try {
        // 1. Find orphaned records
        console.log('🔎 Checking for orphaned records...');
        const { orphanedClaimCodes, orphanedCollectibles } =
            await dataValidationService.findOrphanedRecords(productId);

        report.orphanedClaimCodes = orphanedClaimCodes;
        report.orphanedCollectibles = orphanedCollectibles;

        if (orphanedClaimCodes.length > 0) {
            console.log(`   ⚠️  Found ${orphanedClaimCodes.length} claimed codes without collectibles`);
            report.issues.push(`${orphanedClaimCodes.length} claimed codes without matching collectibles`);
        } else {
            console.log('   ✅ No orphaned claim codes');
        }

        if (orphanedCollectibles.length > 0) {
            console.log(`   ⚠️  Found ${orphanedCollectibles.length} collectibles without claimed codes`);
            report.issues.push(`${orphanedCollectibles.length} collectibles without matching claimed codes`);
        } else {
            console.log('   ✅ No orphaned collectibles');
        }

        // 2. Get product list
        console.log('');
        console.log('🔎 Checking edition counters...');

        let products = [];
        if (productId) {
            products = [productId];
        } else {
            const productsSnapshot = await db.collection('products').get();
            productsSnapshot.forEach(doc => {
                products.push(doc.id);
            });
        }

        // 3. Check edition stats for each product
        for (const pid of products) {
            const editionStats = await dataValidationService.getEditionStats(pid);
            report.editionStats[pid] = editionStats;

            console.log(`   📊 ${pid}:`);
            console.log(`      Claimed: ${editionStats.claimed}/${editionStats.totalEditions}`);
            console.log(`      Counter: ${editionStats.currentEdition}`);

            if (editionStats.gapCount > 0) {
                console.log(`      ⚠️  Edition gaps: ${editionStats.gapCount}`);
                report.issues.push(`Product ${pid} has ${editionStats.gapCount} edition gaps`);
            } else {
                console.log(`      ✅ No edition gaps`);
            }
        }

        // 4. Summary stats
        console.log('');
        console.log('📊 Summary Statistics');
        console.log('---------------------');

        let claimCodesQuery = db.collection('claimCodes');
        if (productId) {
            claimCodesQuery = claimCodesQuery.where('productId', '==', productId);
        }
        const totalCodesSnapshot = await claimCodesQuery.get();
        const totalCodes = totalCodesSnapshot.size;

        let claimedCodesQuery = db.collection('claimCodes').where('claimed', '==', true);
        if (productId) {
            claimedCodesQuery = claimedCodesQuery.where('productId', '==', productId);
        }
        const claimedCodesSnapshot = await claimedCodesQuery.get();
        const claimedCodes = claimedCodesSnapshot.size;

        let collectiblesQuery = db.collection('collectibles');
        if (productId) {
            collectiblesQuery = collectiblesQuery.where('productId', '==', productId);
        }
        const collectiblesSnapshot = await collectiblesQuery.get();
        const totalCollectibles = collectiblesSnapshot.size;

        report.summary = {
            totalClaimCodes: totalCodes,
            claimedClaimCodes: claimedCodes,
            unclaimedClaimCodes: totalCodes - claimedCodes,
            totalCollectibles: totalCollectibles,
            orphanedClaimCodes: orphanedClaimCodes.length,
            orphanedCollectibles: orphanedCollectibles.length
        };

        console.log(`   Total claim codes: ${totalCodes}`);
        console.log(`   Claimed: ${claimedCodes}`);
        console.log(`   Unclaimed: ${totalCodes - claimedCodes}`);
        console.log(`   Collectibles: ${totalCollectibles}`);
        console.log('');

        // 5. Final status
        if (report.issues.length === 0) {
            console.log('✅ AUDIT PASSED - No data integrity issues found');
        } else {
            console.log(`⚠️  AUDIT FOUND ${report.issues.length} ISSUE(S)`);
            report.issues.forEach((issue, i) => {
                console.log(`   ${i + 1}. ${issue}`);
            });
        }

        // 6. Save report
        const reportPath = path.join(__dirname, '../data/audit_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log('');
        console.log(`💾 Report saved to: ${reportPath}`);

        return report;

    } catch (error) {
        console.error('❌ Audit error:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
const productId = process.argv[2] || null;
auditOwnership(productId).then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

export { auditOwnership };

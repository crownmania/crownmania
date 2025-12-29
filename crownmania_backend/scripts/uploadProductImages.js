/**
 * Upload product images to Firebase Storage
 * 
 * Usage: node scripts/uploadProductImages.js
 */

import { admin } from '../src/config/firebase.js';
import fs from 'fs';
import path from 'path';

const bucket = admin.storage().bucket();

const PRODUCT_IMAGES = [
    {
        localPath: 'C:/Users/test/.gemini/antigravity/brain/b8c6859b-3337-4c9a-a8b0-df204e21d219/uploaded_image_0_1766749473083.jpg',
        storagePath: 'products/lil-durk-figure/front.jpg'
    },
    {
        localPath: 'C:/Users/test/.gemini/antigravity/brain/b8c6859b-3337-4c9a-a8b0-df204e21d219/uploaded_image_1_1766749473083.jpg',
        storagePath: 'products/lil-durk-figure/body.jpg'
    },
    {
        localPath: 'C:/Users/test/.gemini/antigravity/brain/b8c6859b-3337-4c9a-a8b0-df204e21d219/uploaded_image_2_1766749473083.jpg',
        storagePath: 'products/lil-durk-figure/back.jpg'
    },
    {
        localPath: 'C:/Users/test/.gemini/antigravity/brain/b8c6859b-3337-4c9a-a8b0-df204e21d219/uploaded_image_3_1766749473083.jpg',
        storagePath: 'products/lil-durk-figure/detail1.jpg'
    },
    {
        localPath: 'C:/Users/test/.gemini/antigravity/brain/b8c6859b-3337-4c9a-a8b0-df204e21d219/uploaded_image_4_1766749473083.jpg',
        storagePath: 'products/lil-durk-figure/detail2.jpg'
    }
];

async function uploadImages() {
    console.log('📸 Uploading product images to Firebase Storage...\n');

    for (const image of PRODUCT_IMAGES) {
        try {
            console.log(`Uploading ${path.basename(image.localPath)} → ${image.storagePath}`);

            await bucket.upload(image.localPath, {
                destination: image.storagePath,
                metadata: {
                    contentType: 'image/jpeg',
                    cacheControl: 'public, max-age=31536000', // 1 year cache
                },
            });

            // Make the file publicly accessible
            await bucket.file(image.storagePath).makePublic();

            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${image.storagePath}`;
            console.log(`  ✅ ${publicUrl}\n`);
        } catch (error) {
            console.error(`  ❌ Failed: ${error.message}\n`);
        }
    }

    console.log('🎉 Image upload complete!');
}

uploadImages().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
});

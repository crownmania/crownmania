const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'public', 'images');
const outputDir = path.join(__dirname, 'public', 'images-compressed');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.webp'));

async function compressImages() {
    for (const file of files) {
        const inputPath = path.join(imagesDir, file);
        const outputPath = path.join(outputDir, file);

        const stats = fs.statSync(inputPath);
        console.log(`Processing ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);

        try {
            await sharp(inputPath)
                .resize(1200, 1600, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .webp({
                    quality: 80,
                    effort: 6
                })
                .toFile(outputPath);

            const newStats = fs.statSync(outputPath);
            console.log(`  -> ${file} compressed to ${(newStats.size / 1024).toFixed(0)} KB`);
        } catch (err) {
            console.error(`  ERROR: ${err.message}`);
        }
    }

    console.log('\nDone! Compressed images saved to public/images-compressed/');
    console.log('To use them, replace the files in public/images/');
}

compressImages();

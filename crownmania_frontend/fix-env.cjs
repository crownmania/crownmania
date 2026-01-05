const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    // Normalize line endings and remove null bytes/weird chars
    const lines = content.split(/\r?\n/);
    const cleanLines = lines.map(line => {
        // Remove all non-graphic ASCII characters except space and newline
        return line.replace(/[^\x20-\x7E]/g, '').trim();
    }).filter(line => line.length > 0);

    fs.writeFileSync(envPath, cleanLines.join('\n') + '\n', 'utf8');
    console.log('Cleaned .env file');
    cleanLines.forEach(l => console.log('Line:', l));
} else {
    console.log('.env file not found');
}

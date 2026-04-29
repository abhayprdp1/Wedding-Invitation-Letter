const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'new frame');
const outputDir = path.join(__dirname, 'new frame optimized');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.png'));
const total = files.length;
let done = 0;

console.log(`Converting ${total} PNG frames to WebP...`);

const queue = [...files];
const concurrency = 8;
let running = 0;

function processNext() {
    if (queue.length === 0) return;
    if (running >= concurrency) return;

    const file = queue.shift();
    running++;

    const inputPath = path.join(inputDir, file);
    // Change output filename extension to .webp
    const outputFile = file.replace('.png', '.webp');
    const outputPath = path.join(outputDir, outputFile);

    sharp(inputPath)
        .resize({ width: 720, withoutEnlargement: true }) // Max width 720px
        .webp({ quality: 82 })                             // Quality 82 is an excellent balance
        .toFile(outputPath)
        .then(() => {
            done++;
            running--;
            process.stdout.write(`\rProgress: ${done}/${total} (${Math.round(done/total*100)}%)`);
            processNext();
            if (done === total) {
                console.log('\n\nAll done! Your optimized frames are in: "new frame optimized"');
                
                // Calculate sizes
                const originalSize = files.reduce((acc, f) => acc + fs.statSync(path.join(inputDir, f)).size, 0);
                const newFiles = fs.readdirSync(outputDir);
                const newSize = newFiles.reduce((acc, f) => acc + fs.statSync(path.join(outputDir, f)).size, 0);
                
                console.log(`Original size: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
                console.log(`Optimized size: ${(newSize / 1024 / 1024).toFixed(1)} MB`);
                console.log(`Saved: ${((1 - newSize/originalSize) * 100).toFixed(0)}%`);
            }
        })
        .catch(err => {
            console.error(`\nError processing ${file}:`, err.message);
            done++;
            running--;
            processNext();
        });

    processNext();
}

// Kick off concurrent processing
for (let i = 0; i < concurrency; i++) {
    processNext();
}

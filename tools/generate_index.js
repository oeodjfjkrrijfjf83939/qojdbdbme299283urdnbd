const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + '/' + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
        } else {
            // Only include .json files, exclude index.json
            if (file.endsWith('.json') && file !== 'index.json') {
                const fullPath = path.join(dirPath, file);
                // Convert to relative path from data/ directory
                // Replace backslashes with forward slashes for URL compatibility
                const relativePath = path.relative(DATA_DIR, fullPath).replace(/\\/g, '/');
                arrayOfFiles.push(relativePath);
            }
        }
    });

    return arrayOfFiles;
}

try {
    console.log('Scanning data directory...');
    const allFiles = getAllFiles(DATA_DIR);

    // Transform into an object with userCode as key and Relative path as value
    const indexObj = {};

    console.log(`Found ${allFiles.length} files. Parsing content...`);

    allFiles.forEach(relativePath => {
        const fullPath = path.join(DATA_DIR, relativePath);
        try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            const users = JSON.parse(fileContent);

            if (Array.isArray(users)) {
                users.forEach(user => {
                    if (user.userCode) {
                        // Map userCode -> relativePath (e.g. "example-3": "c/example-3.json")
                        // The user requested format like "clients.json" but if files are nested, we must provide the relative path
                        // so the fetcher knows where to look. 
                        // If the file is in a subfolder, we must include the folder path.
                        indexObj[user.userCode] = relativePath;
                    }
                });
            }
        } catch (err) {
            console.warn(`Skipping invalid or matching file: ${relativePath}`, err.message);
        }
    });

    fs.writeFileSync(INDEX_FILE, JSON.stringify(indexObj, null, 4));
    console.log(`Successfully generated index with ${Object.keys(indexObj).length} entries.`);
    console.log(`Wrote to ${INDEX_FILE}`);

} catch (error) {
    console.error('Error generating index:', error);
    process.exit(1);
}

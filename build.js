const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// ==========================================
// BUILD CONFIGURATION (Runs locally only)
// ==========================================
const MINIFY_HTML = true;  // Set to true to compress all HTML files in dist/
const MINIFY_CSS = true;   // Set to true to compress all CSS files in dist/

const srcDir = __dirname;
const destDir = path.join(__dirname, 'dist');

// 1. Clean dist directory
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir);

// 2. Helper to copy recursively, excluding development-only files
const excludeList = [
    'node_modules',
    '.git',
    'dist',
    'package.json',
    'package-lock.json',
    'vite.config.js',
    'build.js'
];

function copyFolderSync(from, to) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        if (excludeList.includes(element)) return;

        const stat = fs.lstatSync(path.join(from, element));
        if (stat.isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else if (stat.isDirectory()) {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}

console.log("📁 Copying project files to dist...");
copyFolderSync(srcDir, destDir);

// 3. Obfuscate core JS files in dist/
const filesToObfuscate = [
    'config.js',
    'firebase-config.js',
    'data-service.js',
    'script.js'
];

console.log("🔒 Obfuscating JavaScript files...");
filesToObfuscate.forEach(file => {
    const filePath = path.join(destDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`   Scrambling ${file}...`);
        const originalCode = fs.readFileSync(filePath, 'utf8');
        
        const obfuscatedResult = JavaScriptObfuscator.obfuscate(originalCode, {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            numbersToExpressions: true,
            simplify: true,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            stringArrayThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4
        });

        fs.writeFileSync(filePath, obfuscatedResult.getObfuscatedCode(), 'utf8');
    }
});

// 4. Minify HTML and CSS inside dist/
function stripJsComments(js) {
    // 1. Remove block comments /* ... */
    let code = js.replace(/\/\*[\s\S]*?\*\//g, '');
    // 2. Remove single-line comments // ... (not URL protocol slashes)
    code = code.split('\n').map(line => {
        return line.replace(/(?<!:)\/\/.*$/g, '');
    }).join('\n');
    return code;
}

function stripCssComments(css) {
    // Remove block comments /* ... */
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function minifyHtml(html) {
    const scripts = [];
    const styles = [];
    
    // 1. Extract script blocks, strip comments from them
    let tempHtml = html.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
        scripts.push(stripJsComments(match));
        return `<!--SCRIPT_PLACEHOLDER_${scripts.length - 1}-->`;
    });
    
    // 2. Extract style blocks, strip comments from them
    tempHtml = tempHtml.replace(/<style[\s\S]*?<\/style>/gi, (match) => {
        styles.push(stripCssComments(match));
        return `<!--STYLE_PLACEHOLDER_${styles.length - 1}-->`;
    });
    
    // 3. Remove HTML comments (excluding placeholders)
    tempHtml = tempHtml.replace(/<!--(?!SCRIPT_PLACEHOLDER_|STYLE_PLACEHOLDER_)[\s\S]*?-->/g, '');
    
    // 4. Collapse spaces and newlines in HTML
    tempHtml = tempHtml.replace(/\s+/g, ' ');
    tempHtml = tempHtml.replace(/>\s+</g, '><');
    
    // 5. Put styles back
    tempHtml = tempHtml.replace(/<!--STYLE_PLACEHOLDER_(\d+)-->/g, (match, index) => {
        return styles[parseInt(index)];
    });
    
    // 6. Put scripts back
    tempHtml = tempHtml.replace(/<!--SCRIPT_PLACEHOLDER_(\d+)-->/g, (match, index) => {
        return scripts[parseInt(index)];
    });
    
    return tempHtml.trim();
}

function minifyCss(css) {
    // Remove CSS comments
    let minified = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Collapse multiple spaces/newlines
    minified = minified.replace(/\s+/g, ' ');
    // Remove spaces around block syntax symbols
    minified = minified.replace(/\s*([\{\}:;,])\s*/g, '$1');
    minified = minified.replace(/;}/g, '}');
    return minified.trim();
}

function processDirectory(dir) {
    fs.readdirSync(dir).forEach(element => {
        const filePath = path.join(dir, element);
        const stat = fs.lstatSync(filePath);
        if (stat.isDirectory()) {
            processDirectory(filePath);
        } else if (stat.isFile()) {
            const ext = path.extname(element).toLowerCase();
            if (ext === '.html' && MINIFY_HTML) {
                console.log(`   Minifying HTML: ${path.relative(destDir, filePath)}`);
                const content = fs.readFileSync(filePath, 'utf8');
                fs.writeFileSync(filePath, minifyHtml(content), 'utf8');
            } else if (ext === '.css' && MINIFY_CSS) {
                console.log(`   Minifying CSS: ${path.relative(destDir, filePath)}`);
                const content = fs.readFileSync(filePath, 'utf8');
                fs.writeFileSync(filePath, minifyCss(content), 'utf8');
            }
        }
    });
}

if (MINIFY_HTML || MINIFY_CSS) {
    console.log("⚡ Minifying HTML & CSS files...");
    processDirectory(destDir);
}

console.log("✅ Build complete! Obfuscated project generated in the 'dist' folder.");

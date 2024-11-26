'use strict';

const fs = require('fs');
const path = require('path');

console.log('Setting last updated date...');
let indexFile = fs.readFileSync(path.resolve(__dirname, 'public/index.html'), 'utf-8') ?? '';

const lastUpdatedDate = new Date().toLocaleDateString();
indexFile = indexFile.replace(/(<span class="last-updated">).+(<\/span>)/g, `$1${lastUpdatedDate}$2`);

fs.writeFileSync(path.resolve(__dirname, 'public/index.html'), indexFile);
console.log('Done.');

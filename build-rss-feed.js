'use strict';

const fs = require('fs');
const path = require('path');

const numberOfEntries = 15;

console.log('Reading games.csv...');
const rawCsvFile = fs.readFileSync(path.resolve(__dirname, 'public/games.csv'), 'utf-8').split('\n') ?? [];
let currentGameNumber = rawCsvFile.length - 2;
const entries = rawCsvFile.slice(1, numberOfEntries + 1);

const rssFeedPreamble = [
  '<?xml version="1.0" encoding="UTF-8" ?>',
  '<rss version="2.0">',
  '  <channel>',
  '    <title>[games]</title>',
  '    <link>https://raycatwhodat.games</link>',
  '    <description>List of neat/interesting games</description>',
];

const rssFeedItems = [];

const rssFeedEpilogue = [
  '  </channel>',
  '</rss>'
];

console.log(`Parsing top ${numberOfEntries} entries...`);
for (const entry of entries) {
  let [_, name, image, url, blurb] = /"(.+)","(.+)","(.*)","(.*)"/g.exec(entry) ?? [];

  image = image.replace(/\[\/?img\]/g, '')
  
  rssFeedItems.push(`    <item>`);
  rssFeedItems.push(`      <title>#${currentGameNumber}: ${name}</title>`);
  rssFeedItems.push(`      <link>${url}</link>`);
  rssFeedItems.push(`      <description>${image}</description>`);
  rssFeedItems.push(`    </item>`);
  currentGameNumber--;
}

const rssFeed = [
  ...rssFeedPreamble,
  ...rssFeedItems,
  ...rssFeedEpilogue,
  ""
].join('\n');

console.log('Writing RSS feed to file...');
fs.writeFileSync(path.resolve(__dirname, 'public/feed.xml'), rssFeed);
console.log('Done.');

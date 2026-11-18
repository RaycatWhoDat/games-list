'use strict';

const fs = require('fs');
const path = require('path');

// The blurb author list lives in index.html as a JSON block.
const BLURB_AUTHORS = JSON.parse(
  /<script type="application\/json" id="blurb-authors">([\s\S]*?)<\/script>/.exec(
    fs.readFileSync(path.resolve(__dirname, 'public/index.html'), 'utf-8')
  )[1]
);

const numberOfEntries = 15;

const parseRow = line => [...line.matchAll(/"([^"]*)"/g)].map(m => m[1]);

console.log('Reading games.csv...');
const rawCsvFile = fs.readFileSync(path.resolve(__dirname, 'public/games.csv'), 'utf-8').split('\n') ?? [];
let currentGameNumber = rawCsvFile.length - 2;
const entries = rawCsvFile.slice(1, numberOfEntries + 1);

const rssFeedPreamble = [
  '<?xml version="1.0" encoding="UTF-8" ?>',
  '<rss version="2.0">',
  '  <channel>',
  '    <title>[games]</title>',
  '    <link>https://alistof.games</link>',
  '    <description>List of neat/interesting games</description>',
];

const rssFeedItems = [];

const rssFeedEpilogue = [
  '  </channel>',
  '</rss>'
];

console.log(`Parsing top ${numberOfEntries} entries...`);
for (const entry of entries) {
  let [name, image, url, /* focus_code */, ...blurbs] = parseRow(entry);

  image = image.replace(/\[\/?img\]/g, '')
  const blurbHtml = blurbs
    .filter((text, i) => text && BLURB_AUTHORS[i])
    .map(text => `<p>${text}</p>`)
    .join('');

  rssFeedItems.push(`    <item>`);
  rssFeedItems.push(`      <title>#${currentGameNumber}: ${name}</title>`);
  rssFeedItems.push(`      <link>${url}</link>`);
  rssFeedItems.push(`      <description><![CDATA[<img src="${image}"/><br/>${blurbHtml}]]></description>`);
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

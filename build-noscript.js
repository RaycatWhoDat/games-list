"use strict";

const fs = require("fs");
const path = require("path");

const lastUpdatedDate = new Date().toLocaleDateString("en-US", {
  timeZone: "America/Chicago",
});

console.log("Reading games.csv...");
const rawCsvFile =
  fs
    .readFileSync(path.resolve(__dirname, "public/games.csv"), "utf-8")
    .split("\n") ?? [];
const entries = rawCsvFile.slice(1).filter((line) => line.trim() !== "");

console.log(`Parsing ${entries.length} entries for noscript page...`);

// Generate the full noscript.html with lazy-loaded images
const noscriptHtmlPreamble = `<!doctype html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Rozha+One&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://unpkg.com/tachyons@4.12.0/css/tachyons.min.css" />

    <link rel="icon" type="image/png" sizes="32x32" href="https://i.imgur.com/n8SrLzG.png">
    <link rel="icon" type="image/png" sizes="16x16" href="https://i.imgur.com/lG8hWO7.png">

    <title>[games] - No JavaScript</title>

    <style>
        .rozha-one-regular {
            font-family: "Rozha One", serif;
            font-weight: 400;
            font-style: normal;
        }

        .image {
            position: relative;
            overflow: hidden;
            text-align: right;
            height: 350px;
        }

        .image span {
            position: absolute;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            right: 0;
            text-decoration: none;
            outline: none;
        }

        .image span.game-name {
            bottom: 0;
            background-color: white;
            color: black;
            padding: 8px 0;
        }

        .image span.game-name:has(+ span.game-blurb) {
            bottom: calc(3em + 8px);
        }

        .image span.game-blurb {
            padding: 10px 0;
            height: 2.25em;
            bottom: 0;
            background-color: black;
            color: white;
        }

        .image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .image img:has(+ span.game-name + span.game-blurb) {
            height: 80%;
        }

        .games {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            justify-items: stretch;
        }

        @media (width < 1100px) {
            .games {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>

<body class="flex flex-column justify-center items-center mb5">
    <div class="mt4 w-80">
        <div class="logo rozha-one-regular measure f-headline">
            <p class="mh0 mv3">
                [games]
                <span class="measure athelas f5 silver">Games picked solely based on vibes</span>
            </p>
        </div>
        <div class="ph2 f5 bg-near-black white tc athelas flex justify-between items-center">
            <p class="ma0 pv1 nowrap lh-copy">${entries.length} games selected by <a
                    class="link pointer light-blue dim" href="https://raycatwhodat.newgrounds.com">RaycatWhoDat</a> as of <span class="last-updated">${lastUpdatedDate}</span></p>
            <div class="pv1">
                <a class="link light-blue dim" href="/">Back to main site</a>
                <span class="mh2">|</span>
                <a class="link flex-inline justify-center items-center orange b" href="/feed.xml">rss</a>
            </div>
        </div>
    </div>

    <div class="w-80 mt4 pa3 bg-light-yellow ba b--gold">
        <p class="ma0 f5 athelas">You are viewing the JavaScript-free version of this site.</p>
    </div>

    <div class="games w-80 mt4">
`;

const noscriptHtmlEpilogue = `    </div>

    <div class="mv4 pv2 w-80 bg-near-black near-white tc">
        <p class="f4 i athelas">"As a <a class="link pointer white dim" href="https://twitch.tv/DNOpls">wise man</a>
            once said... 'so many game, no many time'."</p>
    </div>
</body>

</html>
`;

// Generate the text-only list for injection into index.html
console.log("Generating text-only list for index.html...");

const textListItems = [];
const gameCards = [];

for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const entryNumber = i + 1;
  let [_, name, rawImage, url, blurb] =
    /"(.+)","(.+)","(.*)","(.*)","(.*)"/g.exec(entry) ?? [];

  if (!name) continue;

  const image = rawImage.replace(/\[\/?img\]/g, "");
  const escapedName = name
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const escapedBlurb = blurb
    ? blurb
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/&quot;/g, '"')
    : "";

  let listItem = `            <li>#${entryNumber}: `;

  if (url) {
    listItem += `<a href="${url}">${escapedName}</a>`;
  } else {
    listItem += escapedName;
  }

  if (escapedBlurb) {
    listItem += ` - ${escapedBlurb}`;
  }

  listItem += `</li>`;
  textListItems.push(listItem);

  let cardHtml = `        <div class="image ba bw1 b--near-black bg-light-gray athelas">\n`;

  if (url) {
    cardHtml += `            <a href="${url}" target="_blank" rel="noopener">\n`;
    cardHtml += `                <img loading="lazy" src="${image}" alt="${escapedName}">\n`;
    cardHtml += `            </a>\n`;
  } else {
    cardHtml += `            <img loading="lazy" src="${image}" alt="${escapedName}">\n`;
  }

  cardHtml += `            <span class="game-name">${escapedName}</span>\n`;

  if (escapedBlurb) {
    cardHtml += `            <span class="game-blurb">${escapedBlurb}</span>\n`;
  }

  cardHtml += `        </div>\n`;

  gameCards.push(cardHtml);
}

const noscriptHtml =
  noscriptHtmlPreamble + gameCards.join("") + noscriptHtmlEpilogue;

console.log("Writing noscript.html...");
fs.writeFileSync(path.resolve(__dirname, "public/noscript.html"), noscriptHtml);

const noscriptBlock = `    <noscript>
        <style>.sort { visibility: hidden; }</style>
        <div class="w-100 mt4 pa3 bg-light-yellow ba b--gold athelas">
            <p class="ma0 f5 mb3">JavaScript is disabled. <a class="link blue dim" href="/noscript.html">View the full visual gallery</a> or browse the text list below:</p>
            <ul class="games-text-list list pl0 mt3 f6">
${textListItems.join("\n")}
            </ul>
        </div>
    </noscript>`;

// Read index.html and inject the noscript block
console.log("Reading index.html...");
const indexHtmlPath = path.resolve(__dirname, "public/index.html");
let indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");

// Remove existing noscript block if present (between markers or just the tag)
const noscriptRegex = /\s*<noscript>[\s\S]*?<\/noscript>/g;
indexHtml = indexHtml
  .replace(noscriptRegex, "")
  .replace(
    /(<span class="entries-count">).+(<\/span>)/g,
    `$1${entries.length}$2`
  );

// Insert noscript block after the games div
const gamesDiv = '<div class="games w-80 mt4"></div>';
indexHtml = indexHtml.replace(gamesDiv, gamesDiv + "\n\n" + noscriptBlock);

console.log("Writing updated index.html...");
fs.writeFileSync(indexHtmlPath, indexHtml);

console.log("Done.");

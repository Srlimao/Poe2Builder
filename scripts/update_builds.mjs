import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { parsePob2 } from '../src/renderer/src/utils/pob2Parser.js';

const require = createRequire(import.meta.url);
const db = require('../server/db.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse optional argument for max pages, default to 5
const args = process.argv.slice(2);
const parsedPages = parseInt(args[0], 10);
const MAX_PAGES = !isNaN(parsedPages) && parsedPages > 0 ? parsedPages : 5;
const BASE_URL = 'https://pobarchives.com';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHtml(url) {
  console.log(`Fetching ${url}...`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Poe2Builder Automated Scraper / 1.0 (contact: admin@poe2builder.dev)'
    }
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.text();
}

async function scrapeBuilds() {
  console.log('Starting automated build scrape...');

  // Load passive mapping to pass into parser
  const mappingPath = path.resolve(__dirname, '../data/passive_mapping.json');
  if (!fs.existsSync(mappingPath)) {
    console.error(`Passive mapping file not found at ${mappingPath}. Run update-tree first.`);
    process.exit(1);
  }
  const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  let totalScraped = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`\n--- Scraping Page ${page} ---`);
    let html;
    try {
      html = await fetchHtml(`${BASE_URL}/builds/poe2?goldenPage=${page}`);
    } catch (e) {
      console.error(`Failed to fetch page ${page}:`, e.message);
      continue;
    }

    const $ = cheerio.load(html);
    const buildLinks = [];
    
    // Find all links that start with /build/
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('/build/') && href.length > 8) {
        if (!buildLinks.includes(href)) {
          buildLinks.push(href);
        }
      }
    });

    console.log(`Found ${buildLinks.length} build links on page ${page}.`);

    for (const link of buildLinks) {
      const sourceId = link.replace('/build/', '');
      
      // Skip if we already have this build (simple check before full fetch)
      const existing = await new Promise((resolve) => {
        db.get(`SELECT id FROM public_builds WHERE source_id = ?`, [sourceId], (err, row) => {
          resolve(row);
        });
      });

      if (existing) {
        console.log(`Build ${sourceId} already exists in DB. Skipping.`);
        continue;
      }

      await delay(1000); // polite delay

      let buildHtml;
      try {
        buildHtml = await fetchHtml(`${BASE_URL}${link}`);
      } catch (e) {
        console.error(`Failed to fetch build page ${link}:`, e.message);
        continue;
      }

      const $build = cheerio.load(buildHtml);
      let pobbUrl = null;

      // Extract pobb.in link (usually looks like https://pobb.in/XXXXX)
      $build('a').each((i, el) => {
        const href = $build(el).attr('href');
        if (href && href.includes('pobb.in/')) {
          pobbUrl = href;
        }
      });

      if (!pobbUrl) {
        // Fallback: search raw html string
        const match = buildHtml.match(/https:\/\/pobb\.in\/[a-zA-Z0-9]+/);
        if (match) pobbUrl = match[0];
      }

      if (!pobbUrl) {
        console.log(`Could not find pobb.in URL for build ${sourceId}. Skipping.`);
        continue;
      }

      // Scrape Build Name from HTML
      let buildName = $build('.sp-lg-title').text().trim();

      // Scrape Author
      const author = $build('.list-meta2 .for-what a').first().text().trim();

      // Scrape Stats
      let popularity = '';
      let ehp = '';
      let dps = '';
      
      $build('.property-meta span').each((i, el) => {
        const text = $build(el).text().trim();
        if ($build(el).find('.fa-heart').length > 0) {
          popularity = text;
        } else if ($build(el).find('.fa-hand-holding-medical').length > 0) {
          ehp = text;
        } else if ($build(el).find('.fa-bow-arrow').length > 0) {
          dps = text;
        }
      });

      // Scrape Tags
      const tagsArray = [];
      $build('.magic-tag .content-tag').each((i, el) => {
        tagsArray.push($build(el).text().trim());
      });
      const tagsStr = JSON.stringify(tagsArray);

      console.log(`Found pobb.in URL: ${pobbUrl} | Author: ${author}`);
      await delay(1000); // polite delay

      // Fetch raw base64 from pobb.in just to extract class and ascendancy
      let rawPob;
      try {
        rawPob = await fetchHtml(`${pobbUrl}/raw`);
      } catch (e) {
        console.error(`Failed to fetch raw PoB from ${pobbUrl}:`, e.message);
        continue;
      }

      // Try to parse the base64 string to get the ascendancy info
      let parsedBuild;
      try {
        parsedBuild = await parsePob2(rawPob, mappingData);
      } catch (e) {
        console.error(`Failed to parse PoB for ${sourceId}:`, e.message);
        continue;
      }

      // Clean and extract metadata
      if (!buildName) {
        buildName = parsedBuild.trees?.[0]?.title || `Imported Build ${sourceId}`;
      }
      const className = parsedBuild.className || '';
      const ascendancyName = parsedBuild.ascendancyName || '';

      // Save to database
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO public_builds (source_id, pobb_url, build_name, author, class_name, ascendancy_name, popularity, ehp, dps, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [sourceId, pobbUrl, buildName, author, className, ascendancyName, popularity, ehp, dps, tagsStr],
          function(err) {
            if (err) {
              console.error(`DB Error inserting build ${sourceId}:`, err.message);
              resolve();
            } else {
              console.log(`Successfully saved build: ${buildName} (${ascendancyName || className})`);
              totalScraped++;
              resolve();
            }
          }
        );
      });
    }
  }

  console.log(`\nAutomated scraping complete. Inserted ${totalScraped} new builds.`);
}

scrapeBuilds().then(() => {
  db.close();
}).catch(err => {
  console.error("Scraper failed:", err);
  db.close();
});

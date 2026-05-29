const fs = require('fs');
const path = require('path');

const UNIQUES_URL = 'https://raw.githubusercontent.com/repoe-fork/poe2/master/data/uniques.json';
const UNIQUES_FILE = path.join(__dirname, '..', 'data', 'uniques.json');

async function updateUniques() {
    console.log('Downloading latest poe2 uniques data from repoe-fork...');
    try {
        const response = await fetch(UNIQUES_URL, { headers: { 'User-Agent': 'poe2-build-planner' } });
        if (!response.ok) throw new Error(`Failed to download uniques: HTTP ${response.status}`);

        console.log('Download complete. Parsing JSON...');
        const rawUniques = await response.json();
        
        const uniques = [];

        Object.values(rawUniques).forEach(unique => {
            if (!unique.name) return;

            // Exclude DNT/UNUSED if any
            if (unique.name.includes('[DNT]') || unique.name.includes('UNUSED')) {
                return;
            }

            uniques.push({
                Id: unique.id,
                Name: unique.name,
                ItemClass: unique.item_class,
                Icon: unique.visual_identity ? unique.visual_identity.dds_file : null,
                IsAlternateArt: unique.is_alternate_art || false
            });
        });

        // Sort alphabetically
        uniques.sort((a, b) => a.Name.localeCompare(b.Name));

        fs.writeFileSync(UNIQUES_FILE, JSON.stringify(uniques, null, 4));
        console.log(`Saved ${uniques.length} unique items to ${UNIQUES_FILE}`);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

updateUniques();

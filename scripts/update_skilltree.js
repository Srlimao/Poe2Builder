const fs = require('fs');
const path = require('path');

const ASSETS_DEST = path.join(__dirname, '..', 'data', 'assets');
const RAW_DATA_FILE = path.join(__dirname, '..', 'data', 'poe2_skilltree_data.json');
const MAPPING_FILE = path.join(__dirname, '..', 'data', 'passive_mapping.json');
const ASCENDANCIES_FILE = path.join(__dirname, '..', 'data', 'ascendancies.json');

const DATA_URL = 'https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/master/data.json';
const ASSETS_API_URL = 'https://api.github.com/repos/grindinggear/poe2-skilltree-export/contents/assets';

async function updateSkillTree() {
    console.log('Downloading poe2 skill tree data directly from repository...');

    try {
        // 1. Fetch data.json
        console.log('Fetching data.json...');
        const resData = await fetch(DATA_URL, { headers: { 'User-Agent': 'poe2-build-planner' } });
        if (!resData.ok) throw new Error(`Failed to fetch data.json: HTTP ${resData.status}`);
        
        const rawData = await resData.text();
        const data = JSON.parse(rawData);

        // 2. Fetch assets list and download them
        console.log('Fetching assets list...');
        const resAssets = await fetch(ASSETS_API_URL, { headers: { 'User-Agent': 'poe2-build-planner' } });
        if (!resAssets.ok) throw new Error(`Failed to fetch assets list: HTTP ${resAssets.status}`);
        
        const assetsList = await resAssets.json();
        
        if (!fs.existsSync(ASSETS_DEST)) {
            fs.mkdirSync(ASSETS_DEST, { recursive: true });
        }

        console.log(`Downloading ${assetsList.length} assets...`);
        let downloadedCount = 0;
        
        // Download assets in chunks to avoid overwhelming network
        const chunkSize = 10;
        for (let i = 0; i < assetsList.length; i += chunkSize) {
            const chunk = assetsList.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (asset) => {
                if (asset.type === 'file' && asset.download_url) {
                    const targetPath = path.join(ASSETS_DEST, asset.name);
                    try {
                        const assetRes = await fetch(asset.download_url, { headers: { 'User-Agent': 'poe2-build-planner' } });
                        if (assetRes.ok) {
                            const buffer = Buffer.from(await assetRes.arrayBuffer());
                            fs.writeFileSync(targetPath, buffer);
                            downloadedCount++;
                        }
                    } catch (err) {
                        console.error(`Failed to download ${asset.name}:`, err.message);
                    }
                }
            }));
            process.stdout.write(`\rProgress: ${Math.min(i + chunkSize, assetsList.length)} / ${assetsList.length}`);
        }
        console.log(`\nSuccessfully downloaded ${downloadedCount} assets to data/assets/`);

        // 3. Process data.json and save files
        console.log('Processing JSON...');
        // Save full data for future analysis
        fs.writeFileSync(RAW_DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`Saved full skill tree data to ${RAW_DATA_FILE}`);

        // Extract mapping
        const mapping = {};
        let count = 0;
        for (const key in data.nodes) {
            const n = data.nodes[key];
            if (n.skill !== undefined && n.id) {
                mapping[n.skill.toString()] = n.id;
                count++;
            }
        }

        fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
        console.log(`Saved ${count} passive mappings to ${MAPPING_FILE}`);

        // Extract Ascendancies
        const ascendanciesList = [];
        if (data.classes) {
            data.classes.forEach(cls => {
                // Add base class
                ascendanciesList.push({
                    id: cls.name,
                    name: `${cls.name} (General)`
                });
                
                // Add ascendancies
                if (cls.ascendancies) {
                    cls.ascendancies.forEach(asc => {
                        if (asc.id && asc.name) {
                            ascendanciesList.push({
                                id: asc.id,
                                name: `${cls.name} (${asc.name})`
                            });
                        }
                    });
                }
            });
        }
        
        fs.writeFileSync(ASCENDANCIES_FILE, JSON.stringify(ascendanciesList, null, 2));
        console.log(`Saved ${ascendanciesList.length} ascendancies to ${ASCENDANCIES_FILE}`);
    } catch (e) {
        console.error('Error during update:', e.message);
    }
}

updateSkillTree();


const https = require('https');
const fs = require('fs');
const path = require('path');

const GEMS_URL = 'https://raw.githubusercontent.com/repoe-fork/poe2/master/data/skill_gems.json';
const SKILL_GEMS_FILE = path.join(__dirname, '..', 'skill_gems.json');
const SUPPORT_GEMS_FILE = path.join(__dirname, '..', 'support_gems.json');
const SPIRIT_GEMS_FILE = path.join(__dirname, '..', 'spirit_gems.json');

console.log('Downloading latest poe2 gems data from repoe-fork...');

const req = https.get(GEMS_URL, { headers: { 'User-Agent': 'poe2-build-planner' } }, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed to download: HTTP ${res.statusCode}`);
        return;
    }

    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            console.log('Download complete. Parsing JSON...');
            const rawData = JSON.parse(data);
            
            const skillGems = [];
            const supportGems = [];
            const spiritGems = []; // For future use if repoe adds spirit categorizations
            
            Object.values(rawData).forEach(gem => {
                if (!gem.base_item || !gem.base_item.display_name) return;
                
                // Exclude unused or DNT (Do Not Translate) gems
                if (gem.base_item.display_name.includes('[DNT') || gem.base_item.display_name.includes('UNUSED')) {
                    return;
                }
                
                const entry = {
                    Gem: gem.base_item.display_name,
                    Tier: 1 // Default tier
                };
                
                if (gem.gem_type === 'active') {
                    skillGems.push(entry);
                } else if (gem.gem_type === 'support') {
                    supportGems.push(entry);
                }
            });
            
            // Sort alphabetically for consistency
            skillGems.sort((a, b) => a.Gem.localeCompare(b.Gem));
            supportGems.sort((a, b) => a.Gem.localeCompare(b.Gem));

            fs.writeFileSync(SKILL_GEMS_FILE, JSON.stringify(skillGems, null, 4));
            console.log(`Saved ${skillGems.length} skill gems to ${SKILL_GEMS_FILE}`);
            
            fs.writeFileSync(SUPPORT_GEMS_FILE, JSON.stringify(supportGems, null, 4));
            console.log(`Saved ${supportGems.length} support gems to ${SUPPORT_GEMS_FILE}`);
            
            // Empty out spirit gems for now as they are included in active gems, or write empty array
            fs.writeFileSync(SPIRIT_GEMS_FILE, JSON.stringify(spiritGems, null, 4));
            console.log(`Cleared spirit gems (now bundled with skill gems) in ${SPIRIT_GEMS_FILE}`);

        } catch (e) {
            console.error('Error parsing JSON:', e.message);
        }
    });
});

req.on('error', (e) => {
    console.error('Error fetching data:', e.message);
});

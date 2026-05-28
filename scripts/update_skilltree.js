const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_URL = 'https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/main/data.json';
const RAW_DATA_FILE = path.join(__dirname, '..', 'data', 'poe2_skilltree_data.json');
const MAPPING_FILE = path.join(__dirname, '..', 'data', 'passive_mapping.json');
const ASCENDANCIES_FILE = path.join(__dirname, '..', 'data', 'ascendancies.json');

console.log('Downloading latest poe2 skill tree data...');

https.get(DATA_URL, (res) => {
    let rawData = '';

    res.on('data', (chunk) => {
        rawData += chunk;
    });

    res.on('end', () => {
        try {
            console.log('Download complete. Parsing JSON...');
            const data = JSON.parse(rawData);

            // 1. Save full data for future analysis
            fs.writeFileSync(RAW_DATA_FILE, JSON.stringify(data, null, 2));
            console.log(`Saved full skill tree data to ${RAW_DATA_FILE}`);

            // 2. Extract mapping
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

            // 3. Extract Ascendancies
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
            console.error('Error parsing JSON:', e.message);
        }
    });

}).on('error', (e) => {
    console.error('Got error making request:', e.message);
});

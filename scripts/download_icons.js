const https = require('https');
const fs = require('fs');

const icons = {
    'helm': 'https://raw.githubusercontent.com/game-icons/icons/master/1x1/lorc/visored-helm.svg',
    'amulet': 'https://raw.githubusercontent.com/game-icons/icons/master/1x1/lorc/gem-necklace.svg',
    'weapon': 'https://raw.githubusercontent.com/game-icons/icons/master/1x1/lorc/broadsword.svg',
    'body': 'https://raw.githubusercontent.com/game-icons/icons/master/1x1/lorc/breastplate.svg',
    'gloves': 'https://raw.githubusercontent.com/game-icons/icons/master/1x1/lorc/gauntlet.svg',
    'belt': 'https://raw.githubusercontent.com/game-icons/icons/master/1x1/lorc/belt.svg',
    'boots': 'https://raw.githubusercontent.com/game-icons/icons/master/1x1/lorc/leather-boot.svg',
    'ring': 'https://raw.githubusercontent.com/game-icons/icons/master/1x1/lorc/ring.svg'
};

async function download(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function run() {
    let css = '';
    for (let [name, url] of Object.entries(icons)) {
        let svg = await download(url);
        // Clean up SVG: remove width/height, change fill to #dfc190
        svg = svg.replace(/<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="%23dfc190">');
        svg = svg.replace(/\n/g, '').replace(/"/g, "'");
        
        const className = name === 'weapon' ? '.weapon1-icon,\n.weapon2-icon' : `.${name}-icon`;
        css += `${className} {\n    background-image: url("data:image/svg+xml;utf8,${svg}");\n}\n\n`;
    }
    fs.writeFileSync('new_icons.css', css);
    console.log("Done!");
}
run();

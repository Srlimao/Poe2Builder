const fs = require('fs');
const zlib = require('zlib');

const code = fs.readFileSync('d:/Apps/Poe2Builder/examples/big_pob2.code', 'utf-8');
const b64 = code.trim().replace(/-/g, '+').replace(/_/g, '/');
const binStr = Buffer.from(b64, 'base64');

zlib.inflate(binStr, (err, decompressed) => {
    if (err) {
        console.error("Error decompressing:", err);
        return;
    }
    fs.writeFileSync('d:/Apps/Poe2Builder/examples/big_pob2.xml', decompressed.toString('utf-8'));
    console.log("Decompressed to examples/big_pob2.xml");
});

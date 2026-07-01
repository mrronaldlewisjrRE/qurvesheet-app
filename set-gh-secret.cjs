const sodium = require('tweetsodium');
const https = require('https');

const GH_TOKEN = process.argv[2];
const REPO = process.argv[3];
const KEY_ID = process.argv[4];
const KEY_B64 = process.argv[5];
const SECRET_NAME = process.argv[6];
const SECRET_VALUE = process.argv[7];

// Encrypt secret using libsodium
const key = Buffer.from(KEY_B64, 'base64');
const valueBytes = Buffer.from(SECRET_VALUE);
const encryptedBytes = sodium.seal(valueBytes, key);
const encrypted = Buffer.from(encryptedBytes).toString('base64');

// Upload to GitHub
const data = JSON.stringify({ encrypted_value: encrypted, key_id: KEY_ID });
const options = {
  hostname: 'api.github.com',
  path: `/repos/${REPO}/actions/secrets/${SECRET_NAME}`,
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${GH_TOKEN}`,
    'User-Agent': 'QurveSheet',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  console.log(`${SECRET_NAME}: ${res.statusCode} ${res.statusMessage}`);
});
req.on('error', (e) => console.error(e));
req.write(data);
req.end();

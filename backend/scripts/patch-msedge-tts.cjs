const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../node_modules/msedge-tts/dist/MsEdgeTTS.js');
if (fs.existsSync(target)) {
  let content = fs.readFileSync(target, 'utf8');
  if (content.includes('&& m.data instanceof ArrayBuffer')) {
    content = content.replace('&& m.data instanceof ArrayBuffer', '');
    fs.writeFileSync(target, content, 'utf8');
    console.log('[OK] Successfully patched msedge-tts ArrayBuffer binary check for natural neural audio synthesis.');
  } else {
    console.log('[INFO] msedge-tts is already patched.');
  }
} else {
  console.log('[WARN] msedge-tts not found at:', target);
}

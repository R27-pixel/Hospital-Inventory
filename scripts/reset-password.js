const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const roamingDir = path.join(os.homedir(), 'AppData', 'Roaming');
const possibleFolders = ['hospital-inventory', 'HospitalInventory', 'Hospital Inventory', 'com.hospital.inventory'];

let found = false;

for (const folder of possibleFolders) {
  const dbPath = path.join(roamingDir, folder, 'data', 'inventory.db');
  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      db.prepare('DELETE FROM users').run();
      console.log('---------------------------------------------------------');
      console.log(`✅ SUCCESS: Master Password cleared from:`);
      console.log(`   ${dbPath}`);
      console.log('Launch the app (npm start) to set your NEW Master Password.');
      console.log('---------------------------------------------------------');
      db.close();
      found = true;
      break;
    } catch (err) {
      console.error(`Error opening ${dbPath}:`, err.message);
    }
  }
}

if (!found) {
  console.log('Searching AppData/Roaming for any inventory.db file...');
  try {
    const files = fs.readdirSync(roamingDir);
    for (const f of files) {
      const p = path.join(roamingDir, f, 'data', 'inventory.db');
      if (fs.existsSync(p)) {
        const db = new Database(p);
        db.prepare('DELETE FROM users').run();
        console.log('---------------------------------------------------------');
        console.log(`✅ SUCCESS: Master Password cleared from: ${p}`);
        console.log('Launch the app (npm start) to set your NEW Master Password.');
        console.log('---------------------------------------------------------');
        db.close();
        found = true;
        break;
      }
    }
  } catch (err) {
    console.error('Search error:', err);
  }
}

if (!found) {
  console.log('❌ Could not locate inventory.db file in AppData. Please launch the app once to initialize.');
}

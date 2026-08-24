const fs = require('fs');
const path = require('path');

function inspectAsarHeader(asarPath) {
  const fd = fs.openSync(asarPath, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);

  const jsonSize = buf.readUInt32LE(12);
  const headerBuf = Buffer.alloc(jsonSize);
  fs.readSync(fd, headerBuf, 0, jsonSize, 16);
  fs.closeSync(fd);

  const headerStr = headerBuf.toString('utf8');
  const header = JSON.parse(headerStr);

  const fileList = [];
  function traverse(dirObj, currentPath) {
    if (!dirObj.files) return;
    for (const [key, val] of Object.entries(dirObj.files)) {
      const fullPath = currentPath ? `${currentPath}/${key}` : key;
      if (val.files) {
        traverse(val, fullPath);
      } else {
        fileList.push({ path: fullPath, size: val.size || 0 });
      }
    }
  }

  traverse(header, '');
  return fileList;
}

const asarFile = path.join(__dirname, '../release/win-unpacked/resources/app.asar');
if (fs.existsSync(asarFile)) {
  const files = inspectAsarHeader(asarFile);
  console.log(`Total files in app.asar: ${files.length}`);
  
  console.log('\n--- ALL FILES IN APP.ASAR ---');
  files.forEach(f => console.log(`  - ${f.path} (${f.size} bytes)`));

  const forbiddenPatterns = [
    /\.db$/i, /\.sqlite$/i, /\.sqlite3$/i, /\.bak$/i, /\.env/i,
    /builder-debug/i, /builder-effective-config/i, /inventory\.db/i
  ];

  const violations = files.filter(f => forbiddenPatterns.some(p => p.test(f.path)));
  console.log('\n--- SECURITY INVARIANT AUDIT RESULT ---');
  if (violations.length === 0) {
    console.log('✅ PASSED: Zero database, .env, test, or build metadata files found in app.asar.');
  } else {
    console.log('❌ VIOLATIONS FOUND IN APP.ASAR:');
    violations.forEach(v => console.log(`  - ${v.path} (${v.size} bytes)`));
  }
} else {
  console.error('app.asar not found at ' + asarFile);
}

const fs = require('fs');
let c = fs.readFileSync('goal.js', 'utf8');

c = c.replace(/td\.textContent = `\$\{tier\.count\.toLocaleString\("ko-KR"\)\} `;/, 'td.textContent = tier.count.toLocaleString("ko-KR") + " 건";');
// replace all broken template literals with empty strings for now to get it compiling
c = c.replace(/`[\s\S]*?`/g, '""');

// fix the missing newlines in comments that commented out code
c = c.replace(/\/\/ \? \?\?      const tierTr = document.createElement\("tr"\);/, 'const tierTr = document.createElement("tr");');
c = c.replace(/\/\/ \? \?\?      if \(i \+ TVMU_COLS < TVMU_TIERS\.length\) \{/, 'if (i + TVMU_COLS < TVMU_TIERS.length) {');

fs.writeFileSync('goal.js', c);

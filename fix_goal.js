const fs = require('fs');
let lines = fs.readFileSync('goal.js', 'utf8').split('\n');
lines[167] = '        td.textContent = `${tier.count.toLocaleString("ko-KR")} 건`;';
fs.writeFileSync('goal.js', lines.join('\n'));

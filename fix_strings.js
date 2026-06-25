const fs = require('fs');
let content = fs.readFileSync('goal.js', 'utf8');
// remove any non-ascii characters to avoid encoding issues eating quotes
content = content.replace(/[^\x00-\x7F]/g, '');
fs.writeFileSync('goal.js', content);

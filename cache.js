const fs = require('fs');
const v = '?v=' + Date.now();
['index.html', 'input.html', 'goal.html', 'partner.html'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/src="([^"]+\.js(?:[\?v=0-9]+)?)"/g, (match, p1) => {
    if (p1.startsWith('http')) return match;
    const base = p1.split('?')[0];
    return `src="${base}${v}"`;
  });
  fs.writeFileSync(f, c);
});

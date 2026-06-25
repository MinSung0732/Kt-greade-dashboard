const fs = require('fs');
let c = fs.readFileSync('goal.js', 'utf8');

c = c.replace(/td\.textContent = .*?tier\.payment\.toLocaleString\("ko-KR"\).*?;/g, 'td.textContent = tier.payment.toLocaleString("ko-KR") + " 만원";');
c = c.replace(/td\.textContent = .*?tier\.count\.toLocaleString\("ko-KR"\).*?;/g, 'td.textContent = tier.count.toLocaleString("ko-KR") + " 건";');
c = c.replace(/td\.textContent = .*?tier\.point\.toLocaleString\("ko-KR"\).*?;/g, 'td.textContent = tier.point.toLocaleString("ko-KR") + " P";');

c = c.replace(/setText\("tvmuPointView", .*?\);/g, 'setText("tvmuPointView", tvmuPoint.toLocaleString("ko-KR") + " P");');
c = c.replace(/setText\("tvmuTierView", .*?tvmuTier\.point.*?\);/g, 'setText("tvmuTierView", tvmuTier.point.toLocaleString("ko-KR") + " P 달성");');
c = c.replace(/setText\("tvmuPaymentView", .*?tvmuTier\.payment.*?\);/g, 'setText("tvmuPaymentView", "지급액: " + tvmuTier.payment.toLocaleString("ko-KR") + " 만원(VAT포함)");');
c = c.replace(/setText\("tvmuPaymentView", nextTvmu \? .*?\);/g, 'setText("tvmuPaymentView", nextTvmu ? "다음 구간: " + nextTvmu.point.toLocaleString("ko-KR") + " P" : "-");');

c = c.replace(/setText\("muCountView", .*?\);/g, 'setText("muCountView", muCount.toLocaleString("ko-KR") + " 건");');
c = c.replace(/setText\("muTierView", .*?muTier\.count.*?\);/g, 'setText("muTierView", muTier.count.toLocaleString("ko-KR") + " 건 달성");');
c = c.replace(/setText\("muPaymentView", .*?muTier\.payment.*?\);/g, 'setText("muPaymentView", "지급액: " + muTier.payment.toLocaleString("ko-KR") + " 만원(VAT포함)");');
c = c.replace(/setText\("muPaymentView", nextMu \? .*?\);/g, 'setText("muPaymentView", nextMu ? "다음 구간: " + nextMu.count.toLocaleString("ko-KR") + " 건" : "-");');

c = c.replace(/el\.title = .*?gap\.toLocaleString\("ko-KR"\).*?;/g, 'el.title = "다음 구간까지 " + gap.toLocaleString("ko-KR") + " 남음";');

fs.writeFileSync('goal.js', c);

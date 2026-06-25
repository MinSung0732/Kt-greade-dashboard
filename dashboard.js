function updateMatrixTotals() {
  const getVal = (id) => parseInt(document.getElementById(id)?.value || '0', 10);
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('openTotalInternet', getVal('openOnlineInternet') + getVal('openWholesaleInternet'));
  setVal('openTotalMainTv', getVal('openOnlineMainTv') + getVal('openWholesaleMainTv'));
  setVal('openTotalExtra', getVal('openOnlineExtra') + getVal('openWholesaleExtra'));

  setVal('installTotalInternet', getVal('installOnlineInternet') + getVal('installWholesaleInternet'));
  setVal('installTotalMainTv', getVal('installOnlineMainTv') + getVal('installWholesaleMainTv'));
  setVal('installTotalExtra', getVal('installOnlineExtra') + getVal('installWholesaleExtra'));

  setVal('dailyTotalInternet', getVal('dailyOnlineInternet') + getVal('dailyWholesaleInternet'));
}

function readForm() {
  const raw = Object.fromEntries(fieldIds.map((id) => [id, getInputValue(id)]));
  
  const base = {
    date: raw.date,
    open_online_internet: toNumber(raw.openOnlineInternet),
    open_wholesale_internet: toNumber(raw.openWholesaleInternet),
    open_online_main_tv: toNumber(raw.openOnlineMainTv),
    open_wholesale_main_tv: toNumber(raw.openWholesaleMainTv),
    open_online_extra: toNumber(raw.openOnlineExtra),
    open_wholesale_extra: toNumber(raw.openWholesaleExtra),
    open_mobile_device: toNumber(raw.openMobileDevice),
    open_mobile_usim: toNumber(raw.openMobileUsim),
    main_dongpan_usim: toNumber(raw.mainDongpanUsim),

    install_online_internet: toNumber(raw.installOnlineInternet),
    install_wholesale_internet: toNumber(raw.installWholesaleInternet),
    install_online_main_tv: toNumber(raw.installOnlineMainTv),
    install_wholesale_main_tv: toNumber(raw.installWholesaleMainTv),
    install_online_extra: toNumber(raw.installOnlineExtra),
    install_wholesale_extra: toNumber(raw.installWholesaleExtra),
    install_mobile_device: toNumber(raw.installMobileDevice),
    install_mobile_usim: toNumber(raw.installMobileUsim),

    daily_online_internet: toNumber(raw.dailyOnlineInternet),
    daily_wholesale_internet: toNumber(raw.dailyWholesaleInternet),
    daily_mobile_device: toNumber(raw.dailyMobileDevice),
    daily_mobile_usim: toNumber(raw.dailyMobileUsim),

    internet_open_rate_setting: toNumber(raw.internetOpenRate || currentSettings.internet_open_rate),
    tv_open_rate_setting: toNumber(raw.tvOpenRate || currentSettings.tv_open_rate),
    usim_open_rate_setting: toNumber(raw.usimOpenRate || currentSettings.usim_open_rate),
    device_open_rate_setting: toNumber(raw.deviceOpenRate || currentSettings.device_open_rate),

    target_count: toNumber(raw.targetCount || currentSettings.target_count),
    online_target_count: toNumber(raw.onlineTargetCount || currentSettings.online_target_count),
    mu_target_count: toNumber(raw.muTargetCount || currentSettings.mu_target_count),
    target_point: toNumber(raw.targetPoint || currentSettings.target_point),
    deadline_date: raw.deadlineDate || currentSettings.deadline_date,
  };

  return computeRowMetrics(base);
}

function renderDashboard(row, previousRow = null) {
  setText("#selectedDateView", row.date || "-");
  setText("#remainingBusinessDaysView", formatBusinessDayStatus(row));
  setText("#completedOnlineInternetView", formatNumber(row.open_online_internet));
  setText("#completedWholesaleInternetView", formatNumber(row.open_wholesale_internet));
  setText("#installOnlineInternetView", formatNumber(row.install_online_internet));
  setText("#installWholesaleInternetView", formatNumber(row.install_wholesale_internet));
  setText("#expectedOnlineInternetView", formatNumber(row.expected_online_internet));
  setText("#expectedWholesaleInternetView", formatNumber(row.expected_wholesale_internet));
  setText("#expectedInternetView", formatNumber(row.expected_internet));
  
  // 요소가 있을 경우(웹 대시보드용) 텍스트 업데이트
  const breakdownEl = document.querySelector("#expectedInternetBreakdown");
  if (breakdownEl) {
    breakdownEl.textContent = `(온라인 ${formatNumber(row.expected_online_internet)} + 도매 ${formatNumber(row.expected_wholesale_internet)})`;
  }
  setHtml(
    "#completedOnlineTvView",
    formatTvBreakdown(row.open_online_tv, row.open_online_main_tv, row.open_online_extra),
  );
  setHtml(
    "#completedWholesaleTvView",
    formatTvBreakdown(row.open_wholesale_tv, row.open_wholesale_main_tv, row.open_wholesale_extra),
  );
  setHtml(
    "#installOnlineTvView",
    formatTvBreakdown(row.install_online_tv, row.install_online_main_tv, row.install_online_extra),
  );
  setHtml(
    "#installWholesaleTvView",
    formatTvBreakdown(row.install_wholesale_tv, row.install_wholesale_main_tv, row.install_wholesale_extra),
  );
  setHtml(
    "#expectedMainTvView",
    formatTvBreakdown(
      row.expected_main_tv,
      row.open_main_tv,
      expectedByRate(row.install_main_tv, getCurrentRateSet().tvRate),
    ),
  );
  setHtml(
    "#expectedExtraTvView",
    formatTvBreakdown(
      row.expected_extra_device,
      row.open_extra_device,
      expectedByRate(row.install_extra_device, getCurrentRateSet().tvRate),
    ),
  );
  const tvPoint = toNumber(row.open_main_tv) * 2 + toNumber(row.open_extra_device) * 1;
  const muPoint = (toNumber(row.open_mobile_device) + toNumber(row.open_mobile_usim)) * 2;
  const currentTvmuPoint = tvPoint + muPoint;
  
  const mobileRate = row.mu_target_count > 0 ? (row.open_mobile_total / row.mu_target_count) : 0;

  const expectedTvPoint = toNumber(row.expected_main_tv) * 2 + toNumber(row.expected_extra_device) * 1;
  const expectedMuPoint = (toNumber(row.expected_mobile_device) + toNumber(row.expected_mobile_usim)) * 2;
  const expectedTvmuPoint = expectedTvPoint + expectedMuPoint;
  
  setText("#tvPointView", formatNumber(expectedTvmuPoint));
  setText("#completedUsimView", formatNumber(row.open_mobile_usim));
  setText("#installUsimView", formatNumber(row.install_mobile_usim));
  setText("#expectedUsimView", formatNumber(row.expected_mobile_usim));
  setText("#expectedMobileView", formatNumber(row.expected_mobile_total));
  setText("#completedDeviceView", formatNumber(row.open_mobile_device));
  setText("#installDeviceView", formatNumber(row.install_mobile_device));
  setText("#expectedDeviceView", formatNumber(row.expected_mobile_device));
  setText("#mainDongpanUsimView", formatNumber(row.main_dongpan_usim || 0));
  setText("#mobileProgressText", formatPercent(mobileRate));
  setText("#completedInternetView", formatNumber(row.open_internet));
  setText(
    "#completedInternetSplitView",
    `${formatNumber(row.open_online_internet)} / ${formatNumber(row.open_wholesale_internet)}`,
  );
  setText("#installInternetView", formatNumber(row.install_internet));
  setText(
    "#installInternetSplitView",
    `${formatNumber(row.install_online_internet)} / ${formatNumber(row.install_wholesale_internet)}`,
  );
  setText(
    "#expectedInternetSplitView",
    `${formatNumber(row.expected_online_internet)} / ${formatNumber(row.expected_wholesale_internet)}`,
  );
  setText("#expectedInternetDetailView", formatNumber(row.open_internet));
  setText("#internetTargetView", formatNumber(row.target_count));
  

  setText("#tvCurrentPointView", `${formatNumber(currentTvmuPoint)} P`);
  setText("#tvTargetPointView", `${formatNumber(row.target_point)} P`);

  setText("#openMobileSplitView", `${formatNumber(row.open_mobile_device)} / ${formatNumber(row.open_mobile_usim)}`);
  setText("#expectedMobileDetailView", formatNumber(row.open_mobile_total));
  setText("#mobileTargetView", formatNumber(row.mu_target_count));

  setText("#remainingView", formatNumber(row.remaining_count));
  setText("#dailyNeedView", formatNumber(row.daily_need));
  setText("#mobileDailyNeedView", formatNumber(row.mobile_daily_need || 0));

  const mobileProgressBar = document.querySelector("#mobileProgressBar");
  if (mobileProgressBar) mobileProgressBar.style.width = `${Math.min(mobileRate * 100, 100)}%`;

  const gaugeFillCircle = document.querySelector("#gaugeFillCircle");
  const gaugePercentText = document.querySelector("#gaugePercentText");
  if (gaugeFillCircle) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const rate = Math.min(row.open_rate || 0, 1.0); // 최대 100%까지 채움
    const offset = circumference - (rate * circumference);
    gaugeFillCircle.style.strokeDashoffset = offset;
  }
  if (gaugePercentText) {
    gaugePercentText.textContent = formatPercent(row.open_rate);
  }

  renderDelta("#onlineInternetDelta", row.expected_online_internet, previousRow?.expected_online_internet, "건");
  renderDelta("#wholesaleInternetDelta", row.expected_wholesale_internet, previousRow?.expected_wholesale_internet, "건");
  renderDelta("#expectedInternetDelta", row.expected_internet, previousRow?.expected_internet, "건");
  renderDelta("#onlineTvDelta", row.expected_online_tv, previousRow?.expected_online_tv, "건");
  renderDelta("#wholesaleTvDelta", row.expected_wholesale_tv, previousRow?.expected_wholesale_tv, "건");
  renderDelta("#expectedTvDelta", row.expected_tv, previousRow?.expected_tv, "건");
  renderDelta("#usimDelta", row.expected_mobile_usim, previousRow?.expected_mobile_usim, "건");
  renderDelta("#expectedMobileDelta", row.expected_mobile_total, previousRow?.expected_mobile_total, "건");
  renderDelta("#deviceDelta", row.expected_mobile_device, previousRow?.expected_mobile_device, "건");

  setText("#dashMyPointTargetView", formatNumber(row.target_point));
  setText("#dashMyMuTargetView", formatNumber(row.mu_target_count));
  setText("#dashMyInternetTargetView", formatNumber(row.target_count));
  setText("#dashMyMobileTargetView", formatNumber(row.mu_target_count));

  renderGoalDashCards(row);
}

function renderGoalDashCards(row) {
  // goal.js의 구간 데이터를 활용 (공유)
  const ktGoal = window.KTGoal;
  if (!ktGoal) return;

  // ① TV + M/U 합산 Point (개통완료 기준)
  const tvPoint = toNumber(row.open_main_tv) * 2 + toNumber(row.open_extra_device) * 1;
  const muPoint = (toNumber(row.open_mobile_device) + toNumber(row.open_mobile_usim)) * 2;
  const tvmuPoint = tvPoint + muPoint;

  const tvmuTier = ktGoal.getCurrentTvmuTier(tvmuPoint);
  const nextTvmuTier = ktGoal.getNextTvmuTier(tvmuPoint);

  setText("#dashTvmuPointView", `${Math.round(tvmuPoint).toLocaleString("ko-KR")} P`);
  if (tvmuTier) {
    setText("#dashTvmuTierView", `${tvmuTier.point.toLocaleString("ko-KR")} P 달성`);
    setText("#dashTvmuPaymentView", `${tvmuTier.payment.toLocaleString("ko-KR")} 만원`);
  } else {
    setText("#dashTvmuTierView", "미달성");
    setText("#dashTvmuPaymentView", "-");
  }
  if (nextTvmuTier) {
    const gap = nextTvmuTier.point - tvmuPoint;
    setText("#dashTvmuNextView", `${Math.ceil(gap).toLocaleString("ko-KR")} P 남음`);
  } else if (tvmuTier) {
    setText("#dashTvmuNextView", "최고 구간 달성 🎉");
  } else {
    setText("#dashTvmuNextView", "-");
  }

  // ② M/U 건수 (개통완료 기준)
  const muCount = toNumber(row.open_mobile_device) + toNumber(row.open_mobile_usim);
  const muTier = ktGoal.getCurrentMuTier(muCount);
  const nextMuTier = ktGoal.getNextMuTier(muCount);

  setText("#dashMuCountView", `${Math.round(muCount).toLocaleString("ko-KR")} 건`);
  if (muTier) {
    setText("#dashMuTierView", `${muTier.count.toLocaleString("ko-KR")} 건 달성`);
    setText("#dashMuPaymentView", `${muTier.payment.toLocaleString("ko-KR")} 만원`);
  } else {
    setText("#dashMuTierView", "미달성");
    setText("#dashMuPaymentView", "-");
  }
  if (nextMuTier) {
    const gap = nextMuTier.count - muCount;
    setText("#dashMuNextView", `${Math.ceil(gap).toLocaleString("ko-KR")} 건 남음`);
  } else if (muTier) {
    setText("#dashMuNextView", "최고 구간 달성 🎉");
  } else {
    setText("#dashMuNextView", "-");
  }

  // 카드 강조 클래스 (달성 여부)
  toggleGoalCardState("#dashboard-tvmu", tvmuTier);
  toggleGoalCardState("#dashboard-mu", muTier);
}

function toggleGoalCardState(selector, tier) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.toggle("goal-achieved", Boolean(tier));
}

function renderDelta(selector, current, previous, suffix) {
  const target = document.querySelector(selector);
  if (!target) return;
  target.classList.remove("delta-up", "delta-down");

  if (previous === null || previous === undefined) {
    target.textContent = "비교 대기";
    return;
  }

  const diff = current - Number(previous);
  if (diff === 0) {
    target.textContent = "전날과 동일";
    return;
  }

  target.classList.add(diff > 0 ? "delta-up" : "delta-down");
  target.textContent = `전날 대비 ${diff > 0 ? "+" : "-"}${formatNumber(Math.abs(diff))}${suffix}`;
}

function getDashboardSummary() {
  const currentRow = readForm();
  const rowsWithCurrent = form ? upsertByDate(dashboardRows, currentRow) : dashboardRows;
  return summarizeMonthlyRows(rowsWithCurrent, currentRow, getSelectedMonthLabel());
}

function summarizeMonthlyRows(rows, currentRow, selectedMonth) {
  const monthKey = selectedMonth || getMonthKey(currentRow.date);
  const monthRows = rows.filter((row) => getMonthKey(row.date) === monthKey);
  
  if (monthRows.length === 0) {
    const summary = createEmptySummary(currentRow, monthKey);
    finalizeSummary(summary, currentRow);
    return summary;
  }

  const summary = { ...monthRows[0] };
  monthRows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (typeof row[key] === "number") {
        summary[key] = Math.max(summary[key] || 0, row[key]);
      }
    });
  });

  summary.date = monthKey ? `${monthKey} 월 누적` : "-";

  finalizeSummary(summary, currentRow);
  return summary;
}

function createEmptySummary(currentRow, monthKey) {
  return {
    ...currentRow,
    date: monthKey ? `${monthKey} 월 누적` : "-",
    open_online_internet: 0,
    open_wholesale_internet: 0,
    open_internet: 0,
    open_online_tv: 0,
    open_wholesale_tv: 0,
    open_tv: 0,
    open_online_main_tv: 0,
    open_wholesale_main_tv: 0,
    open_main_tv: 0,
    open_online_extra: 0,
    open_wholesale_extra: 0,
    open_extra_device: 0,
    open_mobile_device: 0,
    open_mobile_usim: 0,
    open_mobile_total: 0,
    main_dongpan_usim: 0,
    install_mobile_device: 0,
    install_online_internet: 0,
    install_wholesale_internet: 0,
    install_internet: 0,
    install_online_tv: 0,
    install_wholesale_tv: 0,
    install_tv: 0,
    install_online_main_tv: 0,
    install_wholesale_main_tv: 0,
    install_main_tv: 0,
    install_online_extra: 0,
    install_wholesale_extra: 0,
    install_extra_device: 0,
    install_mobile_device: 0,
    install_mobile_usim: 0,
    install_mobile_total: 0,
    expected_online_internet: 0,
    expected_wholesale_internet: 0,
    expected_internet: 0,
    expected_online_tv: 0,
    expected_wholesale_tv: 0,
    expected_tv: 0,
    expected_online_main_tv: 0,
    expected_wholesale_main_tv: 0,
    expected_online_extra: 0,
    expected_wholesale_extra: 0,
    expected_main_tv: 0,
    expected_extra_device: 0,
    expected_mobile_device: 0,
    expected_mobile_usim: 0,
    expected_mobile_total: 0,
    mobile_total: 0,
    daily_online_internet: 0,
    daily_wholesale_internet: 0,
    daily_mobile_device: 0,
    daily_mobile_usim: 0,
  };
}

function finalizeSummary(summary, currentRow) {
  summary.target_count = currentRow.target_count;
  summary.online_target_count = currentRow.online_target_count;
  summary.mu_target_count = currentRow.mu_target_count;
  summary.target_point = currentRow.target_point;
  summary.deadline_date = currentRow.deadline_date;
  
  // 개통율 설정도 최신(currentRow) 값으로 덮어씌워야 함
  summary.internet_open_rate_setting = currentRow.internet_open_rate_setting;
  summary.tv_open_rate_setting = currentRow.tv_open_rate_setting;
  summary.usim_open_rate_setting = currentRow.usim_open_rate_setting;
  summary.device_open_rate_setting = currentRow.device_open_rate_setting;

  const originalSummaryDate = summary.date;
  summary.date = currentRow.date;
  
  Object.assign(summary, computeRowMetrics(summary));
  
  summary.date = originalSummaryDate;
}

function renderHistory(rows) {
  const recentRows = rows.slice(-10).reverse();

  if (!recentRows.length) {
    historyBody.innerHTML = '<tr><td colspan="11">저장된 기록이 없습니다.</td></tr>';
    return;
  }

  historyBody.innerHTML = recentRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.date)}</td>
          <td>${formatNumber(row.open_online_internet)}</td>
          <td>${formatNumber(row.open_wholesale_internet)}</td>
          <td>${formatNumber(row.install_online_internet)}</td>
          <td>${formatNumber(row.install_wholesale_internet)}</td>
          <td>${formatNumber(row.open_tv)}</td>
          <td>${formatNumber(row.install_tv)}</td>
          <td>${formatNumber(row.open_mobile_total)}</td>
          <td>${formatNumber(row.expected_online_internet)}</td>
          <td>${formatNumber(row.expected_wholesale_internet)}</td>
          <td>${formatNumber(row.expected_internet)}</td>
        </tr>
      `,
    )
    .join("");
}

function getLocalRows() {
  try {
    return normalizeRows(JSON.parse(localStorage.getItem(STORAGE_KEYS.localRows) || "[]"));
  } catch {
    return [];
  }
}

function getCachedRows() {
  try {
    return normalizeRows(JSON.parse(localStorage.getItem(STORAGE_KEYS.cachedRows) || "[]"));
  } catch {
    return [];
  }
}

function setCachedRows(rows) {
  localStorage.setItem(STORAGE_KEYS.cachedRows, JSON.stringify(normalizeRows(rows)));
}

function upsertByDate(rows, row) {
  const newRows = [...rows];
  const index = newRows.findIndex((item) => item.date === row.date);
  
  const normalizedRow = normalizeRows([row])[0];
  if (!normalizedRow) return newRows;

  if (index >= 0) newRows[index] = normalizedRow;
  else newRows.push(normalizedRow);
  
  return newRows.sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`));
}

function normalizeRows(rows) {
  return rows
    .filter((row) => row && row.date)
    .map((row) => {
      const normalized = { ...row };
      const hasOnlineTarget = normalized.online_target_count !== undefined && normalized.online_target_count !== "";
      normalized.date = toDateInputText(normalized.date) || String(normalized.date).slice(0, 10);
      normalized.deadline_date = toDateInputText(normalized.deadline_date);

      const numericKeys = [
        "open_online_internet", "open_wholesale_internet",
        "open_online_main_tv", "open_wholesale_main_tv",
        "open_online_extra", "open_wholesale_extra",
        "open_mobile_device", "open_mobile_usim", "main_dongpan_usim",
        "install_online_internet", "install_wholesale_internet",
        "install_online_main_tv", "install_wholesale_main_tv",
        "install_online_extra", "install_wholesale_extra",
        "install_mobile_device", "install_mobile_usim",
        "daily_online_internet", "daily_wholesale_internet",
        "daily_mobile_device", "daily_mobile_usim",
        "internet_open_rate_setting", "tv_open_rate_setting",
        "usim_open_rate_setting", "device_open_rate_setting",
        "target_count", "online_target_count", "target_point"
      ];

      numericKeys.forEach((key) => {
        let val = toNumber(normalized[key]);
        if (["internet_open_rate_setting", "tv_open_rate_setting", "usim_open_rate_setting", "device_open_rate_setting"].includes(key)) {
          if (val > 0 && val <= 1) {
            val = Math.round(val * 100);
          }
        }
        normalized[key] = val;
      });

      if (!hasOnlineTarget) {
        normalized.online_target_count = currentSettings.online_target_count;
      }

      return computeRowMetrics(normalized);
    })
    .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`));
}

function applyTvSplitFallback(row) {
  applyTvChannelFallback(row, "open_online_tv", "open_online_main_tv", "open_online_extra");
  applyTvChannelFallback(row, "open_wholesale_tv", "open_wholesale_main_tv", "open_wholesale_extra");
  applyTvChannelFallback(row, "install_online_tv", "install_online_main_tv", "install_online_extra");
  applyTvChannelFallback(row, "install_wholesale_tv", "install_wholesale_main_tv", "install_wholesale_extra");
}

function applyTvChannelFallback(row, totalKey, mainKey, extraKey) {
  const total = toNumber(row[totalKey]);
  const main = toNumber(row[mainKey]);
  const extra = toNumber(row[extraKey]);
  if (total > 0 && main + extra === 0) {
    row[mainKey] = total;
    row[extraKey] = 0;
  }
}

function getCurrentRateSet() {
  return {
    internetRate: toRate(getInputValue("internetOpenRate") || currentSettings.internet_open_rate),
    tvRate: toRate(getInputValue("tvOpenRate") || currentSettings.tv_open_rate),
    usimRate: toRate(getInputValue("usimOpenRate") || currentSettings.usim_open_rate),
    deviceRate: toRate(getInputValue("deviceOpenRate") || currentSettings.device_open_rate),
  };
}

function computeRowMetrics(raw) {
  const row = { ...raw };

  // Fallback for TV
  if (row.open_online_tv > 0 && row.open_online_main_tv + row.open_online_extra === 0) {
    row.open_online_main_tv = row.open_online_tv;
    row.open_online_extra = 0;
  }
  if (row.open_wholesale_tv > 0 && row.open_wholesale_main_tv + row.open_wholesale_extra === 0) {
    row.open_wholesale_main_tv = row.open_wholesale_tv;
    row.open_wholesale_extra = 0;
  }
  if (row.install_online_tv > 0 && row.install_online_main_tv + row.install_online_extra === 0) {
    row.install_online_main_tv = row.install_online_tv;
    row.install_online_extra = 0;
  }
  if (row.install_wholesale_tv > 0 && row.install_wholesale_main_tv + row.install_wholesale_extra === 0) {
    row.install_wholesale_main_tv = row.install_wholesale_tv;
    row.install_wholesale_extra = 0;
  }

  // Base Sums
  row.open_internet = row.open_online_internet + row.open_wholesale_internet;
  row.open_online_tv = row.open_online_main_tv + row.open_online_extra;
  row.open_wholesale_tv = row.open_wholesale_main_tv + row.open_wholesale_extra;
  row.open_tv = row.open_online_tv + row.open_wholesale_tv;
  row.open_main_tv = row.open_online_main_tv + row.open_wholesale_main_tv;
  row.open_extra_device = row.open_online_extra + row.open_wholesale_extra;
  row.open_mobile_total = row.open_mobile_device + row.open_mobile_usim;

  row.install_internet = row.install_online_internet + row.install_wholesale_internet;
  row.install_online_tv = row.install_online_main_tv + row.install_online_extra;
  row.install_wholesale_tv = row.install_wholesale_main_tv + row.install_wholesale_extra;
  row.install_tv = row.install_online_tv + row.install_wholesale_tv;
  row.install_main_tv = row.install_online_main_tv + row.install_wholesale_main_tv;
  row.install_extra_device = row.install_online_extra + row.install_wholesale_extra;
  row.install_mobile_total = row.install_mobile_device + row.install_mobile_usim;

  row.mobile_total = row.open_mobile_total + row.install_mobile_total;

  // Expected
  const intRate = row.internet_open_rate_setting !== undefined ? toRate(row.internet_open_rate_setting) : toRate(currentSettings.internet_open_rate);
  const tvRate = row.tv_open_rate_setting !== undefined ? toRate(row.tv_open_rate_setting) : toRate(currentSettings.tv_open_rate);
  const usimRate = row.usim_open_rate_setting !== undefined ? toRate(row.usim_open_rate_setting) : toRate(currentSettings.usim_open_rate);
  const devRate = row.device_open_rate_setting !== undefined ? toRate(row.device_open_rate_setting) : toRate(currentSettings.device_open_rate);

  row.expected_online_internet = row.open_online_internet + expectedByRate(row.install_online_internet, intRate);
  row.expected_wholesale_internet = row.open_wholesale_internet + expectedByRate(row.install_wholesale_internet, intRate);
  row.expected_internet = row.expected_online_internet + row.expected_wholesale_internet;

  row.expected_online_main_tv = row.open_online_main_tv + expectedByRate(row.install_online_main_tv, tvRate);
  row.expected_wholesale_main_tv = row.open_wholesale_main_tv + expectedByRate(row.install_wholesale_main_tv, tvRate);
  row.expected_online_extra = row.open_online_extra + expectedByRate(row.install_online_extra, tvRate);
  row.expected_wholesale_extra = row.open_wholesale_extra + expectedByRate(row.install_wholesale_extra, tvRate);

  row.expected_online_tv = row.expected_online_main_tv + row.expected_online_extra;
  row.expected_wholesale_tv = row.expected_wholesale_main_tv + row.expected_wholesale_extra;
  row.expected_main_tv = row.open_main_tv + expectedByRate(row.install_main_tv, tvRate);
  row.expected_extra_device = row.open_extra_device + expectedByRate(row.install_extra_device, tvRate);
  row.expected_tv = row.expected_main_tv + row.expected_extra_device;

  row.expected_mobile_usim = row.open_mobile_usim + expectedByRate(row.install_mobile_usim, usimRate);
  row.expected_mobile_device = row.open_mobile_device + expectedByRate(row.install_mobile_device, devRate);
  row.expected_mobile_total = row.expected_mobile_usim + row.expected_mobile_device;

  // KPIs
  row.remaining_business_days = countBusinessDays(row.date, row.deadline_date);
  row.passed_business_days = countPassedBusinessDays(row.date);
  row.remaining_count = Math.max(row.target_count - row.expected_internet, 0);
  row.open_rate = row.target_count > 0 ? row.expected_internet / row.target_count : 0;
  const requiredInternetInstallations = intRate > 0 ? row.remaining_count / intRate : row.remaining_count;
  row.daily_need = row.remaining_business_days > 0 ? Math.floor(requiredInternetInstallations / row.remaining_business_days) : 0;

  const mobileRemainingCount = Math.max((row.mu_target_count || 0) - row.expected_mobile_total, 0);
  const avgMobileRate = (usimRate + devRate) / 2 || 0.5;
  const requiredMobileInstallations = avgMobileRate > 0 ? mobileRemainingCount / avgMobileRate : mobileRemainingCount;
  row.mobile_daily_need = row.remaining_business_days > 0 ? Math.floor(requiredMobileInstallations / row.remaining_business_days) : 0;

  // Bundle rates
  row.open_bundle_rate = row.open_internet > 0 ? row.open_main_tv / row.open_internet : 0;
  row.open_online_bundle_rate = row.open_online_internet > 0 ? row.open_online_main_tv / row.open_online_internet : 0;
  row.open_wholesale_bundle_rate = row.open_wholesale_internet > 0 ? row.open_wholesale_main_tv / row.open_wholesale_internet : 0;
  
  row.install_bundle_rate = row.install_internet > 0 ? row.install_main_tv / row.install_internet : 0;
  row.install_online_bundle_rate = row.install_online_internet > 0 ? row.install_online_main_tv / row.install_online_internet : 0;
  row.install_wholesale_bundle_rate = row.install_wholesale_internet > 0 ? row.install_wholesale_main_tv / row.install_wholesale_internet : 0;

  // Companion
  row.open_companion_rate = row.expected_internet > 0 ? Math.floor((toNumber(row.main_dongpan_usim) / row.expected_internet) * 100) / 100 : 0;
  row.install_companion_rate = row.expected_internet > 0 ? (row.install_mobile_device + row.install_mobile_usim) / row.expected_internet : 0;

  return row;
}

function applyRowsToDashboard(rows, fromCache) {
  dashboardRows = normalizeRows(rows);
  renderHistory(dashboardRows);
  if (typeof renderCharts === "function") renderCharts(dashboardRows);
  
  const currentDate = document.querySelector("#date").value;
  const loadedRow = dashboardRows.find((item) => item.date === currentDate);
  
  if (loadedRow) {
    applyRowToForm(loadedRow);
  } else {
    const pastRow = findLatestRowBefore(dashboardRows, currentDate);
    if (pastRow) {
      applyRowToForm(pastRow);
      document.querySelector("#date").value = currentDate;
    } else {
      clearDailyInputs();
    }
  }
  
  renderDashboard(getDashboardSummary());
  if (fromCache) showMessage(`${getSelectedMonthLabel()} 월 캐시 데이터를 먼저 표시했습니다.`);
  return loadedRow;
}

function applyRowToForm(row) {
  const fieldMap = {
    date: row.date,
    targetCount: row.target_count,
    onlineTargetCount:
      row.online_target_count || currentSettings.online_target_count,
    muTargetCount:
      row.mu_target_count || currentSettings.mu_target_count,
    targetPoint: row.target_point,
    deadlineDate: row.deadline_date,
    openOnlineInternet: row.open_online_internet,
    openWholesaleInternet: row.open_wholesale_internet,
    openOnlineMainTv: row.open_online_main_tv,
    openWholesaleMainTv: row.open_wholesale_main_tv,
    openOnlineExtra: row.open_online_extra,
    openWholesaleExtra: row.open_wholesale_extra,
    openMobileDevice: row.open_mobile_device,
    openMobileUsim: row.open_mobile_usim,
    mainDongpanUsim: row.main_dongpan_usim,
    installOnlineInternet: row.install_online_internet,
    installWholesaleInternet: row.install_wholesale_internet,
    installOnlineMainTv: row.install_online_main_tv,
    installWholesaleMainTv: row.install_wholesale_main_tv,
    installOnlineExtra: row.install_online_extra,
    installWholesaleExtra: row.install_wholesale_extra,
    installMobileDevice: row.install_mobile_device,
    installMobileUsim: row.install_mobile_usim,
    dailyOnlineInternet: row.daily_online_internet,
    dailyWholesaleInternet: row.daily_wholesale_internet,
    dailyMobileDevice: row.daily_mobile_device,
    dailyMobileUsim: row.daily_mobile_usim,
  };

  Object.entries(fieldMap).forEach(([id, value]) => {
    setInputValue(id, value);
  });

  setSavedRateSettingValue("internetOpenRate", row.internet_open_rate_setting);
  setSavedRateSettingValue("tvOpenRate", row.tv_open_rate_setting);
  setSavedRateSettingValue("usimOpenRate", row.usim_open_rate_setting);
  setSavedRateSettingValue("deviceOpenRate", row.device_open_rate_setting);
}
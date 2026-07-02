function setText(selector, value) {
  const element = document.querySelector(selector);
  if (!element) return;
  element.textContent = value;
  applyMetricValueSizing(element);
}

function setHtml(selector, value) {
  const element = document.querySelector(selector);
  if (!element) return;
  element.innerHTML = value;
  applyMetricValueSizing(element);
}

function setInputValue(id, value) {
  const element = document.querySelector(`#${id}`);
  if (!element || value === undefined || value === null || value === "") return;

  if (element.type === "date") {
    const dateValue = toDateInputText(value);
    if (!dateValue) return;
    element.value = dateValue;
    return;
  }

  element.value = value;
}

function getInputValue(id) {
  return document.querySelector(`#${id}`)?.value ?? "";
}

// Could not find getCheckedValue

// Could not find setCheckedValue

function setDefaultValue(id, value) {
  const element = document.querySelector(`#${id}`);
  if (!element || element.value) return;
  if (element.type === "date") {
    const dateValue = toDateInputText(value);
    if (!dateValue) return;
    element.value = dateValue;
    return;
  }
  element.value = value;
}

function setRateSettingValue(id, value, fallback) {
  const element = document.querySelector(`#${id}`);
  if (!element) return;
  if (value !== undefined && value !== "") {
    element.value = toPercentValue(value);
    return;
  }
  if (!element.value) {
    element.value = fallback;
  }
}

function setSavedRateSettingValue(id, value) {
  if (toNumber(value) <= 0) return;
  setRateSettingValue(id, value, getInputValue(id));
}

let messageTimeout = null;
function showMessage(text, type = "info") {
  if (!message) return;
  if (message.innerHTML && messageTimeout) {
    message.innerHTML += `<br/>${text}`;
  } else {
    message.innerHTML = text;
  }
  message.classList.remove("message--success", "message--error");
  if (type === "success") message.classList.add("message--success");
  if (type === "error") message.classList.add("message--error");

  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    message.innerHTML = '';
    message.classList.remove("message--success", "message--error");
    messageTimeout = null;
  }, 7000);
}

function clearDailyInputs() {
  fieldIds
    .filter((id) => id !== "date" && !isSettingsField(id))
    .forEach((id) => {
      setInputValue(id, 0);
    });
}

function isSettingsField(id) {
  return [
    "targetCount",
    "onlineTargetCount",
    "muTargetCount",
    "targetPoint",
    "deadlineDate",
    "internetOpenRate",
    "tvOpenRate",
    "usimOpenRate",
    "deviceOpenRate",
  ].includes(id);
}

function renderDeadlineMonthTarget() {
  const el = document.querySelector("#deadlineMonthTarget");
  if (!el) return;
  const month = getSelectedMonthLabel();
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) {
    el.textContent = "보고 월별로 저장됩니다";
    return;
  }
  const [year, mon] = month.split("-");
  el.textContent = `현재 ${year}년 ${Number(mon)}월 마감일로 저장됩니다`;
}

function getDeadlineDDayLabel(deadlineValue, todayValue) {
  const deadline = new Date(`${deadlineValue}T00:00:00`);
  const today = new Date(`${todayValue}T00:00:00`);
  if (Number.isNaN(deadline.getTime()) || Number.isNaN(today.getTime())) return "";
  const diffDays = Math.round((deadline - today) / 86400000);
  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return "D-Day";
  return "마감";
}

function renderDeadlineManager() {
  const list = document.querySelector("#deadlineManagerList");
  if (!list) return;
  const deadlines = parseMonthlyDeadlines(currentSettings.monthly_deadlines);
  const months = Object.keys(deadlines).sort().reverse();

  if (!months.length) {
    list.innerHTML = '<li class="deadline-manager-empty">저장된 월별 마감일이 없습니다.</li>';
    return;
  }

  const todayValue = toDateInputValue(new Date());

  list.innerHTML = months
    .map((month) => {
      const [year, mon] = month.split("-");
      const deadlineValue = deadlines[month] || "";
      const dDay = deadlineValue ? getDeadlineDDayLabel(deadlineValue, todayValue) : "";
      return `
        <li data-month="${escapeHtml(month)}">
          <span class="deadline-manager-month">${escapeHtml(year)}년 ${Number(mon)}월</span>
          <input type="date" value="${escapeHtml(deadlineValue)}" data-role="deadline-manager-input" />
          ${dDay ? `<span class="deadline-manager-dday${dDay === "마감" ? " is-past" : ""}">${escapeHtml(dDay)}</span>` : ""}
          <button type="button" data-role="deadline-manager-delete">삭제</button>
        </li>
      `;
    })
    .join("");
}

function openTiersModal() {
  const overlay = document.getElementById("tiersModalOverlay");
  if (!overlay) return;
  overlay.classList.add("show");
  renderTiersModal();
}

function closeTiersModal() {
  const overlay = document.getElementById("tiersModalOverlay");
  if (overlay) overlay.classList.remove("show");
}

function renderTiersModal() {
  let tvmuTiers = [];
  let muTiers = [];
  if (window.KTGoal) {
    tvmuTiers = window.KTGoal.TVMU_TIERS || [];
    muTiers = window.KTGoal.MU_TIERS || [];
  }

  const tvmuBody = document.getElementById("tvmuTiersBody");
  const muBody = document.getElementById("muTiersBody");

  if (tvmuBody) {
    tvmuBody.innerHTML = "";
    tvmuTiers.forEach(t => tvmuBody.appendChild(buildTierRow("tvmu", t.point, t.payment)));
  }

  if (muBody) {
    muBody.innerHTML = "";
    muTiers.forEach(t => muBody.appendChild(buildTierRow("mu", t.count, t.payment)));
  }
}

function addTierRow(type) {
  const tbody = document.getElementById(`${type}TiersBody`);
  if (tbody) {
    tbody.appendChild(buildTierRow(type, "", ""));
  }
}

function buildTierRow(type, criteriaValue, paymentValue) {
  const tr = document.createElement("tr");
  const isTvmu = type === "tvmu";
  const criteriaClass = isTvmu ? "tvmu-criteria" : "mu-criteria";
  const placeholder = isTvmu ? "Point" : "건수";
  
  tr.innerHTML = `
    <td><input type="number" class="${criteriaClass}" value="${criteriaValue !== undefined ? criteriaValue : ''}" placeholder="${placeholder}" /></td>
    <td><input type="number" class="${type}-payment" value="${paymentValue !== undefined ? paymentValue : ''}" placeholder="지급금액" /></td>
    <td style="text-align:center;"><button type="button" class="remove-tier-btn" onclick="removeTierRow(this)" style="padding:4px 8px; font-size:12px;">삭제</button></td>
  `;
  return tr;
}

function removeTierRow(btn) {
  const tr = btn.closest("tr");
  if (!tr) return;
  const inputs = tr.querySelectorAll("input");
  const hasValue = Array.from(inputs).some((input) => String(input.value || "").trim() !== "");
  if (hasValue && !window.confirm("이 구간을 삭제할까요?")) return;
  tr.remove();
}

async function applyTiersFromModal() {
  const tvmuRows = Array.from(document.querySelectorAll("#tvmuTiersBody tr"));
  const tvmuParsed = tvmuRows.map(tr => {
    const p = parseFloat(tr.querySelector(".tvmu-criteria").value);
    const pay = parseFloat(tr.querySelector(".tvmu-payment").value);
    return { point: isNaN(p) ? 0 : p, payment: isNaN(pay) ? 0 : pay };
  });
  const newTvmu = tvmuParsed.filter(t => t.point > 0).sort((a, b) => a.point - b.point);

  const muRows = Array.from(document.querySelectorAll("#muTiersBody tr"));
  const muParsed = muRows.map(tr => {
    const c = parseFloat(tr.querySelector(".mu-criteria").value);
    const pay = parseFloat(tr.querySelector(".mu-payment").value);
    return { count: isNaN(c) ? 0 : c, payment: isNaN(pay) ? 0 : pay };
  });
  const newMu = muParsed.filter(t => t.count > 0).sort((a, b) => a.count - b.count);

  const droppedCount = (tvmuParsed.length - newTvmu.length) + (muParsed.length - newMu.length);
  if (droppedCount > 0) {
    showMessage(`Point/건수가 0 이하이거나 비어있는 구간 ${droppedCount}개는 저장되지 않았습니다.`, "error");
  }

  if (window.KTGoal && window.KTGoal.setTiers) {
    window.KTGoal.setTiers(newTvmu, newMu);
  }
  
  currentSettings.tvmu_tiers = newTvmu;
  currentSettings.mu_tiers = newMu;
  
  if (typeof renderDashboard === "function" && typeof getDashboardSummary === "function") {
    renderDashboard(getDashboardSummary());
  }
  closeTiersModal();
  if (typeof saveSettings === "function") {
    await saveSettings();
  }
}

async function resetTiersToDefault() {
  if (confirm("기본 구간값으로 초기화하고 페이지를 새로고침합니다. 계속할까요?")) {
    currentSettings.tvmu_tiers = "";
    currentSettings.mu_tiers = "";
    if (typeof saveSettings === "function") {
      await saveSettings();
    }
    closeTiersModal();
    window.location.reload();
  }
}

function applySettings(settings) {
  const monthlyDeadlines = parseMonthlyDeadlines(settings.monthly_deadlines || currentSettings.monthly_deadlines);
  const reportMonth = getSelectedMonthLabel();
  const deadlineDate = getDeadlineForMonth(reportMonth, {
    ...currentSettings,
    ...settings,
    monthly_deadlines: monthlyDeadlines,
  });
  currentSettings = {
    target_count: toNumber(settings.target_count || currentSettings.target_count),
    online_target_count: toNumber(
      settings.online_target_count || currentSettings.online_target_count,
    ),
    mu_target_count: toNumber(
      settings.mu_target_count || currentSettings.mu_target_count,
    ),
    target_point: toNumber(settings.target_point || currentSettings.target_point),
    deadline_date: deadlineDate,
    monthly_deadlines: monthlyDeadlines,
    internet_open_rate: toPercentValue(
      settings.internet_open_rate !== undefined && settings.internet_open_rate !== "" ? settings.internet_open_rate : currentSettings.internet_open_rate,
    ),
    tv_open_rate: toPercentValue(
      settings.tv_open_rate !== undefined && settings.tv_open_rate !== "" ? settings.tv_open_rate : currentSettings.tv_open_rate,
    ),
    usim_open_rate: toPercentValue(
      settings.usim_open_rate !== undefined && settings.usim_open_rate !== "" ? settings.usim_open_rate : currentSettings.usim_open_rate,
    ),
    device_open_rate: toPercentValue(
      settings.device_open_rate !== undefined && settings.device_open_rate !== "" ? settings.device_open_rate : currentSettings.device_open_rate,
    ),
    tvmu_tiers: settings.tvmu_tiers || currentSettings.tvmu_tiers,
    mu_tiers: settings.mu_tiers || currentSettings.mu_tiers,
  };

  let parsedTvmu = [];
  let parsedMu = [];
  try {
    if (settings.tvmu_tiers) parsedTvmu = typeof settings.tvmu_tiers === 'string' ? parseTiers(settings.tvmu_tiers, false) : settings.tvmu_tiers;
  } catch (e) {}
  try {
    if (settings.mu_tiers) parsedMu = typeof settings.mu_tiers === 'string' ? parseTiers(settings.mu_tiers, true) : settings.mu_tiers;
  } catch (e) {}

  if (window.KTGoal && window.KTGoal.setTiers) {
    window.KTGoal.setTiers(parsedTvmu, parsedMu);
  }

  if (settings.target_count !== undefined && settings.target_count !== "") {
    setInputValue("targetCount", toNumber(settings.target_count));
  }
  if (settings.online_target_count !== undefined && settings.online_target_count !== "") {
    setInputValue("onlineTargetCount", toNumber(settings.online_target_count));
  }
  if (settings.mu_target_count !== undefined && settings.mu_target_count !== "") {
    setInputValue("muTargetCount", toNumber(settings.mu_target_count));
  }
  if (settings.target_point !== undefined && settings.target_point !== "") {
    setInputValue("targetPoint", toNumber(settings.target_point));
  }
  if (deadlineDate) {
    setInputValue("deadlineDate", deadlineDate);
  }
  setRateSettingValue("internetOpenRate", settings.internet_open_rate, 75);
  setRateSettingValue("tvOpenRate", settings.tv_open_rate, 75);
  setRateSettingValue("usimOpenRate", settings.usim_open_rate, 50);
  setRateSettingValue("deviceOpenRate", settings.device_open_rate, 50);

  renderDeadlineMonthTarget();
  renderDeadlineManager();
}

function syncDeadlineDateForReportMonth() {
  const reportMonth = getSelectedMonthLabel();
  const deadlineDate = getDeadlineForMonth(reportMonth);
  if (deadlineDate) setInputValue("deadlineDate", deadlineDate);
  renderDeadlineMonthTarget();
  renderDashboard(getDashboardSummary());
}

function setConnectionState(connected) {
  if (typeof connectionDot === 'undefined' || typeof connectionText === 'undefined') return;
  if (!connectionDot || !connectionText) return;
  connectionDot.classList.toggle("connected", connected);
  connectionText.textContent = connected ? "Google Sheets 연동됨" : "로컬 모드";
}

function applyMetricValueSizing(element) {
  if (!element.matches(".metric-breakdown dd")) return;
  const length = element.textContent.replace(/\s/g, "").length;
  element.classList.toggle("metric-number-long", length >= 5 && length < 8);
  element.classList.toggle("metric-number-xlong", length >= 8);
}

function getApiUrl() {
  return String(APP_CONFIG.apiUrl || "").trim();
}

function requestScript(action, params = {}) {
  const callbackName = `ktDashboardCallback_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
  const url = new URL(getApiUrl());
  url.searchParams.set("action", action);
  url.searchParams.set("callback", callbackName);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets 응답 시간이 초과되었습니다."));
    }, Number(APP_CONFIG.requestTimeoutMs) || 15000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Google Sheets Web App을 불러오지 못했습니다. 배포 권한을 확인하세요."));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function formatScriptError(error) {
  if (String(error.message).includes("Unknown action")) {
    return "Apps Script에 최신 Code.gs를 붙여넣고 새 버전으로 다시 배포해야 합니다.";
  }
  return error.message;
}

async function saveRow(row) {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    const rows = getLocalRows();
    const nextRows = upsertByDate(rows, row);
    localStorage.setItem(STORAGE_KEYS.localRows, JSON.stringify(nextRows));
    return row;
  }

  const data = await requestScript("upsert", { row: JSON.stringify(row) });
  if (!data.ok) throw new Error(data.error || "Google Sheets 응답 오류");
  setCachedRows(upsertByDate(getCachedRows(), row));
  return data.row;
}

async function fetchRows() {
  const apiUrl = getApiUrl();
  if (!apiUrl) return getLocalRows();

  const data = await requestScript("list", { month: getSelectedMonthLabel() });
  if (!data.ok) throw new Error(data.error || "Google Sheets 응답 오류");
  return normalizeRows(data.rows || []);
}

async function loadSettings() {
  try {
    const data = await requestScript("settings");
    if (!data.ok) throw new Error(data.error || "설정 조회 오류");
    applySettings(data.settings || {});
    renderDashboard(getDashboardSummary());
  } catch (error) {
    showMessage(`설정 조회 실패: ${formatScriptError(error)}`);
  }
}

async function saveSettings() {
  const settings = {
    target_count: toNumber(getInputValue("targetCount") || currentSettings.target_count),
    online_target_count: toNumber(
      getInputValue("onlineTargetCount") || currentSettings.online_target_count,
    ),
    mu_target_count: toNumber(
      getInputValue("muTargetCount") || currentSettings.mu_target_count,
    ),
    target_point: toNumber(getInputValue("targetPoint") || currentSettings.target_point),
    deadline_date: getInputValue("deadlineDate") || currentSettings.deadline_date,
    internet_open_rate: toNumber(getInputValue("internetOpenRate") || currentSettings.internet_open_rate),
    tv_open_rate: toNumber(getInputValue("tvOpenRate") || currentSettings.tv_open_rate),
    usim_open_rate: toNumber(getInputValue("usimOpenRate") || currentSettings.usim_open_rate),
    device_open_rate: toNumber(getInputValue("deviceOpenRate") || currentSettings.device_open_rate),
    updated_at: new Date().toISOString(),
    tvmu_tiers: typeof currentSettings.tvmu_tiers === 'string' ? currentSettings.tvmu_tiers : compressTiers(currentSettings.tvmu_tiers, false),
    mu_tiers: typeof currentSettings.mu_tiers === 'string' ? currentSettings.mu_tiers : compressTiers(currentSettings.mu_tiers, true),
  };

  try {
    const data = await requestScript("saveSettings", {
      settings: JSON.stringify(settings),
    });
    if (!data.ok) throw new Error(data.error || "설정 저장 오류");
    applySettings(data.settings || settings);
    dashboardRows = normalizeRows(dashboardRows);
    setCachedRows(dashboardRows);
    renderHistory(dashboardRows);
    renderDashboard(getDashboardSummary());
    showMessage("설정이 Google Sheets에 저장되었습니다.");
  } catch (error) {
    showMessage(`설정 저장 오류: ${formatScriptError(error)}`);
  }
}
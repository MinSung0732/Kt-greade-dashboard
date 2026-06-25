const fieldIds = [
  "date",
  "targetCount",
  "onlineTargetCount",
  "muTargetCount",
  "targetPoint",
  "deadlineDate",
  "internetOpenRate",
  "tvOpenRate",
  "usimOpenRate",
  "deviceOpenRate",
  "openOnlineInternet",
  "openWholesaleInternet",
  "openOnlineMainTv",
  "openWholesaleMainTv",
  "openOnlineExtra",
  "openWholesaleExtra",
  "openMobileDevice",
  "openMobileUsim",
  "mainDongpanUsim",
  "installOnlineInternet",
  "installWholesaleInternet",
  "installOnlineMainTv",
  "installWholesaleMainTv",
  "installOnlineExtra",
  "installWholesaleExtra",
  "installMobileDevice",
  "installMobileUsim",
  "dailyOnlineInternet",
  "dailyWholesaleInternet",
  "dailyMobileDevice",
  "dailyMobileUsim",
];

const form = document.querySelector("#dashboardForm");

const message = document.querySelector("#message");

const historyBody = document.querySelector("#historyBody");

const connectionDot = document.querySelector("#connectionDot");

const connectionText = document.querySelector("#connectionText");

let dashboardRows = [];

let chartInstances = {};

const debouncedRenderDashboard = debounce(() => {
  updateMatrixTotals();
  renderDashboard(getDashboardSummary());
}, 150);

let currentSettings = {
  target_count: 1375,
  online_target_count: 500,
  mu_target_count: 600,
  target_point: 0,
  deadline_date: "",
  internet_open_rate: 75,
  tv_open_rate: 75,
  usim_open_rate: 50,
  device_open_rate: 50,
  tvmu_tiers: "",
  mu_tiers: "",
};

document.addEventListener("DOMContentLoaded", () => {
  setDefaultValue("date", toDateInputValue(new Date()));
  setDefaultValue("reportMonth", getMonthKey(toDateInputValue(new Date())));
  setDefaultValue("targetCount", 1375);
  setDefaultValue("onlineTargetCount", 500);
  setDefaultValue("muTargetCount", 600);
  setDefaultValue("targetPoint", 0);
  setDefaultValue("deadlineDate", getDefaultDeadlineDate(new Date()));
  setDefaultValue("internetOpenRate", 75);
  setDefaultValue("tvOpenRate", 75);
  setDefaultValue("usimOpenRate", 50);
  setDefaultValue("deviceOpenRate", 50);
  setConnectionState(Boolean(getApiUrl()));
  bindEvents();
  renderDashboard(getDashboardSummary());
  window.setTimeout(loadInitialData, 200);
  initExcelUpload();
});

function bindEvents() {
  form?.addEventListener("input", (event) => {
    debouncedRenderDashboard();
  });
  document.querySelector("#date")?.addEventListener("change", () => {
    const currentDate = document.querySelector("#date").value;
    const row = dashboardRows.find((item) => item.date === currentDate);
    if (row) {
      applyRowToForm(row);
    } else {
      const pastRow = findLatestRowBefore(dashboardRows, currentDate);
      if (pastRow) {
        applyRowToForm(pastRow);
        document.querySelector("#date").value = currentDate;
      } else {
        clearDailyInputs();
      }
    }
    debouncedRenderDashboard();
  });
  document.querySelector("#reportMonth")?.addEventListener("change", async () => {
    const reportMonth = document.querySelector("#reportMonth").value;
    const dateInput = document.querySelector("#date");
    if (dateInput && reportMonth) {
      const currentDateMonth = dateInput.value.slice(0, 7);
      if (currentDateMonth !== reportMonth) {
        const today = new Date();
        const todayStr = toDateInputValue(today);
        if (getMonthKey(todayStr) === reportMonth) {
          dateInput.value = todayStr;
        } else {
          const [year, month] = reportMonth.split("-").map(Number);
          const lastDay = new Date(year, month, 0);
          dateInput.value = toDateInputValue(lastDay);
        }
      }
    }
    await loadRecentRows();
  });
  document.querySelector("#targetCount")?.addEventListener("input", debouncedRenderDashboard);
  document.querySelector("#onlineTargetCount")?.addEventListener("input", debouncedRenderDashboard);
  document.querySelector("#muTargetCount")?.addEventListener("input", debouncedRenderDashboard);
  document.querySelector("#targetPoint")?.addEventListener("input", debouncedRenderDashboard);
  document.querySelector("#deadlineDate")?.addEventListener("input", debouncedRenderDashboard);
  document.querySelector("#internetOpenRate")?.addEventListener("input", debouncedRenderDashboard);
  document.querySelector("#tvOpenRate")?.addEventListener("input", debouncedRenderDashboard);
  document.querySelector("#usimOpenRate")?.addEventListener("input", debouncedRenderDashboard);
  document.querySelector("#deviceOpenRate")?.addEventListener("input", debouncedRenderDashboard);
  document.querySelector("#saveSettingsBtn")?.addEventListener("click", saveSettings);
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveCurrentRow();
  });

  document.querySelector("#compareBtn")?.addEventListener("click", compareWithPreviousDay);
  document.querySelector("#resetBtn")?.addEventListener("click", resetForm);
  document.querySelector("#downloadReportBtn")?.addEventListener("click", downloadDashboardReport);

  // Tiers Modal Events
  document.querySelector("#openTiersModalBtn")?.addEventListener("click", openTiersModal);
  document.querySelector("#closeTiersModalBtn")?.addEventListener("click", closeTiersModal);
  document.querySelector("#cancelTiersBtn")?.addEventListener("click", closeTiersModal);
  document.querySelector("#applyTiersBtn")?.addEventListener("click", applyTiersFromModal);
  document.querySelector("#resetTiersBtn")?.addEventListener("click", resetTiersToDefault);
  document.querySelector("#addTvmuTierBtn")?.addEventListener("click", () => addTierRow("tvmu"));
  document.querySelector("#addMuTierBtn")?.addEventListener("click", () => addTierRow("mu"));

  document.querySelector("#chartStartDate")?.addEventListener("change", () => {
    if (typeof renderCharts === "function") renderCharts(dashboardRows);
  });
  document.querySelector("#chartEndDate")?.addEventListener("change", () => {
    if (typeof renderCharts === "function") renderCharts(dashboardRows);
  });

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEYS.settings) {
      try {
        const cachedSettings = JSON.parse(e.newValue || "{}");
        if (Object.keys(cachedSettings).length > 0) {
          if (typeof applySettings === "function") applySettings(cachedSettings);
          debouncedRenderDashboard();
        }
      } catch (err) {}
    } else if (e.key === STORAGE_KEYS.cachedRows || e.key === STORAGE_KEYS.localRows) {
      loadRecentRows();
    }
  });
}

async function downloadDashboardReport() {
  const button = document.querySelector("#downloadReportBtn");
  if (!window.KTReportExporter) {
    showMessage("엑셀 생성 모듈을 불러오지 못했습니다. 인터넷 연결을 확인하세요.");
    return;
  }

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "보고서 생성 중...";
    }
    const currentRow = readForm();
    const rowsWithCurrent = form ? upsertByDate(dashboardRows, currentRow) : dashboardRows;
    const selectedDate = getInputValue("date");
    const summary = summarizeMonthlyRows(rowsWithCurrent, currentRow, getSelectedMonthLabel());

    await window.KTReportExporter.download({
      summary,
      rows: rowsWithCurrent,
      selectedDate,
      reportMonth: getSelectedMonthLabel(),
      settings: typeof currentSettings !== "undefined" ? currentSettings : {},
    });
    showMessage("엑셀 보고서를 다운로드했습니다.");
  } catch (error) {
    showMessage(`보고서 생성 실패: ${error.message}`);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "엑셀 보고서 다운로드";
    }
  }
}

async function saveCurrentRow() {
  return saveCurrentRowWithOptions();
}

async function saveCurrentRowWithOptions({ silent = false, reload = true } = {}) {
  const row = {
    ...readForm(),
    created_at: new Date().toISOString(),
  };

  if (!row.date) {
    if (!silent) showMessage("날짜를 입력하세요.");
    return false;
  }

  try {
    await saveRow(row);
    dashboardRows = upsertByDate(dashboardRows, row);
    renderDashboard(getDashboardSummary());
    if (!silent) showMessage("저장되었습니다.");
    if (reload) await loadRecentRows();
    return true;
  } catch (error) {
    showMessage(`${silent ? "자동 저장" : "저장"} 실패: ${error.message}`);
    return false;
  }
}

async function loadInitialData() {
  try {
    const cachedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
    if (Object.keys(cachedSettings).length > 0) applySettings(cachedSettings);
  } catch (e) {}

  await Promise.all([
    loadSettings(),
    loadRecentRows()
  ]);
}

async function loadRecentRows() {
  try {
    const cachedRows = getCachedRows();
    if (cachedRows.length) {
      applyRowsToDashboard(cachedRows, true);
    }

    const rows = await fetchRows();
    setCachedRows(rows);
    const loadedRow = applyRowsToDashboard(rows, false);

    if (!dashboardRows.length) {
      showMessage("저장된 기록이 없습니다.");
    } else if (loadedRow) {
      showMessage(`${loadedRow.date} 입력값과 ${getSelectedMonthLabel()} 월 누적 합계를 불러왔습니다.`);
    } else {
      showMessage(`${getSelectedMonthLabel()} 월 누적 합계를 대시보드에 반영했습니다.`);
    }
    return rows;
  } catch (error) {
    showMessage(`조회 실패: ${error.message}`);
    return [];
  }
}

async function compareWithPreviousDay() {
  const current = readForm();
  const rows = await fetchRows();
  const previous = findPreviousRow(rows, current.date);

  if (!previous) {
    renderDashboard(current);
    showMessage("비교할 전날 데이터 없음");
    return;
  }

  renderDashboard(current, previous);
  showMessage(`${previous.date} 데이터와 비교했습니다.`);
}

async function resetForm() {
  form.reset();
  document.querySelector("#date").value = toDateInputValue(new Date());
  clearDailyInputs();
  await loadSettings();
  renderDashboard(getDashboardSummary());
  showMessage("초기화되었습니다.");
}
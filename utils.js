const STORAGE_KEYS = {
  localRows: "kt-dashboard-local-rows",
  cachedRows: "kt-dashboard-cached-rows",
  settings: "kt-dashboard-settings",
};

const APP_CONFIG = window.KT_DASHBOARD_CONFIG || {};

const KOREA_HOLIDAYS = new Set([
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-03-01",
  "2026-03-02",
  "2026-05-05",
  "2026-05-24",
  "2026-05-25",
  "2026-06-03",
  "2026-06-06",
  "2026-08-15",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
  "2026-10-03",
  "2026-10-09",
  "2026-12-25",
]);

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toRate(value) {
  return Math.min(Math.max(toNumber(value), 0), 100) / 100;
}

function expectedByRate(count, rate) {
  return Math.floor(toNumber(count) * toNumber(rate));
}

function toPercentValue(value) {
  const number = toNumber(value);
  if (number > 0 && number <= 1) return Math.round(number * 100);
  return Math.round(number);
}

function formatNumber(value) {
  return Math.round(toNumber(value)).toLocaleString("ko-KR");
}

function formatPercent(value) {
  return `${(toNumber(value) * 100).toFixed(1)}%`;
}

function formatTvBreakdown(total, mainTv, extraDevice) {
  return `${formatNumber(total)}<span class="metric-subvalue">(${formatNumber(mainTv)}+${formatNumber(extraDevice)})</span>`;
}

function toDateInputValue(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function toDateInputText(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toDateInputValue(value);
  }
  const rawText = String(value);
  if (rawText.includes("T")) {
    const date = new Date(rawText);
    if (!Number.isNaN(date.getTime())) return toDateInputValue(date);
  }
  const text = rawText.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMonthKey(dateText) {
  return String(dateText || "").slice(0, 7);
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDefaultDeadlineDate(date) {
  return toDateInputValue(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

// Could not find parseBusinessDays

// Could not find getBusinessDaysInMonth

// Could not find getBusinessDaysElapsed

function formatBusinessDayStatus(row) {
  const selectedMonth = getMonthKey(getInputValue("date"));
  const deadlineMonth = getMonthKey(row.deadline_date);

  if (!selectedMonth || !deadlineMonth) {
    return `${formatNumber(row.remaining_business_days)}일`;
  }

  if (selectedMonth < deadlineMonth) return "영업마감";
  if (selectedMonth > deadlineMonth) return "영업예정";
  if (row.remaining_business_days <= 0) return "영업마감";
  return `${formatNumber(row.remaining_business_days)}일`;
}

function findLatestRowBefore(rows, currentDate) {
  const pastRows = rows.filter((r) => r.date < currentDate);
  if (!pastRows.length) return null;
  return pastRows.reduce((latest, current) => current.date > latest.date ? current : latest);
}

function findPreviousRow(rows, currentDate) {
  return findLatestRowBefore(rows, currentDate);
}

function compressTiers(tiers, isMu) {
  if (!Array.isArray(tiers)) return "";
  return tiers.map(t => isMu ? `${t.count}:${t.payment}` : `${t.point}:${t.payment}`).join(",");
}

function parseTiers(str, isMu) {
  if (!str) return [];
  if (typeof str !== 'string') return str;
  if (str.startsWith("[")) {
    try { return JSON.parse(str); } catch (e) { return []; }
  }
  return str.split(",").filter(s => s.trim()).map(pair => {
    const [c, p] = pair.split(":");
    return isMu ? { count: parseFloat(c), payment: parseFloat(p) } : { point: parseFloat(c), payment: parseFloat(p) };
  }).filter(t => !isNaN(t.payment));
}
function countBusinessDays(startDateText, endDateText) {
  if (!startDateText || !endDateText) return 0;

  const startDate = parseDate(startDateText);
  const endDate = parseDate(endDateText);
  if (!startDate || !endDate || startDate > endDate) return 0;

  let count = 0;
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const day = cursor.getDay();
    const dateText = toDateInputValue(cursor);
    if (day !== 0 && day !== 6 && !KOREA_HOLIDAYS.has(dateText)) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function countPassedBusinessDays(dateText) {
  if (!dateText) return 0;
  const date = parseDate(dateText);
  if (!date) return 0;
  
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDay = new Date(date);
  endDay.setDate(endDay.getDate() - 1); 

  if (firstDay > endDay) return 0;

  return countBusinessDays(toDateInputValue(firstDay), toDateInputValue(endDay));
}

function getSelectedMonthLabel() {
  const monthInput = document.querySelector("#reportMonth");
  if (monthInput && monthInput.value) {
    return monthInput.value;
  }
  return getMonthKey(toDateInputValue(new Date()));
}

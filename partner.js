document.addEventListener("DOMContentLoaded", () => {
  initInputs();
  initConnectionState();
  bindEvents();
  loadAndRenderData();
  setTimeout(updateSliderPosition, 100); // 렌더링 지연 대응
  window.addEventListener("resize", updateSliderPosition);
});

const PARTNER_STORAGE_KEY = 'kt-dashboard-partner-rows';

// 상태 값
let filterState = {
  category: 'internet', // 'internet' | 'usim'
  period: 'monthly',    // 'daily' | 'weekly' | 'monthly'
  date: '',             // 'YYYY-MM-DD'
  reportMonth: '',      // 'YYYY-MM'
  compareMonth: ''      // 'YYYY-MM'
};

let currentFilteredList = [];
let currentLabels = { currentLabel: '이번달', prevLabel: '지난달' };

function initInputs() {
  const now = new Date();
  const dateInput = document.getElementById("date");
  const reportMonthInput = document.getElementById("reportMonth");
  const compareMonthInput = document.getElementById("compareMonth");

  // 조회 기준일 기본값: 오늘
  const todayStr = getFormatDate(now);
  if (dateInput) {
    dateInput.value = todayStr;
    filterState.date = todayStr;
  }

  // 보고 월 & 비교 월 기본값
  const currentMonthStr = todayStr.slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = getFormatDate(lastMonthDate).slice(0, 7);

  if (reportMonthInput) {
    reportMonthInput.value = currentMonthStr;
    filterState.reportMonth = currentMonthStr;
  }
  if (compareMonthInput) {
    compareMonthInput.value = lastMonthStr;
    filterState.compareMonth = lastMonthStr;
  }
}

function getFormatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function initConnectionState() {
  const connectionDot = document.getElementById("connectionDot");
  const connectionText = document.getElementById("connectionText");
  const hasApi = Boolean(window.KT_DASHBOARD_CONFIG?.apiUrl);

  if (connectionDot && connectionText) {
    connectionDot.classList.toggle("connected", hasApi);
    connectionText.textContent = hasApi ? "Google Sheets 연동됨" : "로컬 모드";
  }
}

function bindEvents() {
  // 상단 입력 폼 변경 이벤트
  document.getElementById("reportMonth")?.addEventListener("change", (e) => {
    filterState.reportMonth = e.target.value;
    loadAndRenderData();
  });
  document.getElementById("compareMonth")?.addEventListener("change", (e) => {
    filterState.compareMonth = e.target.value;
    loadAndRenderData();
  });
  document.getElementById("date")?.addEventListener("change", (e) => {
    filterState.date = e.target.value;
    // 기준일 변경 시 보고 월도 자동으로 연동
    const reportMonthInput = document.getElementById("reportMonth");
    if (reportMonthInput && e.target.value) {
      const monthVal = e.target.value.slice(0, 7);
      reportMonthInput.value = monthVal;
      filterState.reportMonth = monthVal;
    }
    loadAndRenderData();
  });

  // 검색 필터 이벤트
  document.getElementById("partnerSearchInput")?.addEventListener("input", filterTable);

  // 분류 탭 (인터넷 / 유심)
  const categoryButtons = document.querySelectorAll("#categoryTab button");
  categoryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      categoryButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterState.category = btn.getAttribute("data-value");
      loadAndRenderData();
      updateSliderPosition(); // 슬라이더 위치 즉시 이동
    });
  });

  // 비교 기준 탭 (일간 / 주간 / 월간)
  const periodButtons = document.querySelectorAll("#periodTab button");
  periodButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      periodButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterState.period = btn.getAttribute("data-value");
      loadAndRenderData();
    });
  });

  // 다운로드 버튼 이벤트
  document.getElementById("downloadExcelBtn")?.addEventListener("click", downloadExcel);
  document.getElementById("downloadImageBtn")?.addEventListener("click", downloadImage);
}

async function loadAndRenderData() {
  // 1. 데이터 가져오기 (Google Sheets API 우선 조회, 실패 시 localStorage 백업)
  let rawList = [];
  try {
    if (typeof fetchRows === "function" && window.KT_DASHBOARD_CONFIG?.apiUrl) {
      const rows = await fetchRows();
      rawList = rows.map(r => ({
        date: r.date,
        partners: r.partner_data ? (typeof r.partner_data === 'string' ? JSON.parse(r.partner_data) : r.partner_data) : {}
      })).filter(item => item.partners && Object.keys(item.partners).length > 0);
      
      // 로컬 스토리지도 함께 동기화
      if (rawList.length > 0) {
        localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(rawList));
      }
    } else {
      rawList = JSON.parse(localStorage.getItem(PARTNER_STORAGE_KEY) || '[]');
    }
  } catch (e) {
    console.error("데이터 로딩 실패 (API 조회 실패, 로컬 백업 로드)", e);
    try {
      rawList = JSON.parse(localStorage.getItem(PARTNER_STORAGE_KEY) || '[]');
    } catch (err) {}
  }

  // 2. 분류 및 비교 기준 기간 계산
  const { currentStart, currentEnd, prevStart, prevEnd, currentLabel, prevLabel } = getPeriodRanges();

  // 3. 데이터 집계
  const currentSummary = aggregateRangeData(rawList, currentStart, currentEnd);
  const prevSummary = aggregateRangeData(rawList, prevStart, prevEnd);
  const latestInfo = findLatestPartnerCategoryActivations(rawList, filterState.category);

  // 4. 업체 목록 추출 및 가공
  const allPartners = new Set([
    ...Object.keys(currentSummary),
    ...Object.keys(prevSummary)
  ]);

  const categoryKey = filterState.category; // 'internet' | 'usim'

  const partnerList = Array.from(allPartners).map(name => {
    const curr = currentSummary[name] || { internet: 0, usim: 0 };
    const prev = prevSummary[name] || { internet: 0, usim: 0 };
    const latest = latestInfo[name] || { date: "-", count: 0 };

    return {
      name,
      thisPeriodCount: curr[categoryKey] || 0,
      prevPeriodCount: prev[categoryKey] || 0,
      diffCount: (curr[categoryKey] || 0) - (prev[categoryKey] || 0),
      latestDate: latest.date,
      latestCount: latest.count
    };
  });

  // 가독성 개선: 이번 기간 및 지난 기간 둘 다 실적이 0인 업체는 화면에서 완전히 제외
  const filteredList = partnerList.filter(p => p.thisPeriodCount > 0 || p.prevPeriodCount > 0);

  // 정렬: 이번 기간 개통완료 건수 높은 순 -> 이름 가나다 순
  filteredList.sort((a, b) => {
    if (b.thisPeriodCount !== a.thisPeriodCount) return b.thisPeriodCount - a.thisPeriodCount;
    return a.name.localeCompare(b.name, "ko");
  });

  // 5. 대시보드 요약 정보 카드 갱신
  renderSummaryCards(filteredList, currentLabel, prevLabel);

  // 5.5 명예의 전당 리더보드 갱신
  renderLeaderboard(filteredList);

  // 6. 테이블 렌더링
  renderDynamicTable(filteredList, currentLabel, prevLabel);

  // 7. 글로벌 캐시 저장 (다운로드용)
  currentFilteredList = filteredList;
  currentLabels = { currentLabel, prevLabel };
}

// 필터 상태(일간/주간/월간)에 맞는 날짜 범위 및 라벨 획득
function getPeriodRanges() {
  const state = filterState;
  let currentStart = '', currentEnd = '', prevStart = '', prevEnd = '';
  let currentLabel = '', prevLabel = '';

  if (state.period === 'daily') {
    const baseDate = new Date(state.date);
    const prevDate = new Date(baseDate);
    prevDate.setDate(baseDate.getDate() - 1);

    currentStart = state.date;
    currentEnd = state.date;
    prevStart = getFormatDate(prevDate);
    prevEnd = prevStart;

    currentLabel = '오늘';
    prevLabel = '어제';
  } else if (state.period === 'weekly') {
    const baseDate = new Date(state.date);
    
    // 이번주 최근 7일 (기준일 포함 이전 6일)
    const currentStartDate = new Date(baseDate);
    currentStartDate.setDate(baseDate.getDate() - 6);
    currentStart = getFormatDate(currentStartDate);
    currentEnd = state.date;

    // 지난주 (그 전 7일)
    const prevEndDate = new Date(currentStartDate);
    prevEndDate.setDate(currentStartDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevEndDate.getDate() - 6);

    prevStart = getFormatDate(prevStartDate);
    prevEnd = getFormatDate(prevEndDate);

    currentLabel = '이번주';
    prevLabel = '지난주';
  } else {
    // 월간
    currentStart = state.reportMonth + "-01";
    currentEnd = state.reportMonth + "-31"; // 널널하게 31일로 지정

    prevStart = state.compareMonth + "-01";
    prevEnd = state.compareMonth + "-31";

    currentLabel = '이번달';
    prevLabel = '지난달';
  }

  return { currentStart, currentEnd, prevStart, prevEnd, currentLabel, prevLabel };
}

// 범위 내 협력점별 개통량 집계
function aggregateRangeData(list, start, end) {
  const summary = {};
  list.forEach(row => {
    if (row.date && row.date >= start && row.date <= end) {
      const partners = row.partners || {};
      for (let p in partners) {
        if (!summary[p]) {
          summary[p] = { internet: 0, usim: 0 };
        }
        summary[p].internet += (partners[p].internet || 0);
        summary[p].usim += (partners[p].usim || 0);
      }
    }
  });
  return summary;
}

// 선택된 분류(인터넷/유심)별로 가장 최근 데이터가 존재했던 일자와 건수 탐색
function findLatestPartnerCategoryActivations(list, category) {
  const latest = {}; // { '대명': { date: '2026-06-24', count: 5 } }
  
  // 날짜 오름차순 정렬
  const sortedList = [...list].sort((a, b) => a.date.localeCompare(b.date));

  sortedList.forEach(row => {
    const date = row.date;
    const partners = row.partners || {};
    for (let p in partners) {
      const count = partners[p][category] || 0;
      if (count > 0) {
        latest[p] = { date, count };
      }
    }
  });
  return latest;
}

function renderSummaryCards(filteredList, currentLabel, prevLabel) {
  const activeCount = filteredList.length; // 0건을 걸렀으므로 현재 탭 실적이 있는 활성점 수와 동일
  
  let totalThisPeriod = 0;
  let totalPrevPeriod = 0;

  filteredList.forEach(p => {
    totalThisPeriod += p.thisPeriodCount;
    totalPrevPeriod += p.prevPeriodCount;
  });

  const activeCountEl = document.getElementById("activePartnersCount");
  const totalThisPeriodEl = document.getElementById("totalThisPeriod");
  const diffPeriodViewEl = document.getElementById("diffPeriodView");
  const summaryThisPeriodLabel = document.getElementById("summaryThisPeriodLabel");
  const summaryDiffLabel = document.getElementById("summaryDiffLabel");

  const categoryKo = filterState.category === 'internet' ? '인터넷' : '유심';

  // 라벨 업데이트
  if (summaryThisPeriodLabel) summaryThisPeriodLabel.textContent = `${currentLabel} ${categoryKo} 개통`;
  if (summaryDiffLabel) summaryDiffLabel.textContent = `이전 대비 증감`;

  // 수치 바인딩
  if (activeCountEl) activeCountEl.textContent = `${activeCount}개점`;
  if (totalThisPeriodEl) totalThisPeriodEl.textContent = `${totalThisPeriod}건`;

  if (diffPeriodViewEl) {
    const diff = totalThisPeriod - totalPrevPeriod;
    diffPeriodViewEl.innerHTML = formatDiffHtml(diff);
  }
}

function formatDiffHtml(diff) {
  if (diff > 0) {
    return `<span class="trend-badge up">▲ ${diff}건</span>`;
  } else if (diff < 0) {
    return `<span class="trend-badge down">▼ ${Math.abs(diff)}건</span>`;
  } else {
    return `<span class="trend-badge zero">0건</span>`;
  }
}

function renderDynamicTable(filteredList, currentLabel, prevLabel) {
  const thead = document.getElementById("partnerTableHead");
  const tbody = document.getElementById("partnerTableBody");

  if (!thead || !tbody) return;

  const categoryKo = filterState.category === 'internet' ? '인터넷' : '유심';

  // 1. 헤더 그리기
  thead.innerHTML = `
    <tr>
      <th style="vertical-align: middle;">협력점명</th>
      <th class="number-cell">${currentLabel} (${categoryKo})</th>
      <th class="number-cell">${prevLabel} (${categoryKo})</th>
      <th class="number-cell" style="text-align: right;">차이</th>
      <th style="text-align: center;">최근 개통일</th>
      <th class="number-cell" style="text-align: right;">최근 개통수 (${categoryKo})</th>
    </tr>
  `;

  // 2. 바디 그리기
  if (filteredList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--muted); padding: 40px 0;">
          선택된 기준에 해당하는 ${categoryKo} 개통 데이터가 없습니다. 엑셀을 업로드해주세요.
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  filteredList.forEach(p => {
    html += `
      <tr class="partner-row-data">
        <td style="font-weight: 800; color: var(--ink);">${escapeHtml(p.name)}</td>
        <td class="number-cell" style="color: var(--blue); font-size: 14px;">${p.thisPeriodCount}</td>
        <td class="number-cell" style="color: var(--muted);">${p.prevPeriodCount}</td>
        <td class="number-cell">${formatDiffHtml(p.diffCount)}</td>
        <td style="text-align: center;"><span class="date-badge">${p.latestDate}</span></td>
        <td class="number-cell" style="color: var(--ink); font-weight: 700;">${p.latestCount}건</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function filterTable() {
  const query = document.getElementById("partnerSearchInput")?.value.toLowerCase() || "";
  const rows = document.querySelectorAll(".partner-row-data");

  rows.forEach(row => {
    const name = row.querySelector("td")?.textContent.toLowerCase() || "";
    if (name.includes(query)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateSliderPosition() {
  const activeBtn = document.querySelector("#categoryTab button.active");
  const slider = document.querySelector("#categoryTab .partner-btn-slider");
  if (activeBtn && slider) {
    slider.style.left = `${activeBtn.offsetLeft}px`;
    slider.style.width = `${activeBtn.offsetWidth}px`;
  }
}

// 명예의 전당 Top 3 리더보드 렌더링
function renderLeaderboard(filteredList) {
  const container = document.getElementById("partnerLeaderboard");
  if (!container) return;

  // 실적이 1건 이상 있는 업체 중 상위 3개만 추출
  const topPartners = filteredList.filter(p => p.thisPeriodCount > 0).slice(0, 3);

  if (topPartners.length === 0) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "grid";

  const ranks = [
    { emoji: "🥇", badgeClass: "badge-gold", cardClass: "card-gold" },
    { emoji: "🥈", badgeClass: "badge-silver", cardClass: "card-silver" },
    { emoji: "🥉", badgeClass: "badge-bronze", cardClass: "card-bronze" }
  ];

  let html = "";
  topPartners.forEach((p, index) => {
    const r = ranks[index];
    html += `
      <div class="leaderboard-card ${r.cardClass}">
        <div class="leaderboard-badge ${r.badgeClass}">${r.emoji}</div>
        <div class="leaderboard-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
        <div class="leaderboard-count">${p.thisPeriodCount}<span>건</span></div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// 엑셀 다운로드 기능 구현
async function downloadExcel() {
  if (!window.ExcelJS) {
    alert("ExcelJS 라이브러리를 로드하지 못했습니다.");
    return;
  }
  
  const btn = document.getElementById("downloadExcelBtn");
  const originalText = btn.textContent;
  btn.textContent = "다운로드 중...";
  btn.disabled = true;

  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("협력점 개통 현황");
    const categoryKo = filterState.category === 'internet' ? '인터넷' : '유심';
    
    // Set columns
    sheet.columns = [
      { header: "협력점명", key: "name", width: 25 },
      { header: `${currentLabels.currentLabel} (${categoryKo})`, key: "thisPeriodCount", width: 25 },
      { header: `${currentLabels.prevLabel} (${categoryKo})`, key: "prevPeriodCount", width: 25 },
      { header: "차이", key: "diffCount", width: 15 },
      { header: "최근 개통일", key: "latestDate", width: 20 },
      { header: `최근 개통수 (${categoryKo})`, key: "latestCount", width: 25 }
    ];
    
    // Apply table header styles
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell(cell => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1D5D48" } // Theme green
      };
      cell.font = {
        name: "맑은 고딕",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" }
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center"
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "medium", color: { argb: "FF1D5D48" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } }
      };
    });

    // Add data rows
    currentFilteredList.forEach(p => {
      const row = sheet.addRow({
        name: p.name,
        thisPeriodCount: p.thisPeriodCount,
        prevPeriodCount: p.prevPeriodCount,
        diffCount: p.diffCount,
        latestDate: p.latestDate,
        latestCount: p.latestCount
      });
      
      // Formatting and alignment
      row.getCell("name").alignment = { vertical: "middle", horizontal: "left" };
      row.getCell("thisPeriodCount").alignment = { vertical: "middle", horizontal: "right" };
      row.getCell("thisPeriodCount").numFmt = "#,##0";
      row.getCell("prevPeriodCount").alignment = { vertical: "middle", horizontal: "right" };
      row.getCell("prevPeriodCount").numFmt = "#,##0";
      row.getCell("diffCount").alignment = { vertical: "middle", horizontal: "right" };
      row.getCell("diffCount").numFmt = "+#,##0;-#,##0;0";
      row.getCell("latestDate").alignment = { vertical: "middle", horizontal: "center" };
      row.getCell("latestCount").alignment = { vertical: "middle", horizontal: "right" };
      row.getCell("latestCount").numFmt = "#,##0\"건\"";

      // Style borders for data rows
      row.eachCell(cell => {
        cell.font = { name: "맑은 고딕", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
      });
      
      // Add colored text for diff
      const diffCell = row.getCell("diffCount");
      if (p.diffCount > 0) {
        diffCell.font = { name: "맑은 고딕", size: 10, color: { argb: "FF10B981" }, bold: true };
      } else if (p.diffCount < 0) {
        diffCell.font = { name: "맑은 고딕", size: 10, color: { argb: "FFEF4444" }, bold: true };
      }
    });

    // Export to browser
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const catText = filterState.category === 'internet' ? '인터넷' : '유심';
    const periodText = filterState.period === 'daily' ? '일간' : (filterState.period === 'weekly' ? '주간' : '월간');
    a.download = `협력점현황_${catText}_${periodText}_${filterState.reportMonth || filterState.date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("엑셀 파일 저장 실패", error);
    alert("엑셀 파일 다운로드 중 오류가 발생했습니다.");
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// 이미지 다운로드 기능 구현
function downloadImage() {
  if (!window.html2canvas) {
    alert("html2canvas 라이브러리를 로드하지 못했습니다.");
    return;
  }

  const btn = document.getElementById("downloadImageBtn");
  const originalText = btn.textContent;
  btn.textContent = "이미지 변환 중...";
  btn.disabled = true;

  // Capture the dashboard layout container
  const target = document.querySelector(".dashboard-layout") || document.body;
  
  html2canvas(target, {
    useCORS: true,
    allowTaint: true,
    scale: 2, // Retain high quality
    backgroundColor: "#f1f5f9", // Maintain body background color
    onclone: (clonedDoc) => {
      // Hide section title and filter bar from the captured image
      const title = clonedDoc.querySelector(".dashboard-content .section-title");
      if (title) title.style.display = "none";
      const filterBar = clonedDoc.querySelector(".partner-filter-bar");
      if (filterBar) filterBar.style.display = "none";
    }
  }).then(canvas => {
    const link = document.createElement("a");
    const catText = filterState.category === 'internet' ? '인터넷' : '유심';
    const periodText = filterState.period === 'daily' ? '일간' : (filterState.period === 'weekly' ? '주간' : '월간');
    link.download = `협력점현황_${catText}_${periodText}_${filterState.reportMonth || filterState.date}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    btn.textContent = originalText;
    btn.disabled = false;
  }).catch(err => {
    console.error("이미지 변환 오류", err);
    alert("이미지 저장 중 오류가 발생했습니다.");
    btn.textContent = originalText;
    btn.disabled = false;
  });
}


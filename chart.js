function initChartFilters(rows) {
  const startInput = document.querySelector("#chartStartDate");
  const endInput = document.querySelector("#chartEndDate");
  if (!startInput || !endInput || startInput.value || endInput.value || !rows || !rows.length) return;

  const sortedRows = [...rows].sort((a, b) => getReportSortDate(a).localeCompare(getReportSortDate(b)));
  const maxDateText = getReportSortDate(sortedRows[sortedRows.length - 1]);
  const maxDate = new Date(`${maxDateText}T00:00:00`);

  endInput.value = maxDateText;

  const startDate = new Date(maxDate);
  startDate.setDate(startDate.getDate() - 6);
  startInput.value = toDateInputValue(startDate);
}

function renderCharts(rows) {
  if (typeof Chart === "undefined") return;
  if (typeof ChartDataLabels !== "undefined") {
    Chart.register(ChartDataLabels);
  }

  initChartFilters(rows);
  const startInput = document.querySelector("#chartStartDate")?.value;
  const endInput = document.querySelector("#chartEndDate")?.value;

  // A row's "date" is the day it was typed in; the figures it holds are
  // the cumulative totals as of the day before, so charts bucket by that.
  let filteredRows = rows.map((row) => ({ ...row, effectiveDate: getReportSortDate(row) }));
  if (startInput) filteredRows = filteredRows.filter(r => r.effectiveDate >= startInput);
  if (endInput) filteredRows = filteredRows.filter(r => r.effectiveDate <= endInput);

  const sortedRows = filteredRows.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  const labels = sortedRows.map(row => String(row.effectiveDate).slice(5)); // MM-DD

  const getDeltas = (key) => sortedRows.map((row, i) => {
    if (i === 0) return toNumber(row[key]);
    const prevRow = sortedRows[i - 1];
    if (getMonthKey(row.effectiveDate) === getMonthKey(prevRow.effectiveDate)) {
      return Math.max(0, toNumber(row[key]) - toNumber(prevRow[key]));
    }
    return toNumber(row[key]);
  });

  // Mobile Chart
  const mobileCtx = document.getElementById("mobileChart");
  if (mobileCtx) {
    if (chartInstances.mobile) chartInstances.mobile.destroy();
    chartInstances.mobile = new Chart(mobileCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "유심 개통완료",
            data: getDeltas("open_mobile_usim"),
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.3,
            fill: true
          },
          {
            label: "기기 개통완료",
            data: getDeltas("open_mobile_device"),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { position: "top" },
          datalabels: {
            display: true,
            align: 'top',
            anchor: 'end',
            font: { size: 11, weight: 'bold' },
            formatter: (value) => value > 0 ? value : ''
          }
        }
      }
    });
  }

  // Internet Chart
  const internetCtx = document.getElementById("internetChart");
  if (internetCtx) {
    if (chartInstances.internet) chartInstances.internet.destroy();
    chartInstances.internet = new Chart(internetCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "온라인 개통완료",
            data: getDeltas("open_online_internet"),
            borderColor: "#10b981",
            tension: 0.3
          },
          {
            label: "도매 개통완료",
            data: getDeltas("open_wholesale_internet"),
            borderColor: "#3b82f6",
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { position: "top" },
          datalabels: {
            display: true,
            align: 'top',
            anchor: 'end',
            font: { size: 11, weight: 'bold' },
            formatter: (value) => value > 0 ? value : ''
          }
        }
      }
    });
  }

  // TV Chart (Mixed)
  const tvCtx = document.getElementById("tvChart");
  if (tvCtx) {
    if (chartInstances.tv) chartInstances.tv.destroy();
    chartInstances.tv = new Chart(tvCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            type: "line",
            label: "온라인 메인TV",
            data: getDeltas("open_online_main_tv"),
            borderColor: "#10b981",
            tension: 0.3
          },
          {
            type: "line",
            label: "도매 메인TV",
            data: getDeltas("open_wholesale_main_tv"),
            borderColor: "#3b82f6",
            tension: 0.3
          },
          {
            type: "bar",
            label: "온라인 추단",
            data: getDeltas("open_online_extra"),
            backgroundColor: "rgba(16, 185, 129, 0.5)",
          },
          {
            type: "bar",
            label: "도매 추단",
            data: getDeltas("open_wholesale_extra"),
            backgroundColor: "rgba(59, 130, 246, 0.5)",
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { position: "top" },
          datalabels: {
            display: true,
            align: 'top',
            anchor: 'end',
            font: { size: 11, weight: 'bold' },
            formatter: (value) => value > 0 ? value : ''
          }
        }
      }
    });
  }
}
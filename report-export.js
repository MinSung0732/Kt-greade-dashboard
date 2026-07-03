(function () {
  "use strict";

  const COLORS = {
    navy: "17365D",
    blue: "1F4E78",
    lightBlue: "D9EAF7",
    gray: "E7E6E6",
    paleGray: "F5F6F8",
    yellow: "FFF2CC",
    orange: "F4B183",
    red: "FF0000",
    white: "FFFFFF",
    border: "A6A6A6",
    green: "E2F0D9",
    darkGreen: "548235",
    darkOrange: "C55A11",
    teal: "008C95",
    purple: "7030A0",
    softBlue: "EAF3F8",
    softOrange: "FCE4D6",
    softGreen: "E2F0D9",
  };

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function percent(value) {
    return number(value);
  }

  function normalizedRate(rawValue, fallbackValue, defaultPercent) {
    const hasRaw = rawValue !== undefined && rawValue !== null && rawValue !== "";
    const hasFallback = fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== "";
    const raw = hasRaw ? number(rawValue) : (hasFallback ? number(fallbackValue) : number(defaultPercent));
    return raw > 1 ? raw / 100 : raw;
  }

  function monthKey(value) {
    return String(value || "").slice(0, 7);
  }

  // Every row's "date" is the day it was typed in (the following morning);
  // the figures it holds are the cumulative totals as of the day before.
  function getEffectiveDate(dateText) {
    if (!dateText) return "";
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() - 1);
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 10);
  }

  function border(color = COLORS.border) {
    const side = { style: "thin", color: { argb: color } };
    return { top: side, left: side, bottom: side, right: side };
  }

  function fill(color) {
    return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  }

  function styleRange(sheet, range, options = {}) {
    sheet.getCell(range.split(":")[0]);
    const [start, end = start] = range.split(":");
    const startCell = sheet.getCell(start);
    const endCell = sheet.getCell(end);
    for (let row = startCell.row; row <= endCell.row; row += 1) {
      for (let col = startCell.col; col <= endCell.col; col += 1) {
        const cell = sheet.getCell(row, col);
        if (options.fill) cell.fill = fill(options.fill);
        if (options.font) cell.font = options.font;
        if (options.border !== false) cell.border = border(options.borderColor);
        cell.alignment = options.alignment || {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      }
    }
  }

  function setRow(sheet, rowNumber, values, options = {}) {
    values.forEach((value, index) => {
      sheet.getCell(rowNumber, index + 1).value = value;
    });
    sheet.getRow(rowNumber).height = options.height || 23;
    const endColumn = String.fromCharCode(64 + values.length);
    styleRange(sheet, `A${rowNumber}:${endColumn}${rowNumber}`, options);
  }

  function setRangeRow(sheet, rowNumber, startColumn, values, range, options = {}) {
    values.forEach((value, index) => {
      sheet.getCell(rowNumber, startColumn + index).value = value;
    });
    sheet.getRow(rowNumber).height = options.height || 23;
    styleRange(sheet, range, options);
  }

  function addSectionTitle(sheet, row, title) {
    sheet.mergeCells(`A${row}:H${row}`);
    sheet.getCell(`A${row}`).value = `■ ${title}`;
    sheet.getRow(row).height = 28;
    styleRange(sheet, `A${row}:H${row}`, {
      fill: "D9E2F3",
      font: { bold: true, size: 13, color: { argb: COLORS.navy } },
      alignment: { horizontal: "left", vertical: "middle" },
    });
  }

  function addKpiStrip(sheet, row, summary, comparison) {
    const latestExpected = comparison.channels.reduce((total, channel) => total + channel.expected, 0);
    const target = comparison.target || number(summary.target_count);
    const remaining = Math.max(target - latestExpected, 0);
    const dailyNeed = comparison.remainingBusinessDays > 0
      ? Math.ceil(remaining / comparison.remainingBusinessDays)
      : 0;
    const items = [
      ["개통예상", latestExpected, "#,##0\" 건\"", 1, 2],
      ["목표", target, "#,##0\" 건\"", 3, 4],
      ["목표 달성률", target > 0 ? latestExpected / target : 0, "0%", 5, 6],
      ["목표까지", remaining, "#,##0\" 건\"", 7, 9],
      ["일 필요", dailyNeed, "#,##0\" 건\"", 10, 12],
    ];

    items.forEach(([label, value, format, startColumn, endColumn]) => {
      sheet.mergeCells(row, startColumn, row, endColumn);
      sheet.mergeCells(row + 1, startColumn, row + 1, endColumn);
      const labelCell = sheet.getCell(row, startColumn);
      const valueCell = sheet.getCell(row + 1, startColumn);
      labelCell.value = label;
      valueCell.value = value;
      valueCell.numFmt = format;
      styleRange(sheet, `${labelCell.address}:${sheet.getCell(row, endColumn).address}`, {
        fill: "D9E2F3",
        font: { bold: true, size: 10, color: { argb: COLORS.navy } },
      });
      styleRange(sheet, `${valueCell.address}:${sheet.getCell(row + 1, endColumn).address}`, {
        fill: COLORS.white,
        font: { bold: true, size: 15, color: { argb: COLORS.navy } },
        borderColor: COLORS.border,
      });
    });
    sheet.getRow(row).height = 20;
    sheet.getRow(row + 1).height = 31;
  }

  function getMonthEndDate(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return "";
    const [year, mon] = month.split("-").map(Number);
    return `${year}-${String(mon).padStart(2, "0")}-${String(new Date(year, mon, 0).getDate()).padStart(2, "0")}`;
  }

  function getNextMonthFirstDate(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return "";
    const [year, mon] = month.split("-").map(Number);
    return `${new Date(year, mon, 1).getFullYear()}-${String(new Date(year, mon, 1).getMonth() + 1).padStart(2, "0")}-01`;
  }

  // Returns a raw "date field" value (not an effective date) marking the
  // cutoff to compare row.date against. For a month other than the one
  // being typed in, that's the following month's 1st - since a row's raw
  // date is always one day ahead of the day its figures describe, this is
  // the raw value a final entry for that month would carry.
  function getReportCutoffDate(selectedDate, reportMonth) {
    const selectedMonth = monthKey(selectedDate);
    if (!reportMonth) return selectedDate || "";
    if (!selectedDate || selectedMonth !== reportMonth) return getNextMonthFirstDate(reportMonth);
    return selectedDate;
  }

  function rowReportMonth(row) {
    return String(row?.report_month || "").slice(0, 7) || monthKey(row?.date);
  }

  function rowBelongsToReportMonth(row, reportMonth) {
    if (!reportMonth) return true;
    const explicitReportMonth = String(row?.report_month || "").slice(0, 7);
    if (explicitReportMonth) return explicitReportMonth === reportMonth;
    return monthKey(getEffectiveDate(row?.date)) === reportMonth;
  }

  // Sort/compare key reflecting the day a row's figures actually describe
  // (the day before it was typed in), not the literal "date" field.
  function getReportSortDate(row) {
    return getEffectiveDate(row?.date) || String(row?.date || "");
  }

  function buildDateRangeLabel(selectedDate, reportMonth, cutoffDate) {
    try {
      const base = selectedDate ? new Date(selectedDate) : new Date();
      const month = reportMonth || `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
      const [year, mon] = month.split("-").map(Number);
      const firstDay = `${year}-${String(mon).padStart(2, "0")}-01`;
      const rawCutoff = cutoffDate || getReportCutoffDate(selectedDate, month);
      const displayCutoff = getEffectiveDate(rawCutoff) || rawCutoff;
      return `${firstDay} ~ ${displayCutoff}`;
    } catch (e) {
      return selectedDate || "-";
    }
  }

  function computeMonthlySummary(rows, selectedDate, baseSummary, settings, reportMonth, cutoffDate) {
    const selectedMonth = reportMonth || monthKey(selectedDate || baseSummary?.date);
    const effectiveCutoff = cutoffDate || getReportCutoffDate(selectedDate, selectedMonth);
    const effectiveCutoffKey = getEffectiveDate(effectiveCutoff) || "9999-99-99";
    const monthRows = (Array.isArray(rows) ? rows : [])
      .filter(row =>
        row &&
        row.date &&
        rowBelongsToReportMonth(row, selectedMonth) &&
        getReportSortDate(row) <= effectiveCutoffKey
      )
      .slice()
      .sort((a, b) => getReportSortDate(a).localeCompare(getReportSortDate(b)));

    const latest = monthRows[monthRows.length - 1] || {};
    const sum = { ...baseSummary, ...latest };
    const keysToSum = [
      "open_online_internet", "open_online_tv", "open_online_main_tv", "open_online_extra",
      "open_wholesale_internet", "open_wholesale_tv", "open_wholesale_main_tv", "open_wholesale_extra",
      "open_internet", "open_tv", "open_main_tv", "open_extra_device",
      "open_mobile_device", "open_mobile_usim", "main_dongpan_usim",
      "install_online_internet", "install_online_tv", "install_online_main_tv", "install_online_extra",
      "install_wholesale_internet", "install_wholesale_tv", "install_wholesale_main_tv", "install_wholesale_extra",
      "install_internet", "install_tv", "install_main_tv", "install_extra_device",
      "install_mobile_device", "install_mobile_usim",
    ];

    keysToSum.forEach(k => {
      sum[k] = number(latest[k] ?? baseSummary?.[k]);
    });

    sum.open_bundle_rate = sum.open_internet > 0 ? sum.open_main_tv / sum.open_internet : 0;
    sum.open_online_bundle_rate = sum.open_online_internet > 0 ? sum.open_online_main_tv / sum.open_online_internet : 0;
    sum.open_wholesale_bundle_rate = sum.open_wholesale_internet > 0 ? sum.open_wholesale_main_tv / sum.open_wholesale_internet : 0;
    sum.install_bundle_rate = sum.install_internet > 0 ? sum.install_main_tv / sum.install_internet : 0;
    sum.install_online_bundle_rate = sum.install_online_internet > 0 ? sum.install_online_main_tv / sum.install_online_internet : 0;
    sum.install_wholesale_bundle_rate = sum.install_wholesale_internet > 0 ? sum.install_wholesale_main_tv / sum.install_wholesale_internet : 0;

    const internetRate = baseSummary?.report_closed ? 0 : normalizedRate(settings?.internet_open_rate, baseSummary?.internet_open_rate_setting, 75);
    sum.expected_internet = sum.open_internet + Math.floor(sum.install_internet * internetRate);
    sum.open_companion_rate = sum.expected_internet > 0 ? Math.floor((number(sum.main_dongpan_usim) / sum.expected_internet) * 100) / 100 : 0;

    return sum;
  }

  function getAccumulatedRow(rows, upToDate) {
    const filtered = rows
      .filter(r => getReportSortDate(r) <= upToDate)
      .slice()
      .sort((a, b) => getReportSortDate(a).localeCompare(getReportSortDate(b)));
    if (!filtered.length) return null;
    return { ...filtered[filtered.length - 1] };
  }

  function createDailyComparison(rows, summary, selectedDate, settings, cutoffDate, reportMonth) {
    const effectiveCutoff = cutoffDate || selectedDate;
    const selectedMonth = reportMonth || rowReportMonth(summary) || monthKey(selectedDate);
    const effectiveCutoffKey = getEffectiveDate(effectiveCutoff) || "9999-99-99";
    const sourceRows = (Array.isArray(rows) ? rows : [])
      .filter((row) =>
        row &&
        row.date &&
        rowBelongsToReportMonth(row, selectedMonth) &&
        getReportSortDate(row) <= effectiveCutoffKey
      )
      .slice()
      .sort((a, b) => getReportSortDate(a).localeCompare(getReportSortDate(b)));
    const rawCurrent = sourceRows[sourceRows.length - 1];
    const rawPrevious = sourceRows[sourceRows.length - 2];
    const current = rawCurrent ? getAccumulatedRow(sourceRows, getReportSortDate(rawCurrent)) : null;
    const previous = rawPrevious ? getAccumulatedRow(sourceRows, getReportSortDate(rawPrevious)) : null;
    const internetRate = summary?.report_closed ? 0 : normalizedRate(settings?.internet_open_rate, summary?.internet_open_rate_setting || current?.internet_open_rate_setting, 75);
    const definitions = [
      ["온라인", "open_online_internet", "install_online_internet"],
      ["도매", "open_wholesale_internet", "install_wholesale_internet"],
    ];

    return {
      date: current?.date || "",
      previousDate: previous?.date || "",
      available: Boolean(current && previous),
      current: current || null,
      previous: previous || null,
      target: number(summary?.target_count) || number(current?.target_count),
      onlineTarget: number(summary?.online_target_count) || number(current?.online_target_count),
      remainingBusinessDays:
        number(summary?.remaining_business_days) || number(current?.remaining_business_days),
      internetRate,
      channels: definitions.map(([label, openKey, installKey]) => {
        const open = number(current?.[openKey]);
        const install = number(current?.[installKey]);
        const installExpected = Math.floor(install * internetRate);
        return {
          label,
          open,
          install,
          installExpected,
          expected: open + installExpected,
          openDiff: current && previous ? open - number(previous[openKey]) : null,
          installDiff: current && previous ? install - number(previous[installKey]) : null,
        };
      }),
    };
  }

  function comparisonLabel(label, diff) {
    if (diff === null || diff === undefined) return `${label} (비교 데이터 없음)`;
    return `${label} (직전대비 ${diff > 0 ? "+" : ""}${diff})`;
  }

  function addInternetGoalOverview(sheet, row, comparison) {
    sheet.mergeCells(`A${row}:F${row}`);
    sheet.getCell(`A${row}`).value = comparison.available
      ? `인터넷 목표 달성 현황  |  기준 ${comparison.dateRangeLabel}`
      : `인터넷 목표 달성 현황  |  최신 ${comparison.date || "-"} / 비교 기준 없음`;
    sheet.getRow(row).height = 26;
    styleRange(sheet, `A${row}:F${row}`, {
      fill: "D9E2F3",
      font: { bold: true, size: 12, color: { argb: COLORS.navy } },
      alignment: { horizontal: "left", vertical: "middle" },
    });

    // Table body is intentionally narrower than the header above it (A:F only,
    // roughly 65% of the section width) so it reads as a compact sub-panel.
    sheet.mergeCells(`B${row + 1}:C${row + 1}`);
    [[1, "경로"], [2, "구분"], [4, "건수"], [5, "가설 개통예상"], [6, "개통율"]]
      .forEach(([column, value]) => {
        sheet.getCell(row + 1, column).value = value;
      });
    sheet.getRow(row + 1).height = 30;
    styleRange(sheet, `A${row + 1}:F${row + 1}`, {
      fill: "E7E6E6",
      font: { bold: true, color: { argb: COLORS.navy } },
    });

    comparison.channels.forEach((channel, index) => {
      const firstRow = row + 2 + index * 3;
      sheet.mergeCells(firstRow, 1, firstRow + 2, 1);
      sheet.getCell(firstRow, 1).value = channel.label;
      styleRange(sheet, `A${firstRow}:A${firstRow + 2}`, {
        fill: index === 0 ? "EAF0F5" : "F2F0ED",
        font: { bold: true, color: { argb: COLORS.blue } },
      });

      const lines = [
        [comparisonLabel("개통", channel.openDiff), channel.open, "", ""],
        [comparisonLabel("가설중", channel.installDiff), channel.install, channel.installExpected, comparison.internetRate],
        ["개통예상 개수 (개통+가설예상)", channel.expected, "", ""],
      ];
      lines.forEach((values, lineIndex) => {
        const currentRow = firstRow + lineIndex;
        sheet.mergeCells(currentRow, 2, currentRow, 3);
        [values[0], values[1], values[2], values[3]].forEach((value, valueIndex) => {
          const columns = [2, 4, 5, 6];
          sheet.getCell(currentRow, columns[valueIndex]).value = value;
        });
        styleRange(sheet, `B${currentRow}:F${currentRow}`, {
          fill: lineIndex === 2 ? "FFF8E1" : COLORS.white,
          font: { bold: lineIndex === 2, color: { argb: COLORS.navy } },
        });
        sheet.getRow(currentRow).height = 26;
        sheet.getCell(currentRow, 4).numFmt = "#,##0\" 건\"";
        if (lineIndex === 1) {
          sheet.getCell(currentRow, 5).numFmt = "#,##0\" 건\"";
          sheet.getCell(currentRow, 6).numFmt = "0%";
        }
      });
    });

    const totalExpected = comparison.channels.reduce((total, channel) => total + channel.expected, 0);

    const remaining = Math.max(comparison.target - totalExpected, 0);
    const requiredInstallations = comparison.internetRate > 0
      ? Math.ceil(remaining / comparison.internetRate)
      : remaining;
    const dailyNeed = comparison.remainingBusinessDays > 0
      ? Math.floor(requiredInstallations / comparison.remainingBusinessDays)
      : 0;
    const totalRow = row + 8;
    sheet.mergeCells(`A${totalRow}:C${totalRow}`);
    sheet.mergeCells(`D${totalRow}:F${totalRow}`);
    sheet.getCell(totalRow, 1).value = "총 개통예상";
    sheet.getCell(totalRow, 4).value = totalExpected;
    sheet.getRow(totalRow).height = 26;
    styleRange(sheet, `A${totalRow}:F${totalRow}`, {
      fill: "EAF0F5",
      font: { bold: true, size: 12, color: { argb: COLORS.navy } },
    });
    sheet.getCell(totalRow, 4).numFmt = "#,##0\" 건\"";

    const targetRow = row + 9;
    sheet.mergeCells(`B${targetRow}:C${targetRow}`);
    sheet.mergeCells(`E${targetRow}:F${targetRow}`);
    sheet.getCell(targetRow, 1).value = "목표";
    sheet.getCell(targetRow, 2).value = comparison.target;
    sheet.getCell(targetRow, 4).value = "목표까지 필요";
    sheet.getCell(targetRow, 5).value = remaining;
    sheet.getRow(targetRow).height = 26;
    styleRange(sheet, `A${targetRow}:A${targetRow}`, {
      fill: "D9E2F3",
      font: { bold: true, color: { argb: COLORS.navy } },
    });
    styleRange(sheet, `B${targetRow}:C${targetRow}`, {
      fill: COLORS.white,
      font: { bold: true, size: 12, color: { argb: COLORS.navy } },
    });
    styleRange(sheet, `D${targetRow}:D${targetRow}`, {
      fill: "D9E2F3",
      font: { bold: true, color: { argb: COLORS.navy } },
    });
    styleRange(sheet, `E${targetRow}:F${targetRow}`, {
      fill: COLORS.white,
      font: { bold: true, size: 12, color: { argb: COLORS.navy } },
    });
    sheet.getCell(targetRow, 2).numFmt = "#,##0\" 건\"";
    sheet.getCell(targetRow, 5).numFmt = "#,##0\" 건\"";

    const needRow = row + 10;
    const ratePercent = Math.round(comparison.internetRate * 100);
    sheet.getCell(needRow, 1).value = `가설 필요(개통율 ${ratePercent}%)`;
    sheet.getCell(needRow, 2).value = requiredInstallations;
    sheet.getCell(needRow, 3).value = "남은 영업일";
    sheet.getCell(needRow, 4).value = comparison.remainingBusinessDays;
    sheet.getCell(needRow, 5).value = "일 필요";
    sheet.getCell(needRow, 6).value = dailyNeed;
    sheet.getRow(needRow).height = 24;
    styleRange(sheet, `A${needRow}:F${needRow}`, {
      fill: COLORS.paleGray,
      font: { bold: true, color: { argb: "9C0006" } },
    });
    sheet.getCell(needRow, 1).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false,
      shrinkToFit: true,
    };
    sheet.getCell(needRow, 2).numFmt = "#,##0\" 건\"";
    sheet.getCell(needRow, 4).numFmt = "0\" 일\"";
    sheet.getCell(needRow, 6).numFmt = "#,##0\" 건\"";
  }

  function addStatusTable(sheet, startRow, title, summary, prefix, comparison) {
    const softAccent = prefix === "open" ? "EAF0F5" : "F2F0ED";
    const mobileTotal =
      number(summary[`${prefix}_mobile_usim`]) + number(summary[`${prefix}_mobile_device`]);
    const companionRate =
      number(summary.expected_internet) > 0 ? mobileTotal / number(summary.expected_internet) : 0;
    sheet.mergeCells(`A${startRow}:L${startRow}`);
    sheet.getCell(`A${startRow}`).value = title;
    styleRange(sheet, `A${startRow}:L${startRow}`, {
      fill: softAccent,
      font: { bold: true, size: 12, color: { argb: COLORS.navy } },
      alignment: { horizontal: "left", vertical: "middle" },
    });

    setRangeRow(sheet, startRow + 1, 1, [
      "구분",
      "인터넷",
      "TV",
      "메인TV",
      "추가단말",
      "번들율",
    ], `A${startRow + 1}:F${startRow + 1}`, {
      fill: "D9E2F3",
      font: { bold: true, color: { argb: COLORS.navy } },
    });

    setRangeRow(sheet, startRow + 1, 8, [
      "구분",
      "USIM(U)",
      "기기(M)",
      "동판율",
      "합계",
    ], `H${startRow + 1}:L${startRow + 1}`, {
      fill: "E7E6E6",
      font: { bold: true, color: { argb: COLORS.navy } },
    });

    const online = [
      "온라인",
      number(summary[`${prefix}_online_internet`]),
      number(summary[`${prefix}_online_tv`]),
      number(summary[`${prefix}_online_main_tv`]),
      number(summary[`${prefix}_online_extra`]),
      percent(summary[`${prefix}_online_bundle_rate`]),
    ];
    const wholesale = [
      "도매",
      number(summary[`${prefix}_wholesale_internet`]),
      number(summary[`${prefix}_wholesale_tv`]),
      number(summary[`${prefix}_wholesale_main_tv`]),
      number(summary[`${prefix}_wholesale_extra`]),
      percent(summary[`${prefix}_wholesale_bundle_rate`]),
    ];
    const total = [
      "합계",
      number(summary[`${prefix}_internet`]),
      number(summary[`${prefix}_tv`]),
      number(summary[`${prefix}_main_tv`]),
      number(summary[`${prefix}_extra_device`]),
      percent(summary[`${prefix}_bundle_rate`]),
    ];

    setRangeRow(sheet, startRow + 2, 1, online, `A${startRow + 2}:F${startRow + 2}`, {
      fill: COLORS.white,
    });
    setRangeRow(sheet, startRow + 3, 1, wholesale, `A${startRow + 3}:F${startRow + 3}`, {
      fill: COLORS.white,
    });
    setRangeRow(sheet, startRow + 4, 1, total, `A${startRow + 4}:F${startRow + 4}`, {
      fill: softAccent,
      font: { bold: true, size: 11, color: { argb: COLORS.navy } },
    });
    for (let col = 8; col <= 12; col += 1) {
      sheet.mergeCells(startRow + 2, col, startRow + 4, col);
    }
    const mobileValues = [
      prefix === "open" ? "개통완료" : "가설중",
      number(summary[`${prefix}_mobile_usim`]),
      number(summary[`${prefix}_mobile_device`]),
      companionRate,
      mobileTotal,
    ];
    mobileValues.forEach((value, index) => {
      sheet.getCell(startRow + 2, 8 + index).value = value;
    });
    styleRange(sheet, `H${startRow + 2}:H${startRow + 4}`, {
      fill: softAccent,
      font: { bold: true, size: 11, color: { argb: COLORS.navy } },
    });
    styleRange(sheet, `I${startRow + 2}:K${startRow + 4}`, {
      fill: COLORS.white,
      font: { bold: true, size: 11, color: { argb: COLORS.navy } },
    });

    styleRange(sheet, `L${startRow + 2}:L${startRow + 4}`, {
      fill: "D9E2F3",
      font: { bold: true, size: 12, color: { argb: COLORS.navy } },
    });
    sheet.getCell(startRow + 2, 6).numFmt = "0%";
    sheet.getCell(startRow + 3, 6).numFmt = "0%";
    sheet.getCell(startRow + 4, 6).numFmt = "0%";
    for (let row = startRow + 2; row <= startRow + 4; row += 1) {
      for (let col = 2; col <= 5; col += 1) {
        if (typeof sheet.getCell(row, col).value === "number") {
          sheet.getCell(row, col).numFmt = "#,##0";
        }
      }
    }
    for (let col = 9; col <= 10; col += 1) {
      sheet.getCell(startRow + 2, col).numFmt = "#,##0";
    }
    sheet.getCell(startRow + 2, 11).numFmt = "0%";
    sheet.getCell(startRow + 2, 12).numFmt = "#,##0";
  }

  function addTargetSection(sheet, row, summary, selectedDate) {
    const onlineTarget = number(summary.online_target_count);
    const onlineExpected = number(summary.expected_online_internet);
    const onlineRemaining = Math.max(onlineTarget - onlineExpected, 0);
    const businessDays = number(summary.remaining_business_days);
    const onlineDailyNeed = businessDays > 0 ? Math.ceil(onlineRemaining / businessDays) : 0;

    addSectionTitle(sheet, row, "인터넷 목표 달성 현황");
    setRow(sheet, row + 1, ["구분", "목표", "개통완료", "가설중", "개통예상", "달성률", "목표까지", "일 필요"], {
      fill: "D9E2F3",
      font: { bold: true, color: { argb: COLORS.navy } },
    });
    setRow(sheet, row + 2, [
      "전체",
      number(summary.target_count),
      number(summary.open_internet),
      number(summary.install_internet),
      number(summary.expected_internet),
      percent(summary.open_rate),
      number(summary.remaining_count),
      number(summary.daily_need),
    ], { fill: "EAF0F5", font: { bold: true, size: 11, color: { argb: COLORS.navy } } });
    setRow(sheet, row + 3, [
      "온라인",
      onlineTarget,
      number(summary.open_online_internet),
      number(summary.install_online_internet),
      onlineExpected,
      onlineTarget > 0 ? onlineExpected / onlineTarget : 0,
      onlineRemaining,
      onlineDailyNeed,
    ], { fill: COLORS.white });
    setRow(sheet, row + 4, [
      "도매",
      "-",
      number(summary.open_wholesale_internet),
      number(summary.install_wholesale_internet),
      number(summary.expected_wholesale_internet),
      "-",
      "-",
      "-",
    ], { fill: COLORS.softBlue });
    setRow(sheet, row + 5, [
      "기준",
      `${selectedDate || "-"} 현재`,
      "마감일",
      summary.deadline_date || "-",
      "남은 영업일",
      summary.report_closed || number(summary.remaining_business_days) <= 0 ? "영업마감" : `${number(summary.remaining_business_days)}일`,
      "",
      "",
    ], { fill: COLORS.paleGray, font: { bold: true } });
    sheet.getCell(row + 2, 6).numFmt = "0%";
    sheet.getCell(row + 3, 6).numFmt = "0%";
    sheet.getCell(row + 2, 6).fill = fill("D9E2F3");
    sheet.getCell(row + 2, 6).font = { bold: true, size: 12, color: { argb: COLORS.navy } };
    sheet.getCell(row + 2, 7).fill = fill(COLORS.paleGray);
    sheet.getCell(row + 2, 8).fill = fill(COLORS.paleGray);
    for (let currentRow = row + 2; currentRow <= row + 3; currentRow += 1) {
      for (let col = 2; col <= 8; col += 1) {
        if (typeof sheet.getCell(currentRow, col).value === "number" && col !== 6) {
          sheet.getCell(currentRow, col).numFmt = "#,##0\" 건\"";
        }
      }
    }
  }

  function addPointSection(sheet, row, summary) {
    const openPoint =
      number(summary.open_main_tv) * 2 +
      number(summary.open_extra_device) +
      (number(summary.open_mobile_device) + number(summary.open_mobile_usim)) * 2;
    const expectedPoint =
      number(summary.expected_main_tv) * 2 +
      number(summary.expected_extra_device) +
      number(summary.expected_mobile_total) * 2;
    const targetPoint = number(summary.target_point);

    addSectionTitle(sheet, row, "정책 포인트 현황");
    setRow(sheet, row + 1, ["구분", "메인TV (2P)", "추가단말 (1P)", "기기 M (2P)", "유심 U (2P)", "총 Point", "목표 Point", "목표까지"], {
      fill: "D9E2F3",
      font: { bold: true, color: { argb: COLORS.navy } },
    });
    setRow(sheet, row + 2, [
      "개통",
      number(summary.open_main_tv),
      number(summary.open_extra_device),
      number(summary.open_mobile_device),
      number(summary.open_mobile_usim),
      openPoint,
      targetPoint,
      Math.max(targetPoint - openPoint, 0),
    ], { fill: "EAF0F5" });
    sheet.getCell(row + 2, 6).font = { bold: true, color: { argb: "000000" } };
    sheet.getCell(row + 2, 8).font = { bold: true, color: { argb: "000000" } };
    setRow(sheet, row + 3, [
      "개통예상",
      number(summary.expected_main_tv),
      number(summary.expected_extra_device),
      number(summary.expected_mobile_device),
      number(summary.expected_mobile_usim),
      expectedPoint,
      targetPoint,
      Math.max(targetPoint - expectedPoint, 0),
    ], { fill: COLORS.softBlue });
    sheet.getCell(row + 3, 6).font = { bold: true, color: { argb: "000000" } };
    sheet.getCell(row + 3, 8).font = { bold: true, color: { argb: "000000" } };
    for (let currentRow = row + 2; currentRow <= row + 3; currentRow += 1) {
      for (let col = 2; col <= 8; col += 1) {
        sheet.getCell(currentRow, col).numFmt = col >= 6 ? "#,##0\" P\"" : "#,##0\" 건\"";
      }
    }
    sheet.getCell(row + 2, 6).fill = fill("D9E2F3");
    sheet.getCell(row + 2, 6).font = { bold: true, color: { argb: COLORS.navy } };
    sheet.getCell(row + 3, 6).fill = fill("E7E6E6");
    sheet.getCell(row + 3, 6).font = { bold: true, color: { argb: COLORS.navy } };
  }

  function createReportSheet(workbook, summary, selectedDate, reportMonth, comparison, monthlySummary) {
    const sheet = workbook.addWorksheet("보고서", {
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 },
      },
      views: [{ showGridLines: false, state: "frozen", ySplit: 2 }],
    });

    [16, 14, 14, 14, 14, 13, 8, 16, 13, 13, 13, 14].forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
    sheet.mergeCells("A1:L1");
    sheet.getCell("A1").value = "KT 인터넷 전체 개통 및 정책 그레이드 보고서";
    sheet.getRow(1).height = 36;
    styleRange(sheet, "A1:L1", {
      fill: COLORS.navy,
      font: { bold: true, size: 18, color: { argb: COLORS.white } },
    });
    sheet.mergeCells("A2:L2");
    const reportDateRange = buildDateRangeLabel(selectedDate, reportMonth);
    sheet.getCell("A2").value = `보고 월 ${reportMonth || "-"}  |  기준: ${reportDateRange}`;
    styleRange(sheet, "A2:L2", {
      fill: COLORS.paleGray,
      font: { bold: true, color: { argb: COLORS.navy } },
      alignment: { horizontal: "right", vertical: "middle" },
    });

    addStatusTable(sheet, 4, "개통 완료 상세 (월 누적)", monthlySummary, "open", comparison);
    addStatusTable(sheet, 10, "가설중 상세 (월 누적)", monthlySummary, "install", comparison);
    addKpiStrip(sheet, 16, summary, comparison);
    addInternetGoalOverview(sheet, 19, comparison);
    sheet.pageSetup.printArea = "A1:L29";
    sheet.pageSetup.horizontalCentered = true;
    [3, 9, 15, 18].forEach((row) => {
      sheet.getRow(row).height = 24;
    });
    sheet.eachRow((reportRow) => {
      reportRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { ...cell.font, name: "맑은 고딕" };
      });
    });
    sheet.headerFooter.oddFooter = "&LKT Grade Report&C&P / &N&R&D";
    return sheet;
  }









  function createTargetPointSheet(workbook, summary, monthlySummary, settings) {
    const sheet = workbook.addWorksheet("목표 포인트", {
      views: [{ showGridLines: false }],
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 },
      },
    });

    // A blank, B label, C~F status data, G~J open-only data.
    [2, 18, 14, 14, 14, 14, 16, 14, 14, 14].forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });

    const targetPoint = number(summary?.target_point) || number(settings?.target_point) || 3500;

    sheet.mergeCells("B2:G2");
    sheet.getCell("B2").value = "2. 유선/무선 결합 매출UP! 정책 (point 목표달성)";
    sheet.getCell("B2").font = { size: 12, name: "맑은 고딕", bold: true };
    sheet.getRow(2).height = 22;

    sheet.mergeCells("B3:G3");
    sheet.getCell("B3").value = `  · 목표 ${targetPoint.toLocaleString()}P - 온라인/도매`;
    sheet.getCell("B3").font = { size: 10, name: "맑은 고딕", color: { argb: "595959" } };
    sheet.getRow(3).height = 18;

    sheet.mergeCells("B5:G5");
    sheet.getCell("B5").value = "정책 그레이드 구간";
    sheet.getCell("B5").font = { size: 11, name: "맑은 고딕", bold: true, color: { argb: COLORS.navy } };
    sheet.getCell("B5").fill = fill("D9E2F3");
    sheet.getCell("B5").alignment = { horizontal: "left", vertical: "middle" };
    sheet.getRow(5).height = 24;

    sheet.mergeCells("B6:B8");
    sheet.getCell("B6").value = "상품 구분";
    sheet.mergeCells("C6:D6");
    sheet.getCell("C6").value = "TV";
    sheet.mergeCells("E6:F6");
    sheet.getCell("E6").value = "M/U";
    sheet.mergeCells("G6:G8");

    setRangeRow(sheet, 7, 3, ["기본단말", "추가단말", "M", "U"], "C7:F7", {
      fill: "F5F6F8",
      font: { name: "맑은 고딕", bold: true, size: 10 },
    });
    setRangeRow(sheet, 8, 3, ["2P", "1P", "2P", "2P"], "C8:F8", {
      fill: "FFFFFF",
      font: { name: "맑은 고딕", size: 10 },
    });

    styleRange(sheet, "B6:G8", {
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      borderColor: COLORS.border,
    });
    styleRange(sheet, "C6:F6", { fill: "D9E2F3", font: { bold: true, name: "맑은 고딕" } });
    styleRange(sheet, "B6:B8", { fill: "E7E6E6", font: { bold: true, name: "맑은 고딕" } });
    [6, 7, 8].forEach(r => { sheet.getRow(r).height = 22; });

    // Pre-calculate status values.
    const mainTvOpen = number(monthlySummary.open_main_tv);
    const extraTvOpen = number(monthlySummary.open_extra_device);
    const muOpen = number(monthlySummary.open_mobile_device) + number(monthlySummary.open_mobile_usim);

    const mainTvInstall = number(monthlySummary.install_main_tv);
    const extraTvInstall = number(monthlySummary.install_extra_device);
    const mInstall = number(monthlySummary.install_mobile_device);
    const uInstall = number(monthlySummary.install_mobile_usim);
    const muInstall = mInstall + uInstall;

    const tvRate = summary.report_closed ? 0 : normalizedRate(settings?.tv_open_rate, summary.tv_open_rate_setting, 75);
    const muRate = summary.report_closed ? 0 : normalizedRate(settings?.usim_open_rate, summary.usim_open_rate_setting, 50);

    const mainTvExpected = Math.floor(mainTvInstall * tvRate);
    const extraTvExpected = Math.floor(extraTvInstall * tvRate);
    const muExpected = Math.floor(mInstall * muRate) + Math.floor(uInstall * muRate);

    const mainTvTotal = mainTvOpen + mainTvExpected;
    const extraTvTotal = extraTvOpen + extraTvExpected;
    const muTotal = muOpen + muExpected;
    const achievedPoint = mainTvTotal * 2 + extraTvTotal + muTotal * 2;
    const actualOpenPoint = mainTvOpen * 2 + extraTvOpen + muOpen * 2;

    // Grade tiers, five items per row.
    let startRow = 9;

    let tvmuTiersList = [];
    try {
      if (settings && settings.tvmu_tiers) {
        const parsed = typeof settings.tvmu_tiers === 'string' ? JSON.parse(settings.tvmu_tiers) : settings.tvmu_tiers;
        tvmuTiersList = parsed.map(t => ({ point: t.point, payment: t.payment }));
      }
    } catch (e) { }

    if (!tvmuTiersList.length) {
      tvmuTiersList = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000].map(p => ({ point: p, payment: p }));
    }

    const points = [];
    for (let i = 0; i < tvmuTiersList.length; i += 5) {
      points.push(tvmuTiersList.slice(i, i + 5));
    }

    points.forEach((rowPoints, idx) => {
      const r1 = startRow + idx * 2;
      const r2 = r1 + 1;
      sheet.getCell(`B${r1}`).value = "Point 합산 구간";
      sheet.getCell(`B${r2}`).value = "지급금액\n(VAT 포함)";

      styleRange(sheet, `B${r1}:G${r2}`, {
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        borderColor: COLORS.border,
      });
      styleRange(sheet, `B${r1}:B${r2}`, { fill: "E7E6E6", font: { name: "맑은 고딕", size: 10, bold: true } });
      styleRange(sheet, `C${r1}:G${r1}`, { fill: "F5F6F8", font: { name: "맑은 고딕", size: 10 } });
      styleRange(sheet, `C${r2}:G${r2}`, { fill: "FFFFFF", font: { name: "맑은 고딕", size: 10 } });

      rowPoints.forEach((p, colIdx) => {
        const col = String.fromCharCode(67 + colIdx); // C~G
        if (p !== null && p !== undefined) {
          sheet.getCell(`${col}${r1}`).value = `${p.point.toLocaleString()} Point`;
          sheet.getCell(`${col}${r2}`).value = `${p.payment.toLocaleString()} 만원`;

          // Highlight achieved tiers.
          if (actualOpenPoint >= p.point) {
            sheet.getCell(`${col}${r1}`).fill = fill("FFE699");
            sheet.getCell(`${col}${r2}`).fill = fill("FFF2CC");
            sheet.getCell(`${col}${r1}`).font = { name: "맑은 고딕", size: 10, bold: true, color: { argb: "C00000" } };
            sheet.getCell(`${col}${r2}`).font = { name: "맑은 고딕", size: 10, bold: true, color: { argb: "C00000" } };
          }
        }
      });

      sheet.getRow(r1).height = 20;
      sheet.getRow(r2).height = 28;
    });

    // Status table.
    const statusRow = startRow + points.length * 2 + 2;

    sheet.mergeCells(`B${statusRow}:E${statusRow}`);
    sheet.getCell(`B${statusRow}`).value = "종합 현황";
    sheet.getCell(`B${statusRow}`).font = { size: 11, name: "맑은 고딕", bold: true, color: { argb: COLORS.navy } };
    sheet.getCell(`B${statusRow}`).fill = fill("D9E2F3");
    sheet.getCell(`B${statusRow}`).alignment = { horizontal: "left", vertical: "middle" };
    sheet.getRow(statusRow).height = 24;

    const statusDataRows = [
      { label: "개통", values: [mainTvOpen, extraTvOpen, muOpen], fill: "FFFFFF", fmt: "count" },
      { label: "가설중", values: [mainTvInstall, extraTvInstall, muInstall], fill: "FFFFFF", fmt: "count" },
      { label: "개통예상", values: [mainTvExpected, extraTvExpected, muExpected], fill: "FFFFFF", fmt: "count" },
      { label: "개통율", values: [tvRate, tvRate, muRate], fill: "FFFFFF", fmt: "pct" },
      { label: "합계", values: [mainTvTotal, extraTvTotal, muTotal], fill: "EAF0F5", fmt: "count" },
      { label: "Point", values: [mainTvTotal * 2, extraTvTotal * 1, muTotal * 2], fill: "FFF2CC", fmt: "point" },
    ];

    setRangeRow(sheet, statusRow + 1, 2,
      ["구분", "기본단말(2P)", "추가단말(1P)", "M/U(2P)"],
      `B${statusRow + 1}:E${statusRow + 1}`,
      { fill: "4472C4", font: { bold: true, color: { argb: "FFFFFF" }, name: "맑은 고딕" } }
    );
    sheet.getRow(statusRow + 1).height = 24;

    statusDataRows.forEach(({ label, values, fill: rowFill, fmt }, i) => {
      const r = statusRow + 2 + i;
      setRangeRow(sheet, r, 2, [label, ...values], `B${r}:E${r}`, { fill: rowFill });
      sheet.getCell(`B${r}`).fill = fill("E7E6E6");
      sheet.getCell(`B${r}`).font = { bold: true, name: "맑은 고딕" };
      for (let c = 3; c <= 5; c++) {
        const cell = sheet.getCell(r, c);
        if (fmt === "pct") cell.numFmt = "0%";
        else if (fmt === "point") cell.numFmt = "#,##0\" P\"";
        else cell.numFmt = "#,##0\" 건\"";
      }
      sheet.getRow(r).height = 24;
    });

    const totalPointRow = statusRow + 8;
    setRangeRow(sheet, totalPointRow, 2, ["총합Point", "", "", ""], `B${totalPointRow}:E${totalPointRow}`, { fill: "F5F6F8" });
    sheet.getCell(`B${totalPointRow}`).font = { bold: true, name: "맑은 고딕" };
    sheet.getCell(`B${totalPointRow}`).fill = fill("E7E6E6");
    sheet.mergeCells(`C${totalPointRow}:E${totalPointRow}`);
    sheet.getCell(`C${totalPointRow}`).value = mainTvTotal * 2 + extraTvTotal + muTotal * 2;
    sheet.getCell(`C${totalPointRow}`).font = { bold: true, size: 12, color: { argb: "C00000" }, name: "맑은 고딕" };
    sheet.getCell(`C${totalPointRow}`).numFmt = "#,##0\" P\"";
    sheet.getRow(totalPointRow).height = 26;

    styleRange(sheet, `B${statusRow + 1}:E${totalPointRow}`, {
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      borderColor: COLORS.border,
    });

    sheet.mergeCells(`G${statusRow}:J${statusRow}`);
    sheet.getCell(`G${statusRow}`).value = "순개통 Point";
    sheet.getCell(`G${statusRow}`).font = { size: 11, name: "맑은 고딕", bold: true, color: { argb: COLORS.navy } };
    sheet.getCell(`G${statusRow}`).fill = fill("D9E2F3");
    sheet.getCell(`G${statusRow}`).alignment = { horizontal: "left", vertical: "middle" };

    setRangeRow(sheet, statusRow + 1, 7,
      ["구분", "기본단말(2P)", "추가단말(1P)", "M/U(2P)"],
      `G${statusRow + 1}:J${statusRow + 1}`,
      { fill: "4472C4", font: { bold: true, color: { argb: "FFFFFF" }, name: "맑은 고딕" } }
    );

    setRangeRow(sheet, statusRow + 2, 7,
      ["개통", mainTvOpen, extraTvOpen, muOpen],
      `G${statusRow + 2}:J${statusRow + 2}`,
      { fill: "FFFFFF" }
    );
    sheet.getCell(`G${statusRow + 2}`).fill = fill("E7E6E6");
    sheet.getCell(`G${statusRow + 2}`).font = { bold: true, name: "맑은 고딕" };
    for (let c = 8; c <= 10; c++) sheet.getCell(statusRow + 2, c).numFmt = "#,##0\" 건\"";

    setRangeRow(sheet, statusRow + 3, 7,
      ["Point", mainTvOpen * 2, extraTvOpen * 1, muOpen * 2],
      `G${statusRow + 3}:J${statusRow + 3}`,
      { fill: "FFF2CC" }
    );
    sheet.getCell(`G${statusRow + 3}`).fill = fill("E7E6E6");
    sheet.getCell(`G${statusRow + 3}`).font = { bold: true, name: "맑은 고딕" };
    for (let c = 8; c <= 10; c++) sheet.getCell(statusRow + 3, c).numFmt = "#,##0\" P\"";

    setRangeRow(sheet, statusRow + 4, 7, ["총합Point", "", "", ""], `G${statusRow + 4}:J${statusRow + 4}`, { fill: "F5F6F8" });
    sheet.getCell(`G${statusRow + 4}`).fill = fill("E7E6E6");
    sheet.getCell(`G${statusRow + 4}`).font = { bold: true, name: "맑은 고딕" };
    sheet.mergeCells(`H${statusRow + 4}:J${statusRow + 4}`);
    sheet.getCell(`H${statusRow + 4}`).value = mainTvOpen * 2 + extraTvOpen + muOpen * 2;
    sheet.getCell(`H${statusRow + 4}`).font = { bold: true, size: 12, color: { argb: "C00000" }, name: "맑은 고딕" };
    sheet.getCell(`H${statusRow + 4}`).numFmt = "#,##0\" P\"";
    sheet.getRow(statusRow + 4).height = 26;

    styleRange(sheet, `G${statusRow + 1}:J${statusRow + 4}`, {
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      borderColor: COLORS.border,
    });
    [statusRow + 2, statusRow + 3].forEach(r => { sheet.getRow(r).height = 24; });

    sheet.eachRow(row => {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.font = { ...cell.font, name: "맑은 고딕" };
      });
    });

    return sheet;
  }

  function createMobileTargetSheet(workbook, summary, monthlySummary, comparison, settings) {
    const sheet = workbook.addWorksheet("모바일 목표", {
      views: [{ showGridLines: false }],
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 },
      },
    });

    // A blank, B label, C~H data, I blank, J~M weighted guide.
    [2, 16, 13, 13, 13, 13, 13, 13, 3, 22, 13, 13, 13].forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });

    const muTarget = number(summary?.mu_target_count) || number(settings?.mu_target_count) || 600;

    sheet.mergeCells("B2:H2");
    sheet.getCell("B2").value = "3. 모바일 단말/유심(U) 목표달성 프로그램";
    sheet.getCell("B2").font = { size: 12, name: "맑은 고딕", bold: true };
    sheet.getRow(2).height = 22;

    sheet.mergeCells("B3:H3");
    sheet.getCell("B3").value = `  · M/U 목표 구간 : ${muTarget.toLocaleString()} 건`;
    sheet.getCell("B3").font = { size: 10, name: "맑은 고딕", color: { argb: "595959" } };
    sheet.getRow(3).height = 18;

    sheet.mergeCells("B5:H5");
    sheet.getCell("B5").value = "정책 그레이드 구간";
    sheet.getCell("B5").font = { size: 11, name: "맑은 고딕", bold: true, color: { argb: COLORS.navy } };
    sheet.getCell("B5").fill = fill("D9E2F3");
    sheet.getCell("B5").alignment = { horizontal: "left", vertical: "middle" };
    sheet.getRow(5).height = 24;

    // Pre-calculate status values.
    const mOpen = number(monthlySummary.open_mobile_device);
    const uOpen = number(monthlySummary.open_mobile_usim);
    const mInstall = number(monthlySummary.install_mobile_device);
    const uInstall = number(monthlySummary.install_mobile_usim);

    const uRate = summary.report_closed ? 0 : normalizedRate(settings?.usim_open_rate, summary.usim_open_rate_setting, 50);
    const mRate = summary.report_closed ? 0 : normalizedRate(settings?.device_open_rate, summary.device_open_rate_setting, 50);

    const mExpected = Math.floor(mInstall * mRate);
    const uExpected = Math.floor(uInstall * uRate);

    const mTotal = mOpen + mExpected;
    const uTotal = uOpen + uExpected;
    const combinedTotal = mTotal + uTotal;
    const actualMuOpen = mOpen + uOpen;

    // Grade tiers, six items per row.
    let muTiersList = [];
    try {
      if (settings && settings.mu_tiers) {
        const parsed = typeof settings.mu_tiers === 'string' ? JSON.parse(settings.mu_tiers) : settings.mu_tiers;
        muTiersList = parsed.map(t => ({ count: t.count, payment: t.payment }));
      }
    } catch (e) { }

    if (!muTiersList.length) {
      muTiersList = [100, 200, 300, 450, 600, 750, 900, 1050, 1200, 1350, 1500, 1650, 1800, 1950, 2100, 2250, 2400, 2650].map(c => ({ count: c, payment: c * 10 }));
    }

    const muRanges = [];
    for (let i = 0; i < muTiersList.length; i += 6) {
      muRanges.push(muTiersList.slice(i, i + 6));
    }

    let startRow = 6;
    muRanges.forEach((rowRanges, idx) => {
      const r1 = startRow + idx * 2;
      const r2 = r1 + 1;
      sheet.getCell(`B${r1}`).value = "M/U 구간";
      sheet.getCell(`B${r2}`).value = "지급금액\n(VAT 포함)";

      styleRange(sheet, `B${r1}:H${r2}`, {
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        borderColor: COLORS.border,
      });
      styleRange(sheet, `B${r1}:B${r2}`, {
        fill: "E7E6E6",
        font: { name: "맑은 고딕", size: 10, bold: true },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      });
      styleRange(sheet, `C${r1}:H${r1}`, { fill: "F5F6F8", font: { name: "맑은 고딕", size: 10 } });
      styleRange(sheet, `C${r2}:H${r2}`, { fill: "FFFFFF", font: { name: "맑은 고딕", size: 10 } });

      rowRanges.forEach((p, colIdx) => {
        const col = String.fromCharCode(67 + colIdx); // C..H
        if (p !== null && p !== undefined) {
          sheet.getCell(`${col}${r1}`).value = `${p.count.toLocaleString()} 건`;
          sheet.getCell(`${col}${r2}`).value = `${p.payment.toLocaleString()} 만원`;

          // Highlight achieved tiers.
          if (actualMuOpen >= p.count) {
            sheet.getCell(`${col}${r1}`).fill = fill("FFE699");
            sheet.getCell(`${col}${r2}`).fill = fill("FFF2CC");
            sheet.getCell(`${col}${r1}`).font = { name: "맑은 고딕", size: 10, bold: true, color: { argb: "C00000" } };
            sheet.getCell(`${col}${r2}`).font = { name: "맑은 고딕", size: 10, bold: true, color: { argb: "C00000" } };
          }
        }
      });

      sheet.getRow(r1).height = 20;
      sheet.getRow(r2).height = 28;
    });

    // M/U ratio weight guide.
    const rRatio1 = startRow + muRanges.length * 2;
    const rRatio2 = rRatio1 + 1;

    sheet.getCell(`B${rRatio1}`).value = "인터넷 대비\nM/U 비중";
    sheet.getCell(`B${rRatio2}`).value = "가중치";
    styleRange(sheet, `B${rRatio1}:B${rRatio2}`, {
      fill: "E7E6E6",
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      font: { name: "맑은 고딕", size: 10, bold: true },
      borderColor: COLORS.border,
    });

    const ratioWeights = [105, 108, 110, 113, 115];
    [20, 25, 30, 35, 40].forEach((p, idx) => {
      const col = String.fromCharCode(67 + idx); // C..G
      sheet.getCell(`${col}${rRatio1}`).value = `${p}%`;
      sheet.getCell(`${col}${rRatio2}`).value = `지급금액 x ${ratioWeights[idx]}%`;
    });

    sheet.mergeCells(`H${rRatio1}:H${rRatio2}`);
    sheet.getCell(`H${rRatio1}`).fill = fill("E7E6E6");

    styleRange(sheet, `C${rRatio1}:H${rRatio2}`, {
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      borderColor: COLORS.border,
    });
    styleRange(sheet, `C${rRatio1}:G${rRatio1}`, { fill: "F5F6F8", font: { name: "맑은 고딕", size: 10 } });
    styleRange(sheet, `C${rRatio2}:G${rRatio2}`, { fill: "FFFFFF", font: { name: "맑은 고딕", size: 10 } });
    sheet.getRow(rRatio1).height = 28;
    sheet.getRow(rRatio2).height = 24;

    // Status table.
    const statusRow = rRatio2 + 2;

    sheet.mergeCells(`B${statusRow}:D${statusRow}`);
    sheet.getCell(`B${statusRow}`).value = "종합 현황";
    sheet.getCell(`B${statusRow}`).font = { size: 11, name: "맑은 고딕", bold: true, color: { argb: COLORS.navy } };
    sheet.getCell(`B${statusRow}`).fill = fill("D9E2F3");
    sheet.getCell(`B${statusRow}`).alignment = { horizontal: "left", vertical: "middle" };
    sheet.getRow(statusRow).height = 24;

    const mDiff = comparison?.current && comparison?.previous ? mOpen - number(comparison.previous.open_mobile_device) : 0;
    const uDiff = comparison?.current && comparison?.previous ? uOpen - number(comparison.previous.open_mobile_usim) : 0;

    setRangeRow(sheet, statusRow + 1, 2,
      ["구분", "U", "M"],
      `B${statusRow + 1}:D${statusRow + 1}`,
      { fill: "4472C4", font: { bold: true, color: { argb: "FFFFFF" }, name: "맑은 고딕" } }
    );
    sheet.getRow(statusRow + 1).height = 24;

    const statusRows = [
      { label: "개통", vals: [uOpen, mOpen], fmt: "count", bg: "FFFFFF" },
      { label: "개통(직전대비)", vals: [`+${uDiff}건`, `+${mDiff}건`], fmt: "text", bg: "FFFFFF" },
      { label: "개통대기", vals: [uInstall, mInstall], fmt: "count", bg: "FFFFFF" },
      { label: "개통예상", vals: [uExpected, mExpected], fmt: "count", bg: "FFFFFF" },
      { label: "개통율", vals: [uRate, mRate], fmt: "pct", bg: "FFFFFF" },
      { label: "총합", vals: [null, null], fmt: "merged", bg: "EAF0F5" },
    ];

    statusRows.forEach(({ label, vals, fmt, bg }, i) => {
      const r = statusRow + 2 + i;
      if (fmt === "merged") {
        setRangeRow(sheet, r, 2, [label, "", ""], `B${r}:D${r}`, { fill: bg });
        sheet.mergeCells(`C${r}:D${r}`);
        sheet.getCell(`C${r}`).value = combinedTotal;
        sheet.getCell(`C${r}`).font = { bold: true, size: 12, color: { argb: "C00000" }, name: "맑은 고딕" };
        sheet.getCell(`C${r}`).numFmt = "#,##0\" 건\"";
      } else {
        setRangeRow(sheet, r, 2, [label, ...vals], `B${r}:D${r}`, { fill: bg });
        for (let c = 3; c <= 4; c++) {
          const cell = sheet.getCell(r, c);
          if (fmt === "pct") cell.numFmt = "0%";
          else if (fmt === "count") cell.numFmt = "#,##0\" 건\"";
        }
      }
      sheet.getCell(`B${r}`).fill = fill("E7E6E6");
      sheet.getCell(`B${r}`).font = { bold: true, name: "맑은 고딕" };
      sheet.getRow(r).height = 26;
    });

    const bDays = number(comparison?.remainingBusinessDays) || 1;
    const totalOpen = mOpen + uOpen;
    const pDays = number(summary.passed_business_days) || 13;
    const dailyAvg = Math.round(totalOpen / pDays);
    const avgRow = statusRow + 8;

    sheet.mergeCells(`B${avgRow}:D${avgRow}`);
    sheet.getCell(`B${avgRow}`).value = `일 평균 개통 ${dailyAvg} 건 (${totalOpen}/${pDays}일)`;
    sheet.getCell(`B${avgRow}`).font = { name: "맑은 고딕", size: 10, color: { argb: "595959" } };
    sheet.getCell(`B${avgRow}`).fill = fill("F5F6F8");
    sheet.getCell(`B${avgRow}`).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(avgRow).height = 24;

    styleRange(sheet, `B${statusRow + 1}:D${avgRow}`, {
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      borderColor: COLORS.border,
    });

    // Weight guide.
    const compRateStr = monthlySummary.expected_internet > 0
      ? Math.floor((number(monthlySummary.main_dongpan_usim) / monthlySummary.expected_internet) * 100)
      : 0;

    sheet.mergeCells(`F${statusRow}:I${statusRow}`);
    sheet.getCell(`F${statusRow}`).value = `인터넷 대비 M/U 비율 : ${compRateStr}% 예상`;
    sheet.getCell(`F${statusRow}`).font = { size: 11, name: "맑은 고딕", bold: true, color: { argb: COLORS.navy } };
    sheet.getCell(`F${statusRow}`).fill = fill("D9E2F3");
    sheet.getCell(`F${statusRow}`).alignment = { horizontal: "left", vertical: "middle" };

    sheet.mergeCells(`F${statusRow + 1}:I${statusRow + 1}`);
    sheet.getCell(`F${statusRow + 1}`).value = "비율에 따른 지급금액의 가중치";
    sheet.getCell(`F${statusRow + 1}`).font = { bold: true, name: "맑은 고딕", color: { argb: COLORS.navy } };
    sheet.getCell(`F${statusRow + 1}`).fill = fill("E7E6E6");
    sheet.getCell(`F${statusRow + 1}`).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(statusRow + 1).height = 24;

    const weights2 = [
      "20% : 지급금액 x 105%",
      "25% : 지급금액 x 108%",
      "30% : 지급금액 x 110%",
      "35% : 지급금액 x 113%",
      "40% : 지급금액 x 115%",
    ];

    weights2.forEach((w, idx) => {
      const wr = statusRow + 2 + idx;
      sheet.mergeCells(`F${wr}:I${wr}`);
      sheet.getCell(`F${wr}`).value = w;
      sheet.getCell(`F${wr}`).font = { name: "맑은 고딕", size: 10 };
      sheet.getCell(`F${wr}`).fill = fill(idx % 2 === 0 ? "F5F6F8" : "FFFFFF");
      sheet.getCell(`F${wr}`).alignment = { horizontal: "center", vertical: "middle" };
      sheet.getCell(`F${wr}`).border = border("FFC000");
      sheet.getRow(wr).height = 26;
    });

    const neededStr = Math.round(uRate * 100);
    const adjustedTarget = uRate > 0 ? Math.ceil(muTarget / uRate) : muTarget;
    const rawRemaining = adjustedTarget - combinedTotal;
    const remaining = Math.max(rawRemaining, 0);
    const dailyNeeded = Math.floor(remaining / bDays);
    const targetLabel = uRate > 0
      ? `${muTarget.toLocaleString()} / 개통율 ${neededStr}%`
      : `${muTarget.toLocaleString()}`;

    const needRow1 = statusRow + 7;
    sheet.mergeCells(`F${needRow1}:I${needRow1}`);
    sheet.getCell(`F${needRow1}`).value = remaining > 0
      ? `${targetLabel} - ${combinedTotal.toLocaleString()} = ${remaining.toLocaleString()} 건 필요`
      : `${targetLabel} - ${combinedTotal.toLocaleString()} = ${remaining.toLocaleString()} 목표 달성 완료`;
    sheet.getCell(`F${needRow1}`).font = { color: { argb: "C00000" }, bold: true, name: "맑은 고딕", size: 10 };
    sheet.getCell(`F${needRow1}`).fill = fill("FFF2CC");
    sheet.getCell(`F${needRow1}`).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sheet.getCell(`F${needRow1}`).border = border("FFC000");
    sheet.getRow(needRow1).height = 28;

    const needRow2 = statusRow + 8;
    sheet.mergeCells(`F${needRow2}:I${needRow2}`);
    sheet.getCell(`F${needRow2}`).value = remaining > 0
      ? `${remaining.toLocaleString()} / ${bDays} = 일 ${dailyNeeded.toLocaleString()} 건 필요`
      : "추가 필요 건수 없음";
    sheet.getCell(`F${needRow2}`).font = { color: { argb: "C00000" }, bold: true, name: "맑은 고딕", size: 10 };
    sheet.getCell(`F${needRow2}`).fill = fill("FFF2CC");
    sheet.getCell(`F${needRow2}`).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(`F${needRow2}`).border = border("FFC000");
    sheet.getRow(needRow2).height = 26;

    sheet.eachRow(row => {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.font = { ...cell.font, name: "맑은 고딕" };
      });
    });

    return sheet;
  }

  function saveBlob(buffer, filename) {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function download({ summary, rows, selectedDate, cutoffDate, reportMonth, settings }) {
    if (!window.ExcelJS) {
      throw new Error("엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.");
    }
    const workbook = new window.ExcelJS.Workbook();
    workbook.creator = "KT Grade Report";
    workbook.created = new Date();
    workbook.modified = new Date();
    const effectiveCutoff = cutoffDate || getReportCutoffDate(selectedDate, reportMonth);
    const comparison = createDailyComparison(rows, summary || {}, selectedDate, settings, effectiveCutoff, reportMonth);
    comparison.dateRangeLabel = buildDateRangeLabel(selectedDate, reportMonth, effectiveCutoff);
    const reportSummary = comparison.current ? { ...comparison.current } : { ...(summary || {}) };
    if (summary) {
      [
        "target_count", "online_target_count", "mu_target_count", "target_point",
        "internet_open_rate_setting", "tv_open_rate_setting",
        "usim_open_rate_setting", "device_open_rate_setting", "partner_data",
        "report_month", "report_closed"
      ].forEach(k => {
        if (summary[k] !== undefined) reportSummary[k] = summary[k];
      });
    }
    const monthlySummary = computeMonthlySummary(rows, selectedDate, reportSummary, settings, reportMonth, effectiveCutoff);
    createReportSheet(workbook, reportSummary, selectedDate, reportMonth, comparison, monthlySummary);
    createTargetPointSheet(workbook, reportSummary, monthlySummary, settings);
    createMobileTargetSheet(workbook, reportSummary, monthlySummary, comparison, settings);
    const buffer = await workbook.xlsx.writeBuffer();
    saveBlob(buffer, `KT_그레이드_보고서_${reportMonth || selectedDate || "report"}.xlsx`);
  }

  window.KTReportExporter = Object.freeze({ download });
})();

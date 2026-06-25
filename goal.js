/* ============================================================
   goal.js — 목표달성 페이지 전용 스크립트
   ============================================================ */
(function () {
  "use strict";

  /* ──────────────────────────────────────────────
     1. 정책 구간 데이터
  ────────────────────────────────────────────── */

  /**
   * ① TV + M/U 합산 Point 목표달성
   *    TV 기본단말 2P · TV 추가단말 1P · M(기기) 2P · U(유심) 2P
   *    500P 단위, 지급금액 = Point 수와 동일(만원)
   */
  let TVMU_TIERS = [
    { point: 500,   payment: 500   },
    { point: 1000,  payment: 1000  },
    { point: 1500,  payment: 1500  },
    { point: 2000,  payment: 2000  },
    { point: 2500,  payment: 2500  },
    { point: 3000,  payment: 3000  },
    { point: 3500,  payment: 3500  },
    { point: 4000,  payment: 4000  },
    { point: 4500,  payment: 4500  },
    { point: 5000,  payment: 5000  },
    { point: 5500,  payment: 5500  },
    { point: 6000,  payment: 6000  },
    { point: 6500,  payment: 6500  },
    { point: 7000,  payment: 7000  },
    { point: 7500,  payment: 7500  },
    { point: 8000,  payment: 8000  },
    { point: 8500,  payment: 8500  },
    { point: 9000,  payment: 9000  },
    { point: 9500,  payment: 9500  },
    { point: 10000, payment: 10000 },
    { point: 10500, payment: 10500 },
    { point: 11000, payment: 11000 },
    { point: 11500, payment: 11500 },
    { point: 12000, payment: 12000 },
  ];

  /**
   * ② 도매 온라인 M/U 목표달성 프로그램
   *    M/U 합산 개통완료 건수 기준
   */
  let MU_TIERS = [
    { count: 100,  payment: 1000  },
    { count: 200,  payment: 2000  },
    { count: 300,  payment: 3000  },
    { count: 450,  payment: 4500  },
    { count: 600,  payment: 6000  },
    { count: 750,  payment: 7500  },
    { count: 900,  payment: 9000  },
    { count: 1050, payment: 10500 },
    { count: 1200, payment: 12000 },
    { count: 1350, payment: 13500 },
    { count: 1500, payment: 15000 },
    { count: 1650, payment: 16500 },
    { count: 1800, payment: 18000 },
    { count: 1950, payment: 19500 },
    { count: 2100, payment: 21000 },
    { count: 2250, payment: 22500 },
    { count: 2400, payment: 24000 },
    { count: 2650, payment: 26500 },
  ];

  /* ──────────────────────────────────────────────
     2. 구간 테이블 렌더링 (① TV+MU)
     사진과 동일하게 5열씩 2행(구간, 지급금액)으로 구성
  ────────────────────────────────────────────── */
  const TVMU_COLS = 5; // 한 행에 구간 5개씩

  function buildTvmuTable(currentPoint) {
    const tbody = document.getElementById("tvmuGradeBody");
    if (!tbody) return;

    const currentTier = getCurrentTvmuTier(currentPoint);
    const rows = [];

    for (let i = 0; i < TVMU_TIERS.length; i += TVMU_COLS) {
      const slice = TVMU_TIERS.slice(i, i + TVMU_COLS);

      // 구간 행
      const tierTr = document.createElement("tr");
      tierTr.className = "grade-tier-row";
      const tierLabelTd = document.createElement("td");
      tierLabelTd.className = "grade-row-label";
      tierLabelTd.textContent = "Point 합산 구간";
      tierTr.appendChild(tierLabelTd);
      slice.forEach((tier) => {
        const td = document.createElement("td");
        td.textContent = `${tier.point.toLocaleString("ko-KR")} Point`;
        if (currentTier && tier.point === currentTier.point) {
          td.className = "tier-active";
        } else if (currentPoint >= tier.point) {
          td.className = "tier-passed";
        }
        tierTr.appendChild(td);
      });
      // 열 수 맞춤 (마지막 그룹이 5개 미만일 때)
      for (let pad = slice.length; pad < TVMU_COLS; pad++) {
        tierTr.appendChild(document.createElement("td"));
      }
      rows.push(tierTr);

      // 지급금액 행
      const payTr = document.createElement("tr");
      payTr.className = "grade-pay-row";
      const payLabelTd = document.createElement("td");
      payLabelTd.className = "grade-row-label grade-pay-label";
      payLabelTd.innerHTML = "지급금액<span>(VAT 포함)</span>";
      payTr.appendChild(payLabelTd);
      slice.forEach((tier) => {
        const td = document.createElement("td");
        td.className = "pay-cell";
        td.textContent = `${tier.payment.toLocaleString("ko-KR")} 만원`;
        if (currentTier && tier.point === currentTier.point) {
          td.className = "pay-cell tier-active-pay";
        } else if (currentPoint >= tier.point) {
          td.className = "pay-cell tier-passed-pay";
        }
        payTr.appendChild(td);
      });
      for (let pad = slice.length; pad < TVMU_COLS; pad++) {
        const td = document.createElement("td");
        td.className = "pay-cell";
        payTr.appendChild(td);
      }
      rows.push(payTr);

      // 구분선용 빈 행
      if (i + TVMU_COLS < TVMU_TIERS.length) {
        const sep = document.createElement("tr");
        sep.className = "grade-sep-row";
        for (let s = 0; s <= TVMU_COLS; s++) sep.appendChild(document.createElement("td"));
        rows.push(sep);
      }
    }

    tbody.innerHTML = "";
    rows.forEach((r) => tbody.appendChild(r));
  }

  /* ──────────────────────────────────────────────
     3. 구간 테이블 렌더링 (② M/U)
     사진과 동일하게 6열씩 2행(구간, 지급금액)으로 구성
  ────────────────────────────────────────────── */
  const MU_COLS = 6;

  function buildMuTable(currentCount) {
    const tbody = document.getElementById("muGradeBody");
    if (!tbody) return;

    // 헤더 동적 업데이트
    const table = document.getElementById("muGradeTable");
    const thead = table?.querySelector("thead");
    if (thead) {
      // 헤더는 HTML에 고정이므로 현재 활성 구간 강조만 처리
      const headerCells = thead.querySelectorAll("th:not(:first-child)");
      headerCells.forEach((th, idx) => {
        const tier = MU_TIERS[idx];
        if (!tier) return;
        const currentTier = getCurrentMuTier(currentCount);
        th.classList.remove("th-active", "th-passed");
        th.textContent = `${tier.count.toLocaleString("ko-KR")} 건`;
        if (currentCount >= tier.count) {
          th.classList.add("th-passed");
        }
        if (currentTier && tier.count === currentTier.count) {
          th.classList.add("th-active");
        }
      });
    }

    const currentTier = getCurrentMuTier(currentCount);
    const rows = [];

    for (let i = 0; i < MU_TIERS.length; i += MU_COLS) {
      const slice = MU_TIERS.slice(i, i + MU_COLS);

      // 구간 행
      const tierTr = document.createElement("tr");
      tierTr.className = "grade-tier-row";
      const tierLabelTd = document.createElement("td");
      tierLabelTd.className = "grade-row-label";
      tierLabelTd.textContent = "M/U 구간";
      tierTr.appendChild(tierLabelTd);
      slice.forEach((tier) => {
        const td = document.createElement("td");
        td.textContent = `${tier.count.toLocaleString("ko-KR")} 건`;
        if (currentTier && tier.count === currentTier.count) {
          td.className = "tier-active";
        } else if (currentCount >= tier.count) {
          td.className = "tier-passed";
        }
        tierTr.appendChild(td);
      });
      for (let pad = slice.length; pad < MU_COLS; pad++) {
        tierTr.appendChild(document.createElement("td"));
      }
      rows.push(tierTr);

      // 지급금액 행
      const payTr = document.createElement("tr");
      payTr.className = "grade-pay-row";
      const payLabelTd = document.createElement("td");
      payLabelTd.className = "grade-row-label grade-pay-label";
      payLabelTd.innerHTML = "지급금액<span>(VAT 포함)</span>";
      payTr.appendChild(payLabelTd);
      slice.forEach((tier) => {
        const td = document.createElement("td");
        td.textContent = `${tier.payment.toLocaleString("ko-KR")} 만원`;
        if (currentTier && tier.count === currentTier.count) {
          td.className = "pay-cell tier-active-pay";
        } else if (currentCount >= tier.count) {
          td.className = "pay-cell tier-passed-pay";
        } else {
          td.className = "pay-cell";
        }
        payTr.appendChild(td);
      });
      for (let pad = slice.length; pad < MU_COLS; pad++) {
        const td = document.createElement("td");
        td.className = "pay-cell";
        payTr.appendChild(td);
      }
      rows.push(payTr);

      if (i + MU_COLS < MU_TIERS.length) {
        const sep = document.createElement("tr");
        sep.className = "grade-sep-row";
        for (let s = 0; s <= MU_COLS; s++) sep.appendChild(document.createElement("td"));
        rows.push(sep);
      }
    }

    tbody.innerHTML = "";
    rows.forEach((r) => tbody.appendChild(r));
  }

  /* ──────────────────────────────────────────────
     4. 구간 산출 함수
  ────────────────────────────────────────────── */

  /** 현재 Point에 해당하는 달성 구간 반환 (초과 포함, 가장 높은 달성 구간) */
  function getCurrentTvmuTier(currentPoint) {
    let tier = null;
    for (const t of TVMU_TIERS) {
      if (currentPoint >= t.point) tier = t;
    }
    return tier;
  }

  /** 현재 건수에 해당하는 달성 구간 반환 */
  function getCurrentMuTier(currentCount) {
    let tier = null;
    for (const t of MU_TIERS) {
      if (currentCount >= t.count) tier = t;
    }
    return tier;
  }

  /** 다음 구간 반환 (현재 달성 구간 초과 후 다음 목표) */
  function getNextTvmuTier(currentPoint) {
    for (const t of TVMU_TIERS) {
      if (currentPoint < t.point) return t;
    }
    return null;
  }

  function getNextMuTier(currentCount) {
    for (const t of MU_TIERS) {
      if (currentCount < t.count) return t;
    }
    return null;
  }

  /* ──────────────────────────────────────────────
     5. 배너 렌더링
  ────────────────────────────────────────────── */
  function renderBanner(tvmuPoint, muCount) {
    const tvmuTier = getCurrentTvmuTier(tvmuPoint);
    const muTier = getCurrentMuTier(muCount);
    const nextTvmu = getNextTvmuTier(tvmuPoint);
    const nextMu = getNextMuTier(muCount);

    setText("tvmuPointView", `${tvmuPoint.toLocaleString("ko-KR")} P`);
    if (tvmuTier) {
      setText("tvmuTierView", `${tvmuTier.point.toLocaleString("ko-KR")} P 달성`);
      setText("tvmuPaymentView", `지급금액: ${tvmuTier.payment.toLocaleString("ko-KR")} 만원 (VAT포함)`);
    } else {
      setText("tvmuTierView", "미달성");
      setText("tvmuPaymentView", nextTvmu ? `다음 구간: ${nextTvmu.point.toLocaleString("ko-KR")} P` : "-");
    }

    setText("muCountView", `${muCount.toLocaleString("ko-KR")} 건`);
    if (muTier) {
      setText("muTierView", `${muTier.count.toLocaleString("ko-KR")} 건 달성`);
      setText("muPaymentView", `지급금액: ${muTier.payment.toLocaleString("ko-KR")} 만원 (VAT포함)`);
    } else {
      setText("muTierView", "미달성");
      setText("muPaymentView", nextMu ? `다음 구간: ${nextMu.count.toLocaleString("ko-KR")} 건` : "-");
    }

    // 다음 목표 안내 (배너 추가 정보)
    if (nextTvmu) {
      const gap = nextTvmu.point - tvmuPoint;
      const el = document.getElementById("tvmuTierView");
      if (el && tvmuTier) {
        el.title = `다음 구간까지 ${gap.toLocaleString("ko-KR")} P 남음`;
      }
    }
    if (nextMu) {
      const gap = nextMu.count - muCount;
      const el = document.getElementById("muTierView");
      if (el && muTier) {
        el.title = `다음 구간까지 ${gap.toLocaleString("ko-KR")} 건 남음`;
      }
    }
  }

  /* ──────────────────────────────────────────────
     6. 데이터 로드 및 계산
  ────────────────────────────────────────────── */
  const STORAGE_KEYS = {
    localRows: "kt-dashboard-local-rows",
    cachedRows: "kt-dashboard-cached-rows",
    settings: "kt-dashboard-settings",
  };

  function getRows() {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEYS.cachedRows) || "[]");
      if (cached.length) return cached;
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.localRows) || "[]");
    } catch {
      return [];
    }
  }

  function getMonthKey(dateText) {
    return String(dateText || "").slice(0, 7);
  }

  function toNum(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function computeStats(rows, selectedMonth) {
    const month = selectedMonth || "";
    const filtered = rows
      .filter((r) => r && r.date && (!month || getMonthKey(r.date) === month))
    const lastRow = filtered.length ? filtered[filtered.length - 1] : null;
    let openMainTv = 0;
    let openExtraDevice = 0;
    let openMobileDevice = 0;
    let openMobileUsim = 0;

    if (lastRow) {
      openMainTv = toNum(lastRow.open_main_tv);
      openExtraDevice = toNum(lastRow.open_extra_device);
      openMobileDevice = toNum(lastRow.open_mobile_device);
      openMobileUsim = toNum(lastRow.open_mobile_usim);
    }

    // TV+MU 합산 Point (개통완료 기준)
    const tvPoint = openMainTv * 2 + openExtraDevice * 1;
    const muPoint = (openMobileDevice + openMobileUsim) * 2;
    const tvmuPoint = tvPoint + muPoint;

    // M/U 건수 (개통완료 기준)
    const muCount = openMobileDevice + openMobileUsim;

    // Extract target values from the last row if present
    const targetPoint = lastRow && lastRow.target_point !== undefined && lastRow.target_point !== "" ? toNum(lastRow.target_point) : null;
    const muTargetCount = lastRow && lastRow.mu_target_count !== undefined && lastRow.mu_target_count !== "" ? toNum(lastRow.mu_target_count) : null;

    return { 
      tvmuPoint, 
      muCount, 
      lastDate: filtered.length ? filtered[filtered.length - 1].date : "-",
      targetPoint,
      muTargetCount
    };
  }

  /* ──────────────────────────────────────────────
     7. 전체 렌더링
  ────────────────────────────────────────────── */
  function render() {
    const selectedMonth = document.getElementById("reportMonth")?.value || "";
    const rows = getRows();
    const { tvmuPoint, muCount, lastDate, targetPoint, muTargetCount } = computeStats(rows, selectedMonth);

    setText("dataStatusView", lastDate);
    
    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
    } catch (e) {}

    // Apply custom tiers if present in settings
    if (typeof parseTiers === "function") {
      let parsedTvmu = [];
      let parsedMu = [];
      try {
        if (settings.tvmu_tiers) parsedTvmu = typeof settings.tvmu_tiers === 'string' ? parseTiers(settings.tvmu_tiers, false) : settings.tvmu_tiers;
      } catch (e) {}
      try {
        if (settings.mu_tiers) parsedMu = typeof settings.mu_tiers === 'string' ? parseTiers(settings.mu_tiers, true) : settings.mu_tiers;
      } catch (e) {}
      setTiers(parsedTvmu, parsedMu);
    }
    
    const finalMuTargetCount = muTargetCount !== null ? muTargetCount : (settings.mu_target_count !== undefined ? Number(settings.mu_target_count) : 600);
    const finalTargetPoint = targetPoint !== null ? targetPoint : (settings.target_point !== undefined ? Number(settings.target_point) : 3500);

    const goalMuLabel = document.getElementById("goalMuTargetLabel");
    if (goalMuLabel) {
      goalMuLabel.textContent = `M/U 목표 구간: ${finalMuTargetCount.toLocaleString("ko-KR")}건`;
    }
    const goalPointLabel = document.getElementById("goalPointTargetLabel");
    if (goalPointLabel) {
      goalPointLabel.textContent = `목표 ${finalTargetPoint.toLocaleString("ko-KR")}P`;
    }
    
    renderBanner(tvmuPoint, muCount);
    buildTvmuTable(tvmuPoint);
    buildMuTable(muCount);
  }

  /* ──────────────────────────────────────────────
     8. 유틸
  ────────────────────────────────────────────── */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function getMonthKeyFromDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  /* ──────────────────────────────────────────────
     9. 초기화 및 이벤트 바인딩
  ────────────────────────────────────────────── */
  // 구글 시트로부터 최신 설정 및 데이터 동기화
  function fetchSettingsAndRender() {
    const apiUrl = String((window.KT_DASHBOARD_CONFIG || {}).apiUrl || "").trim();
    if (!apiUrl) return;

    const callbackName = `ktGoalSettingsCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const url = new URL(apiUrl);
    url.searchParams.set("action", "settings");
    url.searchParams.set("callback", callbackName);

    const script = document.createElement("script");
    window[callbackName] = (data) => {
      delete window[callbackName];
      script.remove();
      if (data && data.ok && data.settings) {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(data.settings));
        render();
      }
    };
    script.onerror = () => {
      delete window[callbackName];
      script.remove();
    };
    script.src = url.toString();
    document.body.appendChild(script);
  }

  function fetchRowsAndRender() {
    const apiUrl = String((window.KT_DASHBOARD_CONFIG || {}).apiUrl || "").trim();
    if (!apiUrl) return;

    const callbackName = `ktGoalRowsCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const url = new URL(apiUrl);
    url.searchParams.set("action", "list");
    url.searchParams.set("month", document.getElementById("reportMonth")?.value || "");
    url.searchParams.set("callback", callbackName);

    const script = document.createElement("script");
    window[callbackName] = (data) => {
      delete window[callbackName];
      script.remove();
      if (data && data.ok && data.rows) {
        localStorage.setItem(STORAGE_KEYS.cachedRows, JSON.stringify(data.rows));
        render();
      }
    };
    script.onerror = () => {
      delete window[callbackName];
      script.remove();
    };
    script.src = url.toString();
    document.body.appendChild(script);
  }

  /* ──────────────────────────────────────────────
     9. 초기화 및 이벤트 바인딩
  ────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    // 기본값 세팅
    const today = new Date();
    const dateInput = document.getElementById("date");
    if (dateInput && !dateInput.value) {
      const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      dateInput.value = ymd;
    }
    const monthInput = document.getElementById("reportMonth");
    if (monthInput && !monthInput.value) {
      monthInput.value = getMonthKeyFromDate(today);
    }

    // 연결 상태
    const apiUrl = String((window.KT_DASHBOARD_CONFIG || {}).apiUrl || "").trim();
    const dot = document.getElementById("connectionDot");
    const text = document.getElementById("connectionText");
    if (dot) dot.classList.toggle("connected", Boolean(apiUrl));
    if (text) text.textContent = apiUrl ? "Google Sheets 연동" : "로컬 모드";

    // 이벤트
    document.getElementById("refreshGoalBtn")?.addEventListener("click", () => {
      fetchSettingsAndRender();
      fetchRowsAndRender();
    });
    document.getElementById("reportMonth")?.addEventListener("change", () => {
      render();
      fetchRowsAndRender();
    });
    document.getElementById("date")?.addEventListener("change", () => {
      render();
      fetchRowsAndRender();
    });

    render();

    // 최초 동기화 수행
    fetchSettingsAndRender();
    fetchRowsAndRender();
  });

  /* localStorage 변경 감지 (다른 탭 입력 시 자동 갱신) */
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEYS.cachedRows || e.key === STORAGE_KEYS.localRows || e.key === STORAGE_KEYS.settings) {
      render();
    }
  });

  function setTiers(tvmu, mu) {
    if (tvmu && Array.isArray(tvmu) && tvmu.length > 0) {
      TVMU_TIERS = tvmu;
    }
    if (mu && Array.isArray(mu) && mu.length > 0) {
      MU_TIERS = mu;
    }
  }

  /* 외부에서 호출 가능하도록 노출 */
  window.KTGoal = Object.freeze({
    get TVMU_TIERS() { return TVMU_TIERS; },
    get MU_TIERS() { return MU_TIERS; },
    setTiers,
    getCurrentTvmuTier,
    getCurrentMuTier,
    getNextTvmuTier,
    getNextMuTier,
    render,
  });
})();

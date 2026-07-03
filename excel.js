let _excelUploadInitialized = false;

function initExcelUpload() {
  if (_excelUploadInitialized) return;

  const dropZone = document.getElementById('excelUploadZone');
  const fileInput = document.getElementById('excelFileInput');

  if (!dropZone || !fileInput) return;

  _excelUploadInitialized = true;

  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => processExcelFile(file));
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => processExcelFile(file));
    }
    // Reset file input so the same file can be uploaded again if needed
    e.target.value = '';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExcelUpload);
} else {
  initExcelUpload();
}

// Some systems export ".xls"/".csv" files that are actually an HTML table (or
// plain delimited text) saved with a legacy Korean encoding (EUC-KR) instead
// of a real binary/OOXML workbook. Handing those raw bytes to XLSX.read()
// still "succeeds" but decodes the Korean text as UTF-8, garbling every
// keyword the parsers search for (개통상태, 온라인, 도매, ...) and silently
// producing 0 counts. Detect that case and re-decode with the right charset
// before parsing.
function readWorkbookFromBytes(bytes) {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B; // xlsx/xlsm (OOXML)
  const isOle = bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0; // real .xls (BIFF)

  if (isZip || isOle) {
    return XLSX.read(bytes, { type: 'array' });
  }

  // Sniff a declared charset from the raw bytes (the "charset=" text itself
  // is plain ASCII regardless of the body's encoding, so this is safe to read
  // before we know the real encoding).
  const preview = String.fromCharCode(...bytes.subarray(0, Math.min(2000, bytes.length)));
  const charsetMatch = preview.match(/charset=["']?([\w-]+)/i);
  let charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8';
  if (charset === 'ks_c_5601-1987' || charset === 'ksc5601' || charset === 'korean') {
    charset = 'euc-kr';
  }

  let text;
  try {
    text = new TextDecoder(charset).decode(bytes);
  } catch (err) {
    text = new TextDecoder('utf-8').decode(bytes);
  }

  return XLSX.read(text, { type: 'string' });
}

function processExcelFile(file) {
  if (!window.XLSX) {
    showMessage('엑셀 처리 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = readWorkbookFromBytes(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rows.length === 0) {
        showMessage('엑셀 파일이 비어있습니다.');
        return;
      }
      
      const fileName = file.name || '';
      
      // 1. Try automatic detection by filename first
      let category = '';
      let isCompleted = true;
      
      if (fileName.includes('인터넷') || fileName.includes('인개통') || fileName.includes('인가설')) category = 'internet';
      else if (fileName.includes('TV') || fileName.includes('티개통') || fileName.includes('티가설')) category = 'tv';
      else if (fileName.includes('유심') || fileName.includes('유개통') || fileName.includes('유가설')) category = 'usim';
      else if (fileName.includes('기기') || fileName.includes('기개통') || fileName.includes('기가설')) category = 'device';

      if (fileName.includes('가설중') || fileName.includes('인가설') || fileName.includes('티가설') || fileName.includes('유가설') || fileName.includes('기가설')) isCompleted = false;
      
      // 2. If filename doesn't classify, run auto-detection and show selection modal
      if (category) {
        const msg = executeParse(category, isCompleted, rows, fileName);
        if (msg) showMessage(msg);
      } else {
        const predicted = autoDetectExcelType(fileName, rows);
        showClassifyModal(fileName, predicted, (selectedType) => {
          const [selCat, selStatus] = selectedType.split('_');
          const selIsCompleted = (selStatus === 'completed');
          const msg = executeParse(selCat, selIsCompleted, rows, fileName);
          if (msg) showMessage(msg);
        });
      }
      
    } catch (error) {
      console.error(error);
      showMessage('엑셀 파일 처리 중 오류가 발생했습니다.');
    }
  };
  reader.onerror = () => {
    showMessage('파일을 읽는 중 오류가 발생했습니다.');
  };
  reader.readAsArrayBuffer(file);
}

function autoDetectExcelType(fileName, rows) {
  // 1. Determine Status Type (Completed vs Pending)
  let isCompleted = true; 
  let hasPendingStatus = false;
  let hasCompletedStatus = false;
  
  let statusColIdx = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowData = rows[r] || [];
    statusColIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('개통상태'));
    if (statusColIdx >= 0) break;
  }
  
  if (statusColIdx >= 0) {
    let completedCount = 0;
    let pendingCount = 0;
    const pendingKeywords = ['처리중', '접수중', '실적확인중', '접수완료', '청약대기', '접수대기', '개통대기', '개통예정', '개통중'];
    
    for (let i = 1; i < Math.min(50, rows.length); i++) {
      if (!rows[i] || rows[i].length <= statusColIdx) continue;
      const statusVal = String(rows[i][statusColIdx] || '').replace(/\s+/g, '');
      if (statusVal.includes('개통완료')) {
        completedCount++;
      } else if (pendingKeywords.some(kw => statusVal.includes(kw))) {
        pendingCount++;
      }
    }
    
    if (pendingCount > completedCount) {
      isCompleted = false;
    }
  } else {
    if (fileName.includes('가설') || fileName.includes('접수') || fileName.includes('대기')) {
      isCompleted = false;
    }
  }
  
  // 2. Determine Product Category (Internet, TV, Usim, Device)
  let category = 'internet'; 
  
  let hasUsim = false;
  let hasDevice = false;
  let hasTv = false;
  
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const row = rows[i] || [];
    for (let j = 0; j < row.length; j++) {
      const cellVal = String(row[j] || '');
      if (cellVal.includes('(유심)')) {
        hasUsim = true;
      }
      if (cellVal.includes('(기기)') || cellVal.includes('3.무KT-우신(기기)')) {
        hasDevice = true;
      }
      if (cellVal.includes('(추단)') || cellVal.includes('(단독)') || cellVal.includes('올레tv') || cellVal.includes('지니TV')) {
        hasTv = true;
      }
    }
  }
  
  if (hasUsim) category = 'usim';
  else if (hasDevice) category = 'device';
  else if (hasTv) category = 'tv';
  else {
    if (fileName.includes('TV')) category = 'tv';
    else if (fileName.includes('유심')) category = 'usim';
    else if (fileName.includes('기기')) category = 'device';
  }
  
  return { category, isCompleted };
}

function showClassifyModal(fileName, predicted, onSelect) {
  let modal = document.getElementById('excelClassifyModalOverlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'excelClassifyModalOverlay';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;';
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.style.cssText = 'background:var(--surface); border-radius:12px; max-width:480px; width:90%; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.15); border:1px solid var(--line); color:var(--ink);';
    
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;';
    const title = document.createElement('h3');
    title.innerText = '엑셀 파일 분류 선택';
    title.style.margin = '0';
    title.style.fontSize = '18px';
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'background:none; border:none; font-size:24px; cursor:pointer; color:var(--muted);';
    closeBtn.onclick = () => modal.style.display = 'none';
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    const body = document.createElement('div');
    body.id = 'excelClassifyModalBody';
    
    dialog.appendChild(header);
    dialog.appendChild(body);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
  }
  
  const body = document.getElementById('excelClassifyModalBody');
  body.innerHTML = `
    <p style="margin:0 0 20px 0; font-size:14.5px; line-height:1.6; color: var(--ink);">
      이름으로 자동 분류하지 못했습니다. 아래에서 맞는 분류를 선택해 주세요.<br/>
      파일명: <span style="font-weight:700; color:var(--blue); word-break:break-all;">${fileName}</span>
    </p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      <button class="classify-btn" data-type="internet_completed" style="padding:12px; border-radius:8px; border:1px solid var(--line); font-weight:700; background:var(--surface); color:var(--ink); cursor:pointer; text-align:center; transition: all 0.2s;">인터넷 - 개통완료</button>
      <button class="classify-btn" data-type="internet_pending" style="padding:12px; border-radius:8px; border:1px solid var(--line); font-weight:700; background:var(--surface); color:var(--ink); cursor:pointer; text-align:center; transition: all 0.2s;">인터넷 - 가설중</button>
      <button class="classify-btn" data-type="tv_completed" style="padding:12px; border-radius:8px; border:1px solid var(--line); font-weight:700; background:var(--surface); color:var(--ink); cursor:pointer; text-align:center; transition: all 0.2s;">TV - 개통완료</button>
      <button class="classify-btn" data-type="tv_pending" style="padding:12px; border-radius:8px; border:1px solid var(--line); font-weight:700; background:var(--surface); color:var(--ink); cursor:pointer; text-align:center; transition: all 0.2s;">TV - 가설중</button>
      <button class="classify-btn" data-type="usim_completed" style="padding:12px; border-radius:8px; border:1px solid var(--line); font-weight:700; background:var(--surface); color:var(--ink); cursor:pointer; text-align:center; transition: all 0.2s;">유심 - 개통완료</button>
      <button class="classify-btn" data-type="usim_pending" style="padding:12px; border-radius:8px; border:1px solid var(--line); font-weight:700; background:var(--surface); color:var(--ink); cursor:pointer; text-align:center; transition: all 0.2s;">유심 - 가설중</button>
      <button class="classify-btn" data-type="device_completed" style="padding:12px; border-radius:8px; border:1px solid var(--line); font-weight:700; background:var(--surface); color:var(--ink); cursor:pointer; text-align:center; transition: all 0.2s;">기기 - 개통완료</button>
      <button class="classify-btn" data-type="device_pending" style="padding:12px; border-radius:8px; border:1px solid var(--line); font-weight:700; background:var(--surface); color:var(--ink); cursor:pointer; text-align:center; transition: all 0.2s;">기기 - 가설중</button>
    </div>
  `;
  
  const predKey = `${predicted.category}_${predicted.isCompleted ? 'completed' : 'pending'}`;
  const buttons = body.querySelectorAll('.classify-btn');
  buttons.forEach(btn => {
    const type = btn.getAttribute('data-type');
    if (type === predKey) {
      btn.style.borderColor = 'var(--blue)';
      btn.style.color = 'var(--blue)';
      btn.style.background = '#eef6ff';
      btn.innerText += ' (추천)';
    }
    
    btn.onclick = () => {
      onSelect(type);
      modal.style.display = 'none';
    };
    
    btn.onmouseenter = () => {
      if (btn.getAttribute('data-type') !== predKey) {
        btn.style.background = '#f5f7fa';
      }
    };
    btn.onmouseleave = () => {
      if (btn.getAttribute('data-type') !== predKey) {
        btn.style.background = 'var(--surface)';
      }
    };
  });
  
  modal.style.display = 'flex';
}

function executeParse(category, isCompleted, rows, fileName) {
  if (category === 'internet') {
    return parseInternet(rows, isCompleted, fileName);
  } else if (category === 'tv') {
    return parseTv(rows, isCompleted, fileName);
  } else if (category === 'usim') {
    return parseUsim(rows, isCompleted, fileName);
  } else if (category === 'device') {
    return parseDevice(rows, isCompleted, fileName);
  }
  return null;
}

function parseInternet(rows, isCompleted, fileName) {
  let onlineCount = 0;
  let wholesaleCount = 0;
  
  let headerRowIdx = 0;
  let statusIdx = -1;
  let branchIdx = -1;
  let partnerIdx = -1;
  
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowData = rows[r] || [];
    const sIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('개통상태'));
    const bIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('상부점'));
    const pIdx = rowData.findIndex(h => {
      const clean = String(h).replace(/\s+/g, '');
      return clean.includes('협력점') || clean.includes('협력점명');
    });
    
    let validCols = 0;
    if (sIdx >= 0) validCols++;
    if (bIdx >= 0 && bIdx !== sIdx) validCols++;
    
    if (validCols >= 2 || (bIdx >= 0 && rowData.length > 3)) {
      headerRowIdx = r;
      statusIdx = sIdx;
      branchIdx = bIdx;
      partnerIdx = pIdx;
      break;
    }
  }
  
  const partnerCounts = {};
  
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    if (!rows[i] || rows[i].length === 0) continue;
    
    let isValidRow = true;
    let isOnline = false, isWholesale = false;
    
    if (statusIdx >= 0) {
      const statusVal = String(rows[i][statusIdx] || '').replace(/\s+/g, '');
      if (!isCompleted) {
        const allowedStatuses = ['처리중', '접수중', '실적확인중', '접수완료', '접수대기'];
        if (!allowedStatuses.some(status => statusVal.includes(status))) {
          isValidRow = false;
        }
      } else {
        if (!statusVal.includes('개통완료')) {
          isValidRow = false;
        }
      }
    }
    
    if (!isValidRow) continue;
    
    if (branchIdx >= 0) {
      const branchVal = String(rows[i][branchIdx] || '').replace(/\s+/g, '');
      if (branchVal.includes('온라인')) isOnline = true;
      else if (branchVal.includes('도매')) isWholesale = true;
    } else {
      for (let j = 0; j < rows[i].length; j++) {
        const cellVal = String(rows[i][j] || '').replace(/\s+/g, '');
        if (cellVal.includes('온라인')) isOnline = true;
        else if (cellVal.includes('도매')) isWholesale = true;
      }
    }
    
    if (isOnline) onlineCount++;
    else if (isWholesale) wholesaleCount++;
    
    if (isCompleted && partnerIdx >= 0 && (isOnline || isWholesale)) {
      const partnerName = String(rows[i][partnerIdx] || '').trim();
      if (partnerName && partnerName !== 'null' && partnerName !== 'undefined') {
        partnerCounts[partnerName] = (partnerCounts[partnerName] || 0) + 1;
      }
    }
  }
  
  if (isCompleted && partnerIdx >= 0) {
    const currentDate = document.getElementById('date')?.value || new Date().toISOString().slice(0, 10);
    savePartnerData(currentDate, 'internet', partnerCounts);
  }
  
  let onlineId = '', wholesaleId = '';
  if (isCompleted) {
    onlineId = 'openOnlineInternet'; wholesaleId = 'openWholesaleInternet';
  } else {
    onlineId = 'installOnlineInternet'; wholesaleId = 'installWholesaleInternet';
  }
  
  if (onlineId) updateInput(onlineId, onlineCount);
  if (wholesaleId) updateInput(wholesaleId, wholesaleCount);
  return `[${fileName}] 온라인 인터넷 ${onlineCount}건, 도매 인터넷 ${wholesaleCount}건 반영됨`;
}

function parseTv(rows, isCompleted, fileName) {
  let onlineMainCount = 0, onlineExtraCount = 0;
  let wholesaleMainCount = 0, wholesaleExtraCount = 0;
  
  let headerRowIdx = 0;
  let statusIdx = -1;
  let branchIdx = -1;
  let optionIdx = -1;
  
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowData = rows[r] || [];
    const sIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('개통상태'));
    const bIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('상부점'));
    const oIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('상품옵션'));
    
    let validCols = 0;
    if (sIdx >= 0) validCols++;
    if (bIdx >= 0 && bIdx !== sIdx) validCols++;
    if (oIdx >= 0 && oIdx !== sIdx && oIdx !== bIdx) validCols++;
    
    if (validCols >= 2 || (bIdx >= 0 && rowData.length > 3)) {
      headerRowIdx = r;
      statusIdx = sIdx;
      branchIdx = bIdx;
      optionIdx = oIdx;
      break;
    }
  }
  
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    if (!rows[i] || rows[i].length === 0) continue;
    
    let isValidRow = true;
    let isOnline = false, isWholesale = false, isExtra = false;
    
    if (statusIdx >= 0) {
      const statusVal = String(rows[i][statusIdx] || '').replace(/\s+/g, '');
      if (!isCompleted) {
        const allowedStatuses = ['처리중', '접수중', '실적확인중', '접수완료', '접수대기'];
        if (!allowedStatuses.some(status => statusVal.includes(status))) {
          isValidRow = false;
        }
      } else {
        if (!statusVal.includes('개통완료')) {
          isValidRow = false;
        }
      }
    }
    
    if (!isValidRow) continue;
    
    if (branchIdx >= 0 && optionIdx >= 0) {
      const branchVal = String(rows[i][branchIdx] || '').replace(/\s+/g, '');
      const optionVal = String(rows[i][optionIdx] || '').replace(/\s+/g, '');
      
      if (branchVal.includes('(온라인)')) isOnline = true;
      else if (branchVal.includes('(도매)')) isWholesale = true;
      
      if (optionVal.includes('(추단)') || optionVal.includes('(단독)')) isExtra = true;
    } else {
      for (let j = 0; j < rows[i].length; j++) {
        const cellVal = String(rows[i][j] || '').replace(/\s+/g, '');
        if (cellVal.includes('(온라인)')) isOnline = true;
        else if (cellVal.includes('(도매)')) isWholesale = true;
        if (cellVal.includes('(추단)') || cellVal.includes('(단독)')) isExtra = true;
      }
    }
    
    if (isOnline) {
      if (isExtra) onlineExtraCount++; else onlineMainCount++;
    } else if (isWholesale) {
      if (isExtra) wholesaleExtraCount++; else wholesaleMainCount++;
    }
  }
  
  let targetPrefix = isCompleted ? 'open' : 'install';
  updateInput(`${targetPrefix}OnlineMainTv`, onlineMainCount);
  updateInput(`${targetPrefix}OnlineExtra`, onlineExtraCount);
  updateInput(`${targetPrefix}WholesaleMainTv`, wholesaleMainCount);
  updateInput(`${targetPrefix}WholesaleExtra`, wholesaleExtraCount);
  
  return `[${fileName}] 온라인TV(메인 ${onlineMainCount}/추가 ${onlineExtraCount}), 도매TV(메인 ${wholesaleMainCount}/추가 ${wholesaleExtraCount}) 반영됨`;
}

function parseUsim(rows, isCompleted, fileName) {
  let usimCount = 0;
  let mainDongpanCount = 0;
  
  let headerRowIdx = 0;
  let branchIdx = -1;
  let optionIdx = -1;
  let statusIdx = -1;
  let partnerIdx = -1;
  
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowData = rows[r] || [];
    const sIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('개통상태'));
    const bIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('상부점'));
    const oIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('상품옵션'));
    const pIdx = rowData.findIndex(h => {
      const clean = String(h).replace(/\s+/g, '');
      return clean.includes('협력점') || clean.includes('협력점명');
    });
    
    let validCols = 0;
    if (sIdx >= 0) validCols++;
    if (bIdx >= 0 && bIdx !== sIdx) validCols++;
    if (oIdx >= 0 && oIdx !== sIdx && oIdx !== bIdx) validCols++;
    
    if (validCols >= 2 || (bIdx >= 0 && rowData.length > 3)) {
      headerRowIdx = r;
      branchIdx = bIdx;
      optionIdx = oIdx;
      statusIdx = sIdx;
      partnerIdx = pIdx;
      break;
    }
  }
  
  const partnerCounts = {};
  
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    if (!rows[i] || rows[i].length === 0) continue;

    let statusVal = '';
    if (statusIdx >= 0) statusVal = String(rows[i][statusIdx] || '').replace(/\s+/g, '');

    if (!isCompleted) {
      const allowedStatuses = ['청약대기', '접수대기', '청약대기(무선)', '처리중', '접수중', '접수완료', '발송요청', '개통대기', '개통예정', '개통(MVNO)예정', '개통요청', '개통중'];
      if (allowedStatuses.some(status => statusVal.includes(status))) {
        usimCount++;
      }
    } else {
      if (statusIdx >= 0 && !statusVal.includes('개통완료')) {
        continue;
      }

      let hasUsimBranch = false;
      let hasExcludeOption = false;
      let hasFamilyDongpan = false;
      
      if (branchIdx >= 0 && optionIdx >= 0) {
        const branchVal = String(rows[i][branchIdx] || '').trim();
        const optionVal = String(rows[i][optionIdx] || '').trim();
        
        if (branchVal.includes('(유심)')) hasUsimBranch = true;
        if (optionVal.includes('민원') || optionVal.includes('추가지급')) hasExcludeOption = true;
        if (optionVal.includes('가족동판')) hasFamilyDongpan = true;
      } else {
        for (let j = 0; j < rows[i].length; j++) {
          const cellVal = String(rows[i][j] || '').trim();
          if (cellVal.includes('(유심)')) hasUsimBranch = true;
          if (cellVal.includes('민원') || cellVal.includes('추가지급')) hasExcludeOption = true;
          if (cellVal.includes('가족동판')) hasFamilyDongpan = true;
        }
      }
      
      if (hasUsimBranch && !hasExcludeOption) {
        usimCount++;
        if (!hasFamilyDongpan) {
          mainDongpanCount++;
        }
        
        if (partnerIdx >= 0) {
          const partnerName = String(rows[i][partnerIdx] || '').trim();
          if (partnerName && partnerName !== 'null' && partnerName !== 'undefined') {
            partnerCounts[partnerName] = (partnerCounts[partnerName] || 0) + 1;
          }
        }
      }
    }
  }
  
  if (isCompleted && partnerIdx >= 0) {
    const currentDate = document.getElementById('date')?.value || new Date().toISOString().slice(0, 10);
    savePartnerData(currentDate, 'usim', partnerCounts);
  }
  
  if (!isCompleted) {
    updateInput('installMobileUsim', usimCount);
    return `[${fileName}] 유심 가설중 ${usimCount}건 반영됨`;
  } else {
    updateInput('openMobileUsim', usimCount);
    updateInput('mainDongpanUsim', mainDongpanCount);
    return `[${fileName}] 유심 총 ${usimCount}건, 메인개통 ${mainDongpanCount}건 반영됨`;
  }
}

function parseDevice(rows, isCompleted, fileName) {
  let deviceCount = 0;
  
  let headerRowIdx = 0;
  let branchIdx = -1;
  let optionIdx = -1;
  let statusIdx = -1;
  
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowData = rows[r] || [];
    const sIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('개통상태'));
    const bIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('상부점'));
    const oIdx = rowData.findIndex(h => String(h).replace(/\s+/g, '').includes('상품옵션'));
    
    let validCols = 0;
    if (sIdx >= 0) validCols++;
    if (bIdx >= 0 && bIdx !== sIdx) validCols++;
    if (oIdx >= 0 && oIdx !== sIdx && oIdx !== bIdx) validCols++;
    
    if (validCols >= 2 || (bIdx >= 0 && rowData.length > 3)) {
      headerRowIdx = r;
      branchIdx = bIdx;
      optionIdx = oIdx;
      statusIdx = sIdx;
      break;
    }
  }
  
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    if (!rows[i] || rows[i].length === 0) continue;

    let statusVal = '';
    if (statusIdx >= 0) statusVal = String(rows[i][statusIdx] || '').replace(/\s+/g, '');

    let hasDeviceBranch = false;
    let hasExcludeOption = false;
    
    if (branchIdx >= 0 && optionIdx >= 0) {
      const branchVal = String(rows[i][branchIdx] || '').trim();
      const optionVal = String(rows[i][optionIdx] || '').trim();
      
      if (branchVal.includes('3.무KT-우신(기기)(월☆통말)')) hasDeviceBranch = true;
      if (optionVal.includes('민원') || optionVal.includes('추가지급')) hasExcludeOption = true;
    } else {
      for (let j = 0; j < rows[i].length; j++) {
        const cellVal = String(rows[i][j] || '').trim();
        if (cellVal.includes('3.무KT-우신(기기)(월☆통말)')) hasDeviceBranch = true;
        if (cellVal.includes('민원') || cellVal.includes('추가지급')) hasExcludeOption = true;
      }
    }

    if (!hasDeviceBranch) continue;

    if (!isCompleted) {
      const excludeStatuses = ['개통완료', '보류', '취소완료', '해지(철회)중', '해지(철회)완료', '반품요청', '반품완료'];
      let isExcluded = false;
      for (let st of excludeStatuses) {
        if (statusVal.includes(st)) {
          isExcluded = true;
          break;
        }
      }
      if (!isExcluded) {
        deviceCount++;
      }
    } else {
      if (!hasExcludeOption) {
        deviceCount++;
      }
    }
  }
  
  let targetId = isCompleted ? 'openMobileDevice' : 'installMobileDevice';
  updateInput(targetId, deviceCount);
  return `[${fileName}] 기기 ${deviceCount}건 반영됨`;
}

function updateInput(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function savePartnerData(date, fileType, partnerCounts) {
  const STORAGE_KEY = 'kt-dashboard-partner-rows';
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    list = [];
  }

  const targetDate = String(date).slice(0, 10);
  let targetRow = list.find(item => item.date === targetDate);

  if (!targetRow) {
    targetRow = { date: targetDate, partners: {} };
    list.push(targetRow);
  }

  if (!targetRow.partners) {
    targetRow.partners = {};
  }

  for (let p in targetRow.partners) {
    if (targetRow.partners[p]) {
      targetRow.partners[p][fileType] = 0;
    }
  }

  for (let p in partnerCounts) {
    if (!targetRow.partners[p]) {
      targetRow.partners[p] = { internet: 0, usim: 0 };
    }
    targetRow.partners[p][fileType] = partnerCounts[p];
  }

  for (let p in targetRow.partners) {
    const data = targetRow.partners[p];
    if (data.internet === 0 && data.usim === 0) {
      delete targetRow.partners[p];
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  console.log(`[Partner Data Saved] ${targetDate} - ${fileType} 데이터가 업데이트되었습니다.`, partnerCounts);
}

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

function processExcelFile(file) {
  if (!window.XLSX) {
    showMessage('엑셀 처리 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rows.length === 0) {
        showMessage('엑셀 파일이 비어있습니다.');
        return;
      }
      
      const fileName = file.name || '';
      let msg = '';
      
      if (fileName.includes('인터넷')) {
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
        const isCompletedFile = fileName.includes('개통완료');
        
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          if (!rows[i] || rows[i].length === 0) continue;
          
          let isValidRow = true;
          let isOnline = false, isWholesale = false;
          
          if (statusIdx >= 0) {
            const statusVal = String(rows[i][statusIdx] || '').replace(/\s+/g, '');
            if (fileName.includes('가설중')) {
              const excludedStatuses = ['개통완료', '보류', '취소완료', '해지(철회)중', '해지(철회)완료'];
              if (excludedStatuses.some(status => statusVal.includes(status))) {
                isValidRow = false;
              }
            } else if (isCompletedFile) {
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
          
          if (isCompletedFile && partnerIdx >= 0) {
            const partnerName = String(rows[i][partnerIdx] || '').trim();
            if (partnerName && partnerName !== 'null' && partnerName !== 'undefined') {
              partnerCounts[partnerName] = (partnerCounts[partnerName] || 0) + 1;
            }
          }
        }
        
        if (isCompletedFile && partnerIdx >= 0) {
          const currentDate = document.getElementById('date')?.value || new Date().toISOString().slice(0, 10);
          savePartnerData(currentDate, 'internet', partnerCounts);
        }
        
        let onlineId = '', wholesaleId = '';
        if (fileName.includes('개통완료')) {
          onlineId = 'openOnlineInternet'; wholesaleId = 'openWholesaleInternet';
        } else if (fileName.includes('가설중')) {
          onlineId = 'installOnlineInternet'; wholesaleId = 'installWholesaleInternet';
        }
        
        if (onlineId) updateInput(onlineId, onlineCount);
        if (wholesaleId) updateInput(wholesaleId, wholesaleCount);
        msg = `[${fileName}] 온라인 ${onlineCount}건, 도매 ${wholesaleCount}건 반영됨`;
        
      } else if (fileName.includes('TV')) {
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
            if (fileName.includes('가설중')) {
              const excludedStatuses = ['개통완료', '보류', '취소완료', '해지(철회)중', '해지(철회)완료', '반품요청', '반품완료'];
              if (excludedStatuses.some(status => statusVal.includes(status))) {
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
            if (isExtra) {
              wholesaleExtraCount++;
            } else {
              wholesaleMainCount++;
            }
          }
        }
        
        let targetPrefix = '';
        if (fileName.includes('개통완료')) targetPrefix = 'open';
        else if (fileName.includes('가설중')) targetPrefix = 'install';
        
        if (targetPrefix) {
          updateInput(`${targetPrefix}OnlineMainTv`, onlineMainCount);
          updateInput(`${targetPrefix}OnlineExtra`, onlineExtraCount);
          updateInput(`${targetPrefix}WholesaleMainTv`, wholesaleMainCount);
          updateInput(`${targetPrefix}WholesaleExtra`, wholesaleExtraCount);
          msg = `[${fileName}] 온라인TV(메인 ${onlineMainCount}/추가 ${onlineExtraCount}), 도매TV(메인 ${wholesaleMainCount}/추가 ${wholesaleExtraCount}) 반영됨`;
        }
        
      } else if (fileName.includes('유심')) {
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
        const isCompletedFile = !fileName.includes('가설중');
        
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          if (!rows[i] || rows[i].length === 0) continue;

          let statusVal = '';
          if (statusIdx >= 0) statusVal = String(rows[i][statusIdx] || '').replace(/\s+/g, '');

          if (fileName.includes('가설중')) {
            const excludeStatuses = ['개통완료', '보류', '취소완료', '해지(철회)중', '해지(철회)완료', '반품요청', '반품완료'];
            let isExcluded = false;
            for (let st of excludeStatuses) {
              if (statusVal.includes(st)) {
                isExcluded = true;
                break;
              }
            }
            if (!isExcluded) {
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
        
        if (isCompletedFile && partnerIdx >= 0) {
          const currentDate = document.getElementById('date')?.value || new Date().toISOString().slice(0, 10);
          savePartnerData(currentDate, 'usim', partnerCounts);
        }
        
        let targetId = '';
        if (fileName.includes('가설중')) {
          targetId = 'installMobileUsim';
          updateInput(targetId, usimCount);
          msg = `[${fileName}] 유심 가설중 ${usimCount}건 반영됨`;
        } else {
          updateInput('openMobileUsim', usimCount);
          updateInput('mainDongpanUsim', mainDongpanCount);
          msg = `[${fileName}] 유심 총 ${usimCount}건, 메인개통 ${mainDongpanCount}건 반영됨`;
        }
        
      } else if (fileName.includes('기기')) {
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

          // 상부점이 '3.무KT-우신(기기)(월☆통말)' 인 경우에만 카운트
          if (!hasDeviceBranch) continue;

          if (fileName.includes('가설중')) {
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
            // 개통완료의 경우, 제외 옵션이 없어야 함
            if (!hasExcludeOption) {
              deviceCount++;
            }
          }
        }
        
        let targetId = '';
        if (fileName.includes('개통완료')) targetId = 'openMobileDevice';
        else if (fileName.includes('가설중')) targetId = 'installMobileDevice';
        
        if (targetId) updateInput(targetId, deviceCount);
        msg = `[${fileName}] 기기 ${deviceCount}건 반영됨`;

      } else {
        showMessage('지원하지 않는 엑셀 파일 이름입니다. (인터넷/TV/유심/기기 중 하나가 포함되어야 합니다)');
        return;
      }
      
      if (msg) showMessage(msg);
      
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

  // 업로드한 타입에 대해서만 기존 수치 리셋
  for (let p in targetRow.partners) {
    if (targetRow.partners[p]) {
      targetRow.partners[p][fileType] = 0;
    }
  }

  // 신규 값 누적
  for (let p in partnerCounts) {
    if (!targetRow.partners[p]) {
      targetRow.partners[p] = { internet: 0, usim: 0 };
    }
    targetRow.partners[p][fileType] = partnerCounts[p];
  }

  // 카운트가 모두 0인 업체 정리
  for (let p in targetRow.partners) {
    const data = targetRow.partners[p];
    if (data.internet === 0 && data.usim === 0) {
      delete targetRow.partners[p];
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  console.log(`[Partner Data Saved] ${targetDate} - ${fileType} 데이터가 업데이트되었습니다.`, partnerCounts);
}
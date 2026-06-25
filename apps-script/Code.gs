const SPREADSHEET_ID = '1IhG3NBOWwbFeIHSPgdKxEAASQXInnEwe_c36W8M27YM';
const SHEET_NAME = 'KT_DASHBOARD';
const SETTINGS_SHEET_NAME = 'SETTINGS';
const HEADERS = [
  'date',
  'open_online_internet',
  'open_wholesale_internet',
  'open_internet',
  'open_tv',
  'open_main_tv',
  'open_extra_device',
  'open_mobile_device',
  'open_mobile_usim',
  'open_mobile_total',
  'install_online_internet',
  'install_wholesale_internet',
  'install_internet',
  'install_tv',
  'install_main_tv',
  'install_extra_device',
  'install_mobile_device',
  'install_mobile_usim',
  'install_mobile_total',
  'expected_internet',
  'mobile_total',
  'target_count',
  'target_point',
  'deadline_date',
  'internet_open_rate_setting',
  'tv_open_rate_setting',
  'usim_open_rate_setting',
  'device_open_rate_setting',
  'remaining_business_days',
  'remaining_count',
  'open_rate',
  'open_bundle_rate',
  'install_bundle_rate',
  'point_total',
  'expected_tv',
  'expected_main_tv',
  'expected_extra_device',
  'expected_mobile_device',
  'expected_mobile_usim',
  'expected_mobile_total',
  'daily_need',
  'created_at',
  'expected_online_internet',
  'expected_wholesale_internet',
  'open_online_tv',
  'open_wholesale_tv',
  'open_online_main_tv',
  'open_wholesale_main_tv',
  'open_online_extra',
  'open_wholesale_extra',
  'install_online_tv',
  'install_wholesale_tv',
  'install_online_main_tv',
  'install_wholesale_main_tv',
  'install_online_extra',
  'install_wholesale_extra',
  'expected_online_tv',
  'expected_wholesale_tv',
  'expected_online_main_tv',
  'expected_wholesale_main_tv',
  'expected_online_extra',
  'expected_wholesale_extra',
  'online_target_count',
  'open_companion_rate',
  'install_companion_rate',
  'open_online_bundle_rate',
  'open_wholesale_bundle_rate',
  'install_online_bundle_rate',
  'install_wholesale_bundle_rate',
  'mu_target_count',
  'main_dongpan_usim',
  'passed_business_days',
  'daily_online_internet',
  'daily_wholesale_internet',
  'daily_mobile_device',
  'daily_mobile_usim',
  'partner_data',
];

function doGet(e) {
  e = e || { parameter: {} };
  const action = e.parameter.action || 'list';
  const callback = e.parameter.callback;

  try {
    if (action === 'list') {
      return respond({ ok: true, rows: getRows(e.parameter.month || '') }, callback);
    }

    if (action === 'upsert') {
      const row = JSON.parse(e.parameter.row || '{}');
      return respond({ ok: true, row: upsertRow(row) }, callback);
    }

    if (action === 'settings') {
      return respond({ ok: true, settings: getSettings() }, callback);
    }

    if (action === 'saveSettings') {
      const settings = JSON.parse(e.parameter.settings || '{}');
      return respond({ ok: true, settings: saveSettings(settings) }, callback);
    }

    return respond({ ok: false, error: 'Unknown action' }, callback);
  } catch (error) {
    return respond({ ok: false, error: error.message }, callback);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond({ ok: false, error: 'POST body is required' });
    }
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;

    if (action === 'upsert') {
      const row = upsertRow(body.row || {});
      return respond({ ok: true, row });
    }

    if (action === 'saveSettings') {
      const settings = saveSettings(body.settings || {});
      return respond({ ok: true, settings });
    }

    return respond({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return respond({ ok: false, error: error.message });
  }
}

function upsertRow(row) {
  if (!row.date) throw new Error('date is required');

  const sheet = getSheet();
  const values = HEADERS.map((header) => row[header] ?? '');
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const dates = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = dates.findIndex((date) => normalizeDate(date) === row.date);
    if (index >= 0) {
      sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([values]);
      return row;
    }
  }

  sheet.appendRow(values);
  return row;
}

function getRows(month) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet
    .getRange(2, 1, lastRow - 1, HEADERS.length)
    .getValues()
    .map((values) => {
      const row = {};
      HEADERS.forEach((header, index) => {
        row[header] = header === 'date' ? normalizeDate(values[index]) : values[index];
      });
      return row;
    })
    .filter((row) => row.date)
    .filter((row) => !month || String(row.date).slice(0, 7) === month)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const needsHeader = HEADERS.some((header, index) => currentHeaders[index] !== header);

  if (needsHeader) {
    headerRange.setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getSettings() {
  const sheet = getSettingsSheet();
  return {
    target_count: valueOrDefault(sheet.getRange('B1').getValue(), 1375),
    online_target_count: valueOrDefault(sheet.getRange('B9').getValue(), 500),
    mu_target_count: valueOrDefault(sheet.getRange('B10').getValue(), 600),
    target_point: valueOrDefault(sheet.getRange('B2').getValue(), 0),
    deadline_date: normalizeDate(sheet.getRange('B3').getValue()),
    internet_open_rate: valueOrDefault(sheet.getRange('B4').getValue(), 75),
    tv_open_rate: valueOrDefault(sheet.getRange('B5').getValue(), 75),
    usim_open_rate: valueOrDefault(sheet.getRange('B6').getValue(), 50),
    device_open_rate: valueOrDefault(sheet.getRange('B7').getValue(), 50),
    updated_at: sheet.getRange('B8').getValue(),
    tvmu_tiers: sheet.getRange('B11').getValue() || '',
    mu_tiers: sheet.getRange('B12').getValue() || '',
  };
}

function saveSettings(settings) {
  const sheet = getSettingsSheet();
  const values = {
    target_count: valueOrDefault(settings.target_count, 1375),
    online_target_count: valueOrDefault(settings.online_target_count, 500),
    mu_target_count: valueOrDefault(settings.mu_target_count, 600),
    target_point: valueOrDefault(settings.target_point, 0),
    deadline_date: normalizeDate(settings.deadline_date),
    internet_open_rate: valueOrDefault(settings.internet_open_rate, 75),
    tv_open_rate: valueOrDefault(settings.tv_open_rate, 75),
    usim_open_rate: valueOrDefault(settings.usim_open_rate, 50),
    device_open_rate: valueOrDefault(settings.device_open_rate, 50),
    updated_at: settings.updated_at || new Date().toISOString(),
    tvmu_tiers: settings.tvmu_tiers || '',
    mu_tiers: settings.mu_tiers || '',
  };

  sheet.getRange('A1:B12').setValues([
    ['target_count', values.target_count],
    ['target_point', values.target_point],
    ['deadline_date', values.deadline_date],
    ['internet_open_rate', values.internet_open_rate],
    ['tv_open_rate', values.tv_open_rate],
    ['usim_open_rate', values.usim_open_rate],
    ['device_open_rate', values.device_open_rate],
    ['updated_at', values.updated_at],
    ['online_target_count', values.online_target_count],
    ['mu_target_count', values.mu_target_count],
    ['tvmu_tiers', values.tvmu_tiers],
    ['mu_tiers', values.mu_tiers],
  ]);

  return values;
}

function getSettingsSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SETTINGS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SETTINGS_SHEET_NAME);
  }

  const defaults = [
    ['target_count', 1375],
    ['target_point', 0],
    ['deadline_date', ''],
    ['internet_open_rate', 75],
    ['tv_open_rate', 75],
    ['usim_open_rate', 50],
    ['device_open_rate', 50],
    ['updated_at', ''],
    ['online_target_count', 500],
    ['mu_target_count', 600],
    ['tvmu_tiers', ''],
    ['mu_tiers', ''],
  ];
  const lastRow = Math.max(sheet.getLastRow(), defaults.length);
  const current = sheet.getRange(1, 1, lastRow, 2).getValues();
  const currentByKey = {};
  current.forEach((row) => {
    if (row[0]) currentByKey[String(row[0])] = row[1];
  });
  const next = defaults.map((row) => [
    row[0],
    currentByKey[row[0]] !== undefined && currentByKey[row[0]] !== '' ? currentByKey[row[0]] : row[1],
  ]);
  sheet.getRange('A1:B12').setValues(next);

  return sheet;
}

function normalizeDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function valueOrDefault(value, defaultValue) {
  return value === '' || value === null || value === undefined ? defaultValue : value;
}

function respond(payload, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(payload)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

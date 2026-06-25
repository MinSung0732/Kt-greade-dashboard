const fs = require('fs');
const vm = require('vm');

const dom = {
  querySelector: () => ({
    addEventListener: () => {},
    value: '',
    reset: () => {}
  }),
  addEventListener: () => {},
  getElementById: () => ({
    addEventListener: () => {},
  }),
  createElement: () => ({ remove: () => {} }),
  body: { appendChild: () => {} }
};

const win = {
  KT_DASHBOARD_CONFIG: {},
  setTimeout: (cb) => {
    // defer execution to catch sync errors first
    process.nextTick(cb);
  },
  clearTimeout: () => {},
  addEventListener: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  location: { search: '' },
  URL: URL,
  Date: Date,
  Math: Math,
  JSON: JSON,
  console: console,
  Promise: Promise
};

const sandbox = {
  window: win,
  document: dom,
  localStorage: win.localStorage,
  setTimeout: win.setTimeout,
  clearTimeout: win.clearTimeout,
  console: console,
  URL: URL,
  Date: Date,
  Math: Math,
  JSON: JSON,
  Promise: Promise,
  Error: Error,
  isNaN: isNaN,
  parseFloat: parseFloat,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Object: Object,
  Array: Array
};

vm.createContext(sandbox);

const files = [
  'config.js',
  'utils.js',
  'api.js',
  'dom.js',
  'excel.js',
  'chart.js',
  'goal.js',
  'dashboard.js',
  'app.js'
];

try {
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    console.log(`Evaluating ${file}...`);
    vm.runInContext(code, sandbox, { filename: file });
  }
  console.log('All files evaluated successfully.');
  
  // Now simulate DOMContentLoaded
  console.log('Simulating DOMContentLoaded...');
  if (sandbox.document.addEventListener) {
    // run the callback bound to DOMContentLoaded
    // wait, we mocked addEventListener blindly.
  }
} catch (e) {
  console.error('Error during evaluation:', e);
}
console.log('Running loadInitialData...');
try {
  sandbox.loadInitialData().then(() => console.log('loadInitialData completed.')).catch(e => console.error('loadInitialData rejected:', e));
} catch(e) {
  console.error('loadInitialData threw:', e);
}

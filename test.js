'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

class FakeClassList {
  constructor(element) { this.element = element; }
  values() { return new Set((this.element.className || '').split(/\s+/).filter(Boolean)); }
  write(values) { this.element.className = Array.from(values).join(' '); }
  add(value) { const values = this.values(); values.add(value); this.write(values); }
  remove(value) { const values = this.values(); values.delete(value); this.write(values); }
  contains(value) { return this.values().has(value); }
  toggle(value) {
    const values = this.values();
    const enabled = !values.has(value);
    if (enabled) values.add(value); else values.delete(value);
    this.write(values);
    return enabled;
  }
}

class FakeElement {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.className = '';
    this.classList = new FakeClassList(this);
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.textContent = '';
    this.selectedIndex = 0;
    this.scrollTop = 0;
    this.scrollHeight = 0;
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  dispatch(type) { this.listeners[type](); }
  appendChild(child) {
    this.children.push(child);
    this.scrollHeight = this.children.length;
    if (this.children.length === 1 && !this.value) this.value = child.value || '';
  }
  get options() { return this.children; }
  set innerHTML(value) { assert.equal(value, ''); this.children = []; this.value = ''; }
  get innerHTML() { return ''; }
  scrollIntoView() { this.scrolledIntoView = true; }
}

const ids = [
  'deviceList', 'keyList', 'pinInput', 'console', 'consoleSection', 'connectionStatus', 'bioPopup',
  'keyAlgorithm', 'keyMarker', 'useBio', 'signData', 'signResult', 'signResultText',
  'btnRefreshDevices', 'btnLogin', 'btnLogout', 'btnCreateKey', 'btnRefreshKeys',
  'btnDeleteKey', 'btnSign', 'btnLoginBio', 'btnLogoutBio', 'btnStopLoginBio',
  'btnClearConsole', 'btnCopyConsole', 'btnToggleLogs'
];
const elements = Object.fromEntries(ids.map(function(id) { return [id, new FakeElement()]; }));

global.document = {
  readyState: 'complete',
  getElementById: function(id) { return elements[id]; },
  createElement: function() { return new FakeElement(); }
};
global.confirm = function() { return true; };

const calls = { logoutBio: 0, setKeyLabels: [] };
let keyIds = ['0123456789ABCDEF0001', '0123456789ABCDEF0002'];
const labels = {
  '0123456789ABCDEF0001': 'Био ключ',
  '0123456789ABCDEF0002': 'Обычный ключ'
};
const bioKeys = new Set(['0123456789ABCDEF0001']);
const plugin = {
  KEY_SPEC_SIGN: 7,
  PUBLIC_KEY_ALGORITHM_GOST3410_2012_256: 42,
  TOKEN_INFO_LABEL: 1,
  TOKEN_INFO_MODEL: 2,
  TOKEN_INFO_FEATURES: 3,
  TOKEN_INFO_BIO_ATTEMPTS_INFO: 4,
  BIO_TYPE_NOT_SUPPORTED: 0,
  version: '4.12.2.0',
  valid: true,
  enumerateDevices: function() { return Promise.resolve([1, 2]); },
  getDeviceInfo: function(deviceId, option) {
    if (option === this.TOKEN_INFO_LABEL) return Promise.resolve(deviceId === 1 ? 'Rutoken ECP <no label>' : 'Rutoken ECP Office');
    if (option === this.TOKEN_INFO_MODEL) return Promise.resolve('Rutoken BIO');
    if (option === this.TOKEN_INFO_FEATURES) return Promise.resolve({ bio: 1 });
    if (option === this.TOKEN_INFO_BIO_ATTEMPTS_INFO) return Promise.resolve({ attemptsMax: 5, attemptsLeft: 5 });
    return Promise.reject(new Error('unknown option'));
  },
  enumerateKeys: function() { return Promise.resolve(keyIds.slice()); },
  getKeyLabel: function(deviceId, keyId) { return Promise.resolve(labels[keyId] || ''); },
  login: function(deviceId, pin) { calls.loginDevice = deviceId; calls.pinLength = pin.length; return Promise.resolve(); },
  logout: function() { return Promise.resolve(); },
  generateKeyPair: function(deviceId, id, marker, options) {
    calls.generateOptions = options;
    calls.generatedMarker = marker;
    const keyId = '0123456789ABCDEF0003';
    if (!keyIds.includes(keyId)) keyIds.push(keyId);
    if (options.linkToBiometrics) bioKeys.add(keyId);
    return Promise.resolve(keyId);
  },
  setKeyLabel: function(deviceId, keyId, label) {
    calls.setKeyLabels.push({ deviceId: deviceId, keyId: keyId, label: label });
    labels[keyId] = label;
    return Promise.resolve();
  },
  deleteKeyPair: function() { return Promise.resolve(); },
  isLoginBioRequired: function(deviceId, keyId) { return Promise.resolve(bioKeys.has(keyId)); },
  loginBio: function(deviceId, options, callback) { callback(true); return Promise.resolve(); },
  rawSign: function(deviceId, keyId, data, options) {
    calls.signDevice = deviceId;
    calls.signOptions = options;
    return Promise.resolve('signature');
  },
  logoutBio: function() { calls.logoutBio += 1; return Promise.resolve(); },
  stopLoginBio: function() { return Promise.resolve(); }
};

global.window = {
  location: { href: 'https://example.test/' },
  navigator: {
    userAgent: 'test-browser',
    language: 'ru-RU',
    clipboard: { writeText: function(text) { calls.copiedText = text; return Promise.resolve(); } }
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  rutoken: {
    ready: Promise.resolve(),
    isExtensionInstalled: function() { return Promise.resolve(false); },
    isPluginInstalled: function() { return Promise.resolve(true); },
    loadPlugin: function() { return Promise.resolve(plugin); }
  }
};

function flush(times) {
  let promise = Promise.resolve();
  for (let i = 0; i < (times || 1); i += 1) promise = promise.then(function() { return new Promise(setImmediate); });
  return promise;
}

(async function() {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /id="pinInput" value="12345678"/, 'PIN по умолчанию должен быть задан в HTML');
  assert.equal((html.match(/class="step-number"/g) || []).length, 5, 'интерфейс должен содержать пять шагов');

  require('./script.js');
  await flush(5);

  assert.equal(elements.connectionStatus.textContent, 'Плагин загружен ✓', 'неудачная дополнительная проверка расширения не должна ломать загрузку плагина');
  assert.equal(elements.connectionStatus.classList.contains('connected'), true);
  assert.deepEqual(elements.deviceList.options.map(function(option) { return option.textContent; }), [
    'Рутокен Био (без метки)', 'Рутокен Био Office'
  ]);
  assert.equal(elements.keyList.options.length, 2, 'в списке должны сохраняться обе ключевые пары');
  assert.match(elements.keyList.options[0].textContent, /^🔬 Био ключ/);
  assert.match(elements.keyList.options[1].textContent, /^🔑 Обычный ключ/);

  elements.deviceList.value = '2';
  elements.deviceList.dispatch('change');
  elements.pinInput.value = '87654321';
  elements.btnLogin.dispatch('click');
  await flush(4);
  assert.equal(calls.loginDevice, 2, 'выбор устройства должен применяться ко входу');
  assert.equal(calls.pinLength, 8);

  elements.keyAlgorithm.value = 'PUBLIC_KEY_ALGORITHM_GOST3410_2012_256';
  elements.keyMarker.value = 'Читаемая метка';
  elements.useBio.checked = true;
  elements.btnCreateKey.dispatch('click');
  await flush(7);
  assert.equal(calls.generateOptions.publicKeyAlgorithm, 42, 'в API должна передаваться константа алгоритма');
  assert.equal(calls.generateOptions.keySpec, 7, 'должен создаваться ключ подписи');
  assert.equal(calls.generateOptions.linkToBiometrics, true, 'биометрическая защита должна запрашиваться явно');
  assert.deepEqual(calls.setKeyLabels[0], { deviceId: 2, keyId: '0123456789ABCDEF0003', label: 'Читаемая метка' });
  assert.equal(elements.keyList.options.length, 3, 'созданный ключ должен добавляться к существующим, а не заменять их');
  assert.match(elements.keyList.options[2].textContent, /Читаемая метка/);

  elements.keyList.value = '0123456789ABCDEF0001';
  elements.signData.value = 'СЕКРЕТНЫЙ_ТЕКСТ_123';
  elements.btnSign.dispatch('click');
  await flush(5);
  assert.equal(calls.signDevice, 2, 'подпись должна использовать выбранное устройство');
  assert.equal(calls.signOptions.computeHash, true, 'текстовые данные должны хешироваться перед подписью');
  assert.equal(calls.logoutBio, 1, 'после био-подписи должен выполняться выход');

  elements.bioPopup.style.display = 'flex';
  elements.btnStopLoginBio.dispatch('click');
  await flush(2);
  assert.equal(elements.bioPopup.style.display, 'none', 'остановка биометрии должна закрывать попап');

  elements.btnToggleLogs.dispatch('click');
  assert.equal(elements.consoleSection.classList.contains('detailed'), true);
  assert.equal(elements.btnToggleLogs.textContent, 'Скрыть подробные логи');
  elements.btnCopyConsole.dispatch('click');
  await flush(2);
  assert.match(calls.copiedText, /\[DEBUG\] page\.init/);
  assert.doesNotMatch(calls.copiedText, /87654321|СЕКРЕТНЫЙ_ТЕКСТ_123/, 'PIN и подписываемые данные не должны попадать в журнал');

  console.log('OK');
})().catch(function(error) {
  console.error(error);
  process.exitCode = 1;
});

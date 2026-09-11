'use strict';

const assert = require('node:assert/strict');

class FakeElement {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.classList = { add: function() {} };
    this.value = '';
    this.checked = false;
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  dispatch(type) {
    this.listeners[type]();
  }

  appendChild(child) {
    this.children.push(child);
  }

  get options() {
    return this.children;
  }

  set innerHTML(value) {
    assert.equal(value, '');
    this.children = [];
  }
}

const ids = [
  'deviceList', 'keyList', 'pinInput', 'console', 'connectionStatus', 'bioPopup',
  'keyAlgorithm', 'keyMarker', 'useBio', 'signData', 'signResult', 'signResultText',
  'btnRefreshDevices', 'btnLogin', 'btnLogout', 'btnCreateKey', 'btnRefreshKeys',
  'btnDeleteKey', 'btnSign', 'btnLoginBio', 'btnLogoutBio', 'btnStopLoginBio',
  'btnClearConsole'
];
const elements = Object.fromEntries(ids.map(function(id) { return [id, new FakeElement()]; }));

global.document = {
  readyState: 'complete',
  getElementById: function(id) { return elements[id]; },
  createElement: function() { return new FakeElement(); }
};
global.confirm = function() { return true; };

const calls = { logoutBio: 0 };
const plugin = {
  KEY_SPEC_SIGN: 7,
  PUBLIC_KEY_ALGORITHM_GOST3410_2012_256: 42,
  TOKEN_INFO_LABEL: 1,
  enumerateDevices: function() { return Promise.resolve([1, 2]); },
  getDeviceInfo: function(deviceId) { return Promise.resolve('Устройство #' + deviceId); },
  enumerateKeys: function() { return Promise.resolve(['key-1']); },
  getKeyLabel: function() { return Promise.resolve('Тестовый ключ'); },
  login: function(deviceId) { calls.loginDevice = deviceId; return Promise.resolve(); },
  logout: function() { return Promise.resolve(); },
  generateKeyPair: function(deviceId, id, marker, options) {
    calls.generateOptions = options;
    return Promise.resolve();
  },
  deleteKeyPair: function() { return Promise.resolve(); },
  isLoginBioRequired: function() { return Promise.resolve(true); },
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
  rutoken: {
    ready: Promise.resolve(),
    isPluginInstalled: function() { return Promise.resolve(true); },
    loadPlugin: function() { return Promise.resolve(plugin); }
  }
};

function flush() {
  return new Promise(function(resolve) { setImmediate(resolve); });
}

(async function() {
  require('./script.js');
  await flush();
  await flush();

  elements.deviceList.value = '2';
  elements.deviceList.dispatch('change');
  elements.pinInput.value = 'secret';
  elements.btnLogin.dispatch('click');
  await flush();
  assert.equal(calls.loginDevice, 2, 'выбор устройства должен применяться к входу');

  elements.keyAlgorithm.value = 'PUBLIC_KEY_ALGORITHM_GOST3410_2012_256';
  elements.btnCreateKey.dispatch('click');
  await flush();
  assert.equal(calls.generateOptions.publicKeyAlgorithm, 42, 'в API должна передаваться константа алгоритма');
  assert.equal(calls.generateOptions.keySpec, 7, 'для демо подписи должен создаваться ключ подписи');

  elements.keyList.value = 'key-1';
  elements.signData.value = 'данные';
  elements.btnSign.dispatch('click');
  await flush();
  await flush();
  assert.equal(calls.signDevice, 2, 'подпись должна использовать выбранное устройство');
  assert.equal(calls.signOptions.computeHash, true, 'текстовые данные должны хешироваться перед подписью');
  assert.equal(calls.logoutBio, 1, 'после био-подписи должен выполняться выход');

  elements.bioPopup.style.display = 'flex';
  elements.btnStopLoginBio.dispatch('click');
  await flush();
  assert.equal(elements.bioPopup.style.display, 'none', 'остановка биометрии должна закрывать попап');

  elements.keyList.value = '';
  elements.btnDeleteKey.dispatch('click');
  console.log('OK');
})().catch(function(error) {
  console.error(error);
  process.exitCode = 1;
});

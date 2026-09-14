// ===== Рутокен Био — Демо =====
(function() {
  'use strict';

  const BUILD_ID = '2026-09-14.1';
  let plugin = null;
  let currentDevice = null;
  let deviceRefreshGeneration = 0;
  let keyRefreshGeneration = 0;
  let bioSessionActive = false;
  const deviceIds = new Map();
  const deviceProfiles = new Map();
  const knownKeyProtection = new Map();

  const deviceList = document.getElementById('deviceList');
  const keyList = document.getElementById('keyList');
  const pinInput = document.getElementById('pinInput');
  const consoleEl = document.getElementById('console');
  const consoleSection = document.getElementById('consoleSection');
  const connectionStatus = document.getElementById('connectionStatus');
  const bioPopup = document.getElementById('bioPopup');
  const btnCreateKey = document.getElementById('btnCreateKey');
  const btnToggleLogs = document.getElementById('btnToggleLogs');

  function appendLog(msg, type) {
    const line = document.createElement('div');
    line.className = 'console-line ' + (type || 'info');
    line.textContent = '[' + new Date().toLocaleTimeString('ru-RU') + '] ' + msg;
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
  function log(msg, type) { appendLog(msg, type || 'info'); }
  function safeJson(value) {
    try {
      return JSON.stringify(value, function(key, item) {
        if (/^(pin|password|payload|data)$/i.test(key)) return '[скрыто]';
        if (typeof item === 'string' && item.length > 240) return item.slice(0, 80) + '… (длина ' + item.length + ')';
        return item;
      });
    } catch (error) { return String(value); }
  }
  function errorDetails(error) {
    if (error === null || typeof error === 'undefined') return { message: 'неизвестная ошибка' };
    if (typeof error !== 'object') return { message: String(error) };
    return {
      name: error.name || undefined,
      message: error.message || String(error),
      code: typeof error.code !== 'undefined' ? error.code : undefined,
      stack: error.stack || undefined
    };
  }
  function errorMessage(error) { return errorDetails(error).message; }
  function debug(eventName, details) {
    appendLog('[DEBUG] ' + eventName + (typeof details === 'undefined' ? '' : ' ' + safeJson(details)), 'debug');
  }
  function trace(operation, details, action, summarizeResult) {
    const startedAt = Date.now();
    debug(operation + '.start', details);
    let operationResult;
    try { operationResult = action(); }
    catch (error) {
      debug(operation + '.error', { elapsedMs: Date.now() - startedAt, error: errorDetails(error) });
      return Promise.reject(error);
    }
    return Promise.resolve(operationResult).then(function(result) {
      let summary;
      if (summarizeResult) summary = summarizeResult(result);
      else if (Array.isArray(result)) summary = { count: result.length, values: result };
      else if (typeof result === 'string') summary = { value: result.length > 80 ? result.slice(-16) : result, length: result.length };
      else summary = result;
      debug(operation + '.success', { elapsedMs: Date.now() - startedAt, result: summary });
      return result;
    }).catch(function(error) {
      debug(operation + '.error', { elapsedMs: Date.now() - startedAt, error: errorDetails(error) });
      throw error;
    });
  }
  function clearConsole() { consoleEl.innerHTML = ''; }
  function toggleDetailedLogs() {
    const shown = consoleSection.classList.toggle('detailed');
    btnToggleLogs.textContent = shown ? 'Скрыть подробные логи' : 'Показать подробные логи';
    if (shown && consoleSection.scrollIntoView) consoleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function copyConsole() {
    const text = Array.prototype.map.call(consoleEl.children, function(line) { return line.textContent; }).join('\n');
    if (!text) { log('Журнал пока пуст', 'warning'); return; }
    if (!window.navigator || !window.navigator.clipboard || !window.navigator.clipboard.writeText) {
      log('Браузер не разрешил доступ к буферу обмена', 'error'); return;
    }
    window.navigator.clipboard.writeText(text).then(function() {
      log('Журнал скопирован в буфер обмена', 'success');
    }).catch(function(error) {
      log('Не удалось скопировать журнал: ' + errorMessage(error), 'error');
      debug('console.copy.error', errorDetails(error));
    });
  }
  function getSelectedKey() {
    const value = keyList.value;
    if (!value) log('Ключ не выбран', 'error');
    return value || null;
  }
  function setConnectionStatus(text, connected) {
    connectionStatus.textContent = text;
    if (connected) connectionStatus.classList.add('connected');
    else connectionStatus.classList.remove('connected');
  }

  function loadPlugin() {
    let stage = 'loader.global';
    debug('page.init', {
      build: BUILD_ID,
      url: window.location && window.location.href,
      userAgent: window.navigator && window.navigator.userAgent,
      language: window.navigator && window.navigator.language
    });
    if (typeof window.rutoken === 'undefined') {
      log('Загрузчик Рутокен не обнаружен на странице', 'error');
      setConnectionStatus('Загрузчик не найден', false);
      debug('loader.global.missing');
      return;
    }
    debug('loader.global.success', { methods: Object.keys(window.rutoken).sort() });
    stage = 'loader.ready';
    Promise.resolve(window.rutoken.ready).then(function() {
      debug('loader.ready.success');
      if (typeof window.rutoken.isExtensionInstalled === 'function') {
        trace('loader.isExtensionInstalled', {}, function() { return window.rutoken.isExtensionInstalled(); }).then(function(installed) {
          if (!installed) log('Расширение браузера не обнаружено диагностикой; продолжаю проверку самого плагина', 'warning');
        }).catch(function(error) { debug('loader.isExtensionInstalled.advisoryError', errorDetails(error)); });
      }
      stage = 'loader.isPluginInstalled';
      return trace(stage, {}, function() { return window.rutoken.isPluginInstalled(); });
    }).then(function(installed) {
      if (!installed) {
        log('Плагин Рутокен не установлен', 'error');
        setConnectionStatus('Плагин не установлен', false);
        return null;
      }
      stage = 'loader.loadPlugin';
      return trace(stage, {}, function() { return window.rutoken.loadPlugin(); }, function(loadedPlugin) {
        return { available: Boolean(loadedPlugin), version: loadedPlugin && loadedPlugin.version, valid: loadedPlugin && loadedPlugin.valid };
      });
    }).then(function(loadedPlugin) {
      if (!loadedPlugin) return;
      plugin = loadedPlugin;
      setConnectionStatus('Плагин загружен ✓', true);
      log('Плагин Рутокен загружен', 'success');
      debug('plugin.capabilities', {
        version: plugin.version,
        valid: plugin.valid,
        hasBiometrics: typeof plugin.loginBio === 'function',
        hasBioAttemptsInfo: typeof plugin.TOKEN_INFO_BIO_ATTEMPTS_INFO !== 'undefined',
        hasSetKeyLabel: typeof plugin.setKeyLabel === 'function'
      });
      refreshDevices();
    }).catch(function(error) {
      log('Ошибка на этапе «' + stage + '»: ' + errorMessage(error), 'error');
      setConnectionStatus('Ошибка: ' + stage.replace('loader.', ''), false);
      debug('loader.failure', { stage: stage, error: errorDetails(error) });
    });
  }

  function normalizeDeviceLabel(label) {
    const raw = String(label || '').trim();
    const suffix = raw.replace(/^Rutoken ECP\s*/i, '').trim();
    if (!suffix || /^<no label>$/i.test(suffix)) return 'Рутокен Био (без метки)';
    return 'Рутокен Био ' + suffix;
  }
  function readDeviceProfile(deviceId) {
    const requests = [trace('device.getLabel', { deviceId: deviceId }, function() {
      return plugin.getDeviceInfo(deviceId, plugin.TOKEN_INFO_LABEL);
    }).catch(function(error) { debug('device.getLabel.fallback', { deviceId: deviceId, error: errorDetails(error) }); return ''; })];
    if (typeof plugin.TOKEN_INFO_MODEL !== 'undefined') requests.push(trace('device.getModel', { deviceId: deviceId }, function() {
      return plugin.getDeviceInfo(deviceId, plugin.TOKEN_INFO_MODEL);
    }).catch(function() { return null; }));
    else requests.push(Promise.resolve(null));
    if (typeof plugin.TOKEN_INFO_FEATURES !== 'undefined') requests.push(trace('device.getFeatures', { deviceId: deviceId }, function() {
      return plugin.getDeviceInfo(deviceId, plugin.TOKEN_INFO_FEATURES);
    }).catch(function() { return null; }));
    else requests.push(Promise.resolve(null));
    if (typeof plugin.TOKEN_INFO_BIO_ATTEMPTS_INFO !== 'undefined') requests.push(trace('device.getBioAttempts', { deviceId: deviceId }, function() {
      return plugin.getDeviceInfo(deviceId, plugin.TOKEN_INFO_BIO_ATTEMPTS_INFO);
    }).catch(function(error) { debug('device.getBioAttempts.unavailable', { deviceId: deviceId, error: errorDetails(error) }); return null; }));
    else requests.push(Promise.resolve(null));
    return Promise.all(requests).then(function(values) {
      return { id: deviceId, rawLabel: values[0], displayLabel: normalizeDeviceLabel(values[0]), model: values[1], features: values[2], bioAttempts: values[3] };
    });
  }
  function refreshDevices() {
    if (!plugin) { log('Плагин не загружен', 'error'); return Promise.resolve(); }
    const generation = ++deviceRefreshGeneration;
    ++keyRefreshGeneration;
    log('Обновляю список устройств…');
    return trace('device.enumerate', { generation: generation }, function() { return plugin.enumerateDevices(); }).then(function(devices) {
      return Promise.all((devices || []).map(readDeviceProfile));
    }).then(function(profiles) {
      if (generation !== deviceRefreshGeneration) { debug('device.refresh.stale', { generation: generation, currentGeneration: deviceRefreshGeneration }); return; }
      deviceList.innerHTML = '';
      keyList.innerHTML = '';
      deviceIds.clear();
      deviceProfiles.clear();
      currentDevice = null;
      if (!profiles.length) { log('Нет подключённых устройств', 'warning'); return; }
      profiles.forEach(function(profile) {
        const stringId = String(profile.id);
        deviceIds.set(stringId, profile.id);
        deviceProfiles.set(stringId, profile);
        const option = document.createElement('option');
        option.value = stringId;
        option.textContent = profile.displayLabel;
        deviceList.appendChild(option);
        debug('device.profile', profile);
      });
      deviceList.value = String(profiles[0].id);
      currentDevice = profiles[0].id;
      log('Найдено устройств: ' + profiles.length, 'success');
      return refreshKeys();
    }).catch(function(error) {
      if (generation === deviceRefreshGeneration) log('Ошибка получения списка устройств: ' + errorMessage(error), 'error');
    });
  }
  function onDeviceChange() {
    currentDevice = deviceIds.get(deviceList.value);
    if (typeof currentDevice === 'undefined') return;
    bioSessionActive = false;
    debug('device.selected', { deviceId: currentDevice, profile: deviceProfiles.get(String(currentDevice)) });
    refreshKeys();
  }

  function login() {
    if (!plugin || currentDevice === null) { log('Устройство не выбрано или плагин не загружен', 'error'); return; }
    const deviceId = currentDevice;
    const pin = pinInput.value;
    trace('auth.loginPin', { deviceId: deviceId, pinLength: pin.length }, function() { return plugin.login(deviceId, pin); }).then(function() {
      log('Вход выполнен успешно', 'success'); refreshKeys();
    }).catch(function(error) { log('Ошибка входа: ' + errorMessage(error), 'error'); });
  }
  function logout() {
    if (!plugin || currentDevice === null) return;
    const deviceId = currentDevice;
    trace('auth.logoutPin', { deviceId: deviceId }, function() { return plugin.logout(deviceId); }).then(function() {
      log('Выход выполнен', 'success');
    }).catch(function(error) { log('Ошибка выхода: ' + errorMessage(error), 'error'); });
  }

  function shortKeyId(keyId) {
    const value = String(keyId);
    return value.length > 10 ? '…' + value.slice(-8) : value;
  }
  function inspectKey(deviceId, keyId) {
    const id = String(keyId);
    return Promise.all([
      trace('key.getLabel', { deviceId: deviceId, keyId: id }, function() { return plugin.getKeyLabel(deviceId, keyId); })
        .catch(function(error) { debug('key.getLabel.fallback', { keyId: id, error: errorDetails(error) }); return ''; }),
      trace('key.isLoginBioRequired', { deviceId: deviceId, keyId: id }, function() { return plugin.isLoginBioRequired(deviceId, keyId); })
        .catch(function(error) { debug('key.isLoginBioRequired.unavailable', { keyId: id, error: errorDetails(error) }); return null; })
    ]).then(function(values) {
      let protection = knownKeyProtection.get(id);
      if (values[1] === true) protection = true;
      else if (values[1] === false && !bioSessionActive && typeof protection === 'undefined') protection = false;
      if (typeof protection !== 'undefined') knownKeyProtection.set(id, protection);
      return { id: id, label: String(values[0] || '').trim(), bioRequired: values[1], protection: protection };
    });
  }
  function refreshKeys() {
    if (!plugin || currentDevice === null) return Promise.resolve();
    const generation = ++keyRefreshGeneration;
    const deviceId = currentDevice;
    const selectedKey = keyList.value;
    return trace('key.enumerate', { deviceId: deviceId, generation: generation }, function() { return plugin.enumerateKeys(deviceId, ''); }).then(function(keys) {
      return Promise.all((keys || []).map(function(keyId) { return inspectKey(deviceId, keyId); }));
    }).then(function(keys) {
      if (generation !== keyRefreshGeneration || deviceId !== currentDevice) { debug('key.refresh.stale', { generation: generation, currentGeneration: keyRefreshGeneration }); return; }
      keyList.innerHTML = '';
      if (!keys.length) {
        const empty = document.createElement('option');
        empty.textContent = 'Ключей нет'; empty.disabled = true; empty.value = ''; keyList.appendChild(empty);
        log('Ключевых пар на устройстве нет', 'warning'); return;
      }
      keys.forEach(function(key) {
        const option = document.createElement('option');
        const icon = key.protection === true ? '🔬' : (key.protection === false ? '🔑' : '❔');
        option.value = key.id;
        option.textContent = icon + ' ' + (key.label || 'Ключ без метки') + ' · ' + shortKeyId(key.id);
        keyList.appendChild(option);
        debug('key.profile', key);
      });
      keyList.value = keys.some(function(key) { return key.id === selectedKey; }) ? selectedKey : keys[0].id;
      log('Найдено ключевых пар: ' + keys.length, 'success');
    }).catch(function(error) {
      if (generation === keyRefreshGeneration) log('Ошибка получения списка ключей: ' + errorMessage(error), 'error');
    });
  }

  function bioAttemptsAvailable(attempts) {
    if (!attempts || typeof attempts !== 'object') return false;
    const maximum = Number(attempts.attemptsMax);
    const left = Number(attempts.attemptsLeft);
    return Number.isFinite(maximum) && Number.isFinite(left) && maximum > 0 && left > 0;
  }
  function preflightBioKey(deviceId) {
    if (typeof plugin.TOKEN_INFO_BIO_ATTEMPTS_INFO === 'undefined') return Promise.reject(new Error('Версия плагина не позволяет проверить готовность биометрии'));
    const profile = deviceProfiles.get(String(deviceId));
    if (profile && profile.features && typeof plugin.BIO_TYPE_NOT_SUPPORTED !== 'undefined' && profile.features.bio === plugin.BIO_TYPE_NOT_SUPPORTED) {
      return Promise.reject(new Error('Подключённое устройство не поддерживает биометрию'));
    }
    return trace('bio.preflightAttempts', { deviceId: deviceId }, function() {
      return plugin.getDeviceInfo(deviceId, plugin.TOKEN_INFO_BIO_ATTEMPTS_INFO);
    }).then(function(attempts) {
      if (!bioAttemptsAvailable(attempts)) throw new Error('Биометрия не инициализирована, заблокирована или сведения о попытках недоступны');
      return attempts;
    });
  }
  function verifyCreatedKey(deviceId, keyId, requestedBio) {
    if (bioSessionActive) {
      return trace('bio.logoutBeforeVerification', { deviceId: deviceId }, function() { return plugin.logoutBio(deviceId); }).then(function() {
        bioSessionActive = false; return verifyCreatedKey(deviceId, keyId, requestedBio);
      });
    }
    return trace('key.verifyProtection', { deviceId: deviceId, keyId: String(keyId), requestedBio: requestedBio }, function() {
      return plugin.isLoginBioRequired(deviceId, keyId);
    }).then(function(required) {
      knownKeyProtection.set(String(keyId), requestedBio);
      if (Boolean(required) !== requestedBio) {
        log('Тип созданного ключа не совпал с запросом. Покажите подробные логи и скопируйте журнал.', 'error');
        debug('key.protectionMismatch', { keyId: String(keyId), requestedBio: requestedBio, bioRequired: required });
      } else debug('key.protectionVerified', { keyId: String(keyId), bioRequired: required });
      return required;
    });
  }
  function createKeyPair() {
    if (!plugin || currentDevice === null) { log('Устройство не выбрано', 'error'); return; }
    const deviceId = currentDevice;
    const algorithmName = document.getElementById('keyAlgorithm').value;
    const algorithm = plugin[algorithmName];
    const marker = document.getElementById('keyMarker').value.trim() || 'TestKey';
    const useBio = document.getElementById('useBio').checked;
    if (typeof algorithm === 'undefined') { log('Алгоритм не поддерживается установленной версией плагина', 'error'); return; }
    const options = { publicKeyAlgorithm: algorithm, keySpec: plugin.KEY_SPEC_SIGN };
    if (useBio) options.linkToBiometrics = true;
    btnCreateKey.disabled = true;
    const pendingTimer = window.setTimeout(function() {
      log('Создание ключа всё ещё выполняется. Не отключайте токен; подробности записаны в журнал.', 'warning');
      debug('key.generate.pending', { deviceId: deviceId, elapsedMs: 10000, requestedBio: useBio });
    }, 10000);
    log('Создание ключевой пары «' + marker + '» (биометрия: ' + (useBio ? 'да' : 'нет') + ')…');
    (useBio ? preflightBioKey(deviceId) : Promise.resolve()).then(function() {
      return trace('key.generate', { deviceId: deviceId, marker: marker, algorithm: algorithmName, requestedBio: useBio, options: options }, function() {
        return plugin.generateKeyPair(deviceId, undefined, marker, options);
      });
    }).then(function(keyId) {
      if (typeof keyId === 'undefined' || keyId === null || keyId === '') throw new Error('Плагин не вернул идентификатор созданного ключа');
      knownKeyProtection.set(String(keyId), useBio);
      if (typeof plugin.setKeyLabel !== 'function') { log('Ключ создан, но установленная версия плагина не поддерживает читаемые метки', 'warning'); return keyId; }
      return trace('key.setLabel', { deviceId: deviceId, keyId: String(keyId), label: marker }, function() {
        return plugin.setKeyLabel(deviceId, keyId, marker);
      }).catch(function(error) { log('Ключ создан, но метку задать не удалось: ' + errorMessage(error), 'warning'); }).then(function() { return keyId; });
    }).then(function(keyId) {
      return verifyCreatedKey(deviceId, keyId, useBio).catch(function(error) {
        debug('key.verifyProtection.error', { keyId: String(keyId), error: errorDetails(error) });
        log('Ключ создан, но проверить его биометрическую защиту не удалось: ' + errorMessage(error), 'warning');
      }).then(function() { log('Ключевая пара «' + marker + '» создана', 'success'); return refreshKeys(); });
    }).catch(function(error) {
      log('Ошибка создания ключевой пары: ' + errorMessage(error), 'error');
      if (useBio) log('Проверьте, что отпечатки зарегистрированы, затем скопируйте подробный журнал.', 'warning');
    }).then(function() { window.clearTimeout(pendingTimer); btnCreateKey.disabled = false; });
  }
  function deleteKey() {
    if (!plugin || currentDevice === null) return;
    const keyId = getSelectedKey();
    if (!keyId || !confirm('Удалить ключевую пару?')) return;
    const deviceId = currentDevice;
    trace('key.delete', { deviceId: deviceId, keyId: keyId }, function() { return plugin.deleteKeyPair(deviceId, keyId); }).then(function() {
      knownKeyProtection.delete(String(keyId)); log('Ключевая пара удалена', 'success'); refreshKeys();
    }).catch(function(error) { log('Ошибка удаления: ' + errorMessage(error), 'error'); });
  }

  function performBioLogin(deviceId, options) {
    return new Promise(function(resolve, reject) {
      let callbackCalled = false;
      let request;
      try {
        request = plugin.loginBio(deviceId, options, function(success) {
          if (callbackCalled) return;
          callbackCalled = true;
          debug('bio.login.callback', { deviceId: deviceId, objectId: options.objectId, success: Boolean(success) });
          resolve(Boolean(success));
        });
      } catch (error) { reject(error); return; }
      Promise.resolve(request).catch(reject);
    });
  }
  function doSign(deviceId, keyId, data) {
    return trace('sign.rawSign', { deviceId: deviceId, keyId: keyId, dataLength: data.length, computeHash: true }, function() {
      return plugin.rawSign(deviceId, keyId, data, { computeHash: true });
    }, function(result) { return { signatureLength: String(result || '').length }; }).then(function(result) {
      log('Подпись выполнена успешно', 'success');
      document.getElementById('signResult').style.display = 'block';
      document.getElementById('signResultText').value = result;
    });
  }
  function signData() {
    if (!plugin || currentDevice === null) { log('Устройство не выбрано', 'error'); return; }
    const data = document.getElementById('signData').value;
    if (!data) { log('Введите данные для подписи', 'error'); return; }
    const keyId = getSelectedKey();
    if (!keyId) return;
    const deviceId = currentDevice;
    log('Подпись данных выбранным ключом…');
    trace('sign.isLoginBioRequired', { deviceId: deviceId, keyId: keyId }, function() { return plugin.isLoginBioRequired(deviceId, keyId); }).then(function(bioRequired) {
      debug('sign.protectionDecision', { keyId: keyId, bioRequired: bioRequired, bioSessionActive: bioSessionActive });
      if (!bioRequired) return doSign(deviceId, keyId, data);
      showBioPopup();
      return trace('bio.loginForSign', { deviceId: deviceId, objectId: keyId, timeout: 30000 }, function() {
        return performBioLogin(deviceId, { objectId: keyId, timeout: 30000 });
      }).then(function(success) {
        hideBioPopup();
        if (!success) throw new Error('Биометрическая аутентификация не пройдена');
        bioSessionActive = true;
        log('Биометрическая аутентификация успешна', 'success');
        return doSign(deviceId, keyId, data).then(function() {
          return trace('bio.logoutAfterSign', { deviceId: deviceId }, function() { return plugin.logoutBio(deviceId); }).then(function() { bioSessionActive = false; });
        });
      });
    }).catch(function(error) {
      hideBioPopup(); log('Ошибка подписи: ' + errorMessage(error), 'error'); debug('sign.failure', errorDetails(error));
    });
  }
  function loginBio() {
    if (!plugin || currentDevice === null) { log('Устройство не выбрано', 'error'); return; }
    const deviceId = currentDevice;
    showBioPopup();
    trace('bio.login', { deviceId: deviceId, timeout: 30000 }, function() { return performBioLogin(deviceId, { timeout: 30000 }); }).then(function(success) {
      hideBioPopup();
      if (!success) { log('Биометрическая аутентификация не пройдена', 'warning'); return; }
      bioSessionActive = true; log('Вход по биометрии выполнен', 'success'); refreshKeys();
    }).catch(function(error) { hideBioPopup(); log('Ошибка входа по биометрии: ' + errorMessage(error), 'error'); });
  }
  function logoutBio() {
    if (!plugin || currentDevice === null) return;
    const deviceId = currentDevice;
    trace('bio.logout', { deviceId: deviceId }, function() { return plugin.logoutBio(deviceId); }).then(function() {
      bioSessionActive = false; log('Выход по биометрии выполнен', 'success'); refreshKeys();
    }).catch(function(error) { log('Ошибка выхода по биометрии: ' + errorMessage(error), 'error'); });
  }
  function stopLoginBio() {
    if (!plugin) return;
    trace('bio.stop', {}, function() { return plugin.stopLoginBio(); }).then(function() {
      hideBioPopup(); bioSessionActive = false; log('Проверка биометрии остановлена', 'warning');
    }).catch(function(error) { hideBioPopup(); log('Ошибка остановки: ' + errorMessage(error), 'error'); });
  }
  function showBioPopup() { bioPopup.style.display = 'flex'; }
  function hideBioPopup() { bioPopup.style.display = 'none'; }

  function init() {
    document.getElementById('btnRefreshDevices').addEventListener('click', refreshDevices);
    deviceList.addEventListener('change', onDeviceChange);
    document.getElementById('btnLogin').addEventListener('click', login);
    document.getElementById('btnLogout').addEventListener('click', logout);
    btnCreateKey.addEventListener('click', createKeyPair);
    document.getElementById('btnRefreshKeys').addEventListener('click', refreshKeys);
    document.getElementById('btnDeleteKey').addEventListener('click', deleteKey);
    document.getElementById('btnSign').addEventListener('click', signData);
    document.getElementById('btnLoginBio').addEventListener('click', loginBio);
    document.getElementById('btnLogoutBio').addEventListener('click', logoutBio);
    document.getElementById('btnStopLoginBio').addEventListener('click', stopLoginBio);
    document.getElementById('btnClearConsole').addEventListener('click', clearConsole);
    document.getElementById('btnCopyConsole').addEventListener('click', copyConsole);
    btnToggleLogs.addEventListener('click', toggleDetailedLogs);
    keyList.addEventListener('change', function() {
      if (keyList.value) {
        const selected = keyList.options[keyList.selectedIndex];
        log('Выбран ключ: ' + (selected ? selected.textContent : keyList.value));
        debug('key.selected', { keyId: keyList.value });
      }
    });
    loadPlugin();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

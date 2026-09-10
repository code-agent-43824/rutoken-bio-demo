// ===== Рутокен Био — Демо =====
// Светлый дизайн в стиле rutoken.ru

(function() {
  'use strict';

  // ===== СОСТОЯНИЕ =====
  let plugin = null;
  let currentDevice = null;
  let isLoggedIn = false;

  // ===== DOM =====
  const deviceList = document.getElementById('deviceList');
  const keyList = document.getElementById('keyList');
  const pinInput = document.getElementById('pinInput');
  const consoleEl = document.getElementById('console');
  const connectionStatus = document.getElementById('connectionStatus');
  const bioPopup = document.getElementById('bioPopup');

  // ===== УТИЛИТЫ =====
  function log(msg, type) {
    type = type || 'info';
    const line = document.createElement('div');
    line.className = 'console-line ' + type;
    const ts = new Date().toLocaleTimeString('ru-RU');
    line.textContent = '[' + ts + '] ' + msg;
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function clearConsole() {
    consoleEl.innerHTML = '';
  }

  function getSelectedDevice() {
    if (currentDevice === null) {
      throw new Error('Устройство не выбрано');
    }
    return currentDevice;
  }

  function getSelectedKey() {
    const val = keyList.value;
    if (!val) throw new Error('Ключ не выбран');
    return val;
  }

  // ===== ЗАГРУЗКА ПЛАГИНА =====
  function loadPlugin() {
    if (typeof window.rutoken !== 'undefined') {
      window.rutoken.ready.then(function() {
        return window.rutoken.isPluginInstalled();
      }).then(function(installed) {
        if (!installed) {
          log('Плагин Рутокен не установлен', 'error');
          connectionStatus.textContent = 'Плагин не установлен';
          return;
        }
        return window.rutoken.loadPlugin();
      }).then(function(loadedPlugin) {
        if (!loadedPlugin) return;
        plugin = loadedPlugin;
        connectionStatus.textContent = 'Плагин загружен ✓';
        connectionStatus.classList.add('connected');
        log('Плагин Рутокен загружен', 'success');
        refreshDevices();
      }).catch(function(err) {
        log('Ошибка загрузки плагина: ' + (err.message || err), 'error');
        connectionStatus.textContent = 'Ошибка загрузки';
      });
    } else {
      log('Плагин Рутокен не обнаружен', 'warning');
      connectionStatus.textContent = 'Плагин не найден';
    }
  }

  // ===== УСТРОЙСТВА =====
  function refreshDevices() {
    if (!plugin) {
      log('Плагин не загружен', 'error');
      return;
    }

    deviceList.innerHTML = '';
    plugin.enumerateDevices().then(function(devices) {
      if (!devices || devices.length === 0) {
        log('Нет подключённых устройств', 'warning');
        return;
      }

      devices.forEach(function(deviceId) {
        plugin.getDeviceInfo(deviceId, plugin.TOKEN_INFO_LABEL).then(function(label) {
          const option = document.createElement('option');
          option.value = deviceId;
          option.textContent = label || ('Устройство #' + deviceId);
          deviceList.appendChild(option);
          if (deviceList.options.length === 1) {
            currentDevice = deviceId;
            refreshKeys();
          }
        }).catch(function(err) {
          log('Ошибка получения информации об устройстве: ' + err, 'error');
        });
      });
    }).catch(function(err) {
      log('Ошибка получения списка устройств: ' + err, 'error');
    });
  }

  function onDeviceChange() {
    currentDevice = parseInt(deviceList.value, 10);
    if (isNaN(currentDevice)) return;
    refreshKeys();
  }

  // ===== ВХОД / ВЫХОД ПО PIN =====
  function login() {
    if (!plugin || currentDevice === null) {
      log('Устройство не выбрано или плагин не загружен', 'error');
      return;
    }

    const pin = pinInput.value;
    plugin.login(currentDevice, pin).then(function() {
      log('Вход выполнен успешно', 'success');
      isLoggedIn = true;
      refreshKeys();
    }).catch(function(err) {
      log('Ошибка входа: ' + (err.message || err), 'error');
    });
  }

  function logout() {
    if (!plugin || currentDevice === null) return;
    plugin.logout(currentDevice).then(function() {
      log('Выход выполнен', 'success');
      isLoggedIn = false;
    }).catch(function(err) {
      log('Ошибка выхода: ' + err, 'error');
    });
  }

  // ===== КЛЮЧЕВЫЕ ПАРЫ =====
  function refreshKeys() {
    if (!plugin || currentDevice === null) return;

    keyList.innerHTML = '';
    plugin.enumerateKeys(currentDevice, '').then(function(keys) {
      keyList.innerHTML = '';
      if (!keys || keys.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = 'Ключей нет';
        opt.disabled = true;
        keyList.appendChild(opt);
        return;
      }

      keys.forEach(function(keyId) {
        plugin.getKeyLabel(currentDevice, keyId).then(function(label) {
          const opt = document.createElement('option');
          opt.value = keyId;
          opt.textContent = label || ('Ключ #' + keyId);
          keyList.appendChild(opt);
        }).catch(function() {
          const opt = document.createElement('option');
          opt.value = keyId;
          opt.textContent = 'Ключ #' + keyId;
          keyList.appendChild(opt);
        });
      });
    }).catch(function(err) {
      log('Ошибка получения списка ключей: ' + err, 'error');
    });
  }

  // ===== СОЗДАНИЕ КЛЮЧЕВОЙ ПАРЫ =====
  function createKeyPair() {
    if (!plugin || currentDevice === null) {
      log('Устройство не выбрано', 'error');
      return;
    }

    const algorithm = document.getElementById('keyAlgorithm').value;
    const marker = document.getElementById('keyMarker').value || 'TestKey';
    const useBio = document.getElementById('useBio').checked;

    const options = {
      publicKeyAlgorithm: algorithm,
      keySpec: plugin.KEY_SPEC_SIGN_AND_EXCHANGE
    };

    if (useBio) {
      options.linkToBiometrics = true;
    }

    log('Создание ключевой пары (алгоритм: ' + algorithm + ', био: ' + useBio + ')...');

    plugin.generateKeyPair(currentDevice, undefined, marker, options).then(function() {
      log('Ключевая пара создана', 'success');
      refreshKeys();
    }).catch(function(err) {
      log('Ошибка создания ключевой пары: ' + (err.message || err), 'error');
    });
  }

  // ===== УДАЛЕНИЕ КЛЮЧА =====
  function deleteKey() {
    if (!plugin || currentDevice === null) return;
    const keyId = getSelectedKey();

    if (!confirm('Удалить ключевую пару?')) return;

    plugin.deleteKeyPair(currentDevice, keyId).then(function() {
      log('Ключевая пара удалена', 'success');
      refreshKeys();
    }).catch(function(err) {
      log('Ошибка удаления: ' + err, 'error');
    });
  }

  // ===== ПОДПИСЬ ДАННЫХ =====
  function signData() {
    if (!plugin || currentDevice === null) {
      log('Устройство не выбрано', 'error');
      return;
    }

    const data = document.getElementById('signData').value;
    if (!data) {
      log('Введите данные для подписи', 'error');
      return;
    }

    const keyId = getSelectedKey();
    log('Подпись данных на ключе ' + keyId + '...');

    // Проверяем нужна ли биометрия для этого ключа
    plugin.isLoginBioRequired(currentDevice, keyId).then(function(bioRequired) {
      if (bioRequired) {
        // Показываем попап
        showBioPopup();

        plugin.loginBio(currentDevice, { objectId: keyId, timeout: 30000 },
          function(isLoginBioSuccessful) {
            if (!isLoginBioSuccessful) {
              hideBioPopup();
              log('Биометрическая аутентификация не пройдена', 'error');
              return;
            }
            hideBioPopup();
            log('Биометрическая аутентификация успешна', 'success');
            doSign(currentDevice, keyId, data);
          }
        ).catch(function(err) {
          hideBioPopup();
          log('Ошибка биометрической аутентификации: ' + err, 'error');
        });
      } else {
        // Без биометрии
        doSign(currentDevice, keyId, data);
      }
    }).catch(function(err) {
      log('Ошибка проверки биометрии: ' + err, 'error');
    });
  }

  function doSign(deviceId, keyId, data) {
    plugin.sign(deviceId, keyId, data, false, { addUserCertificate: true }).then(function(result) {
      log('Подпись выполнена успешно', 'success');
      document.getElementById('signResult').style.display = 'block';
      document.getElementById('signResultText').value = result;
    }).catch(function(err) {
      log('Ошибка подписи: ' + err, 'error');
    });
  }

  // ===== БИОМЕТРИЧЕСКИЕ КНОПКИ =====
  function loginBio() {
    if (!plugin || currentDevice === null) {
      log('Устройство не выбрано', 'error');
      return;
    }
    showBioPopup();
    plugin.loginBio(currentDevice, { timeout: 30000 }, function(success) {
      if (success) {
        hideBioPopup();
        log('Вход по биометрии выполнен', 'success');
        refreshKeys();
      } else {
        hideBioPopup();
        log('Биометрическая аутентификация не пройдена', 'warning');
      }
    }).catch(function(err) {
      hideBioPopup();
      log('Ошибка входа по биометрии: ' + err, 'error');
    });
  }

  function logoutBio() {
    if (!plugin || currentDevice === null) return;
    plugin.logoutBio(currentDevice).then(function() {
      log('Выход по биометрии выполнен', 'success');
    }).catch(function(err) {
      log('Ошибка выхода по биометрии: ' + err, 'error');
    });
  }

  function stopLoginBio() {
    if (!plugin) return;
    plugin.stopLoginBio().then(function() {
      log('Проверка биометрии остановлена', 'warning');
    }).catch(function(err) {
      log('Ошибка остановки: ' + err, 'error');
    });
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ =====
  function showBioPopup() {
    bioPopup.style.display = 'flex';
  }

  function hideBioPopup() {
    bioPopup.style.display = 'none';
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====
  function init() {
    // Привязка обработчиков
    document.getElementById('btnRefreshDevices').addEventListener('click', refreshDevices);
    document.getElementById('btnLogin').addEventListener('click', login);
    document.getElementById('btnLogout').addEventListener('click', logout);
    document.getElementById('btnCreateKey').addEventListener('click', createKeyPair);
    document.getElementById('btnRefreshKeys').addEventListener('click', refreshKeys);
    document.getElementById('btnDeleteKey').addEventListener('click', deleteKey);
    document.getElementById('btnSign').addEventListener('click', signData);
    document.getElementById('btnLoginBio').addEventListener('click', loginBio);
    document.getElementById('btnLogoutBio').addEventListener('click', logoutBio);
    document.getElementById('btnStopLoginBio').addEventListener('click', stopLoginBio);

    deviceList.addEventListener('change', onDeviceChange);
    keyList.addEventListener('change', function() {
      if (keyList.value) {
        log('Выбран ключ: ' + keyList.value, 'info');
      }
    });

    // Загрузка плагина при старте
    loadPlugin();
  }

  // Запуск после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

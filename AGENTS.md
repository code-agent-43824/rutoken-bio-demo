# AGENTS.md — Рутокен Био Демо

## 📋 Контекст задачи

Заказчик: демонстрационная веб-страница для продукта **Рутокен Био** — биометрического USB-токена.

**Исходные требования:**
1. Создать репозиторий на GitHub (публичный)
2. Не деплоить пока — это сделает другой агент
3. Взять функции работы с био-токеном со страницы https://aktivco.github.io/rutoken-plugin-demo/
4. Реализовать: логин по PIN, создание ключевой пары (с био-флагом и без), подпись на ключе
5. Кнопки биометрии в правом верхнем углу: «Войти по биометрии», «Выйти по биометрии», «Остановить проверку био»
6. При подписи на био-ключе — большой попап «коснитесь биометрического датчика»
7. При подписи на обычном ключе — просто показать результат подписи

## 🏗️ Что сделано

### Этап 1: Создание репозитория и лендинга

**Коммит:** `cac5897` — "Add Rutoken Bio demo landing page"

Создан публичный репозиторий на GitHub: https://github.com/code-agent-43824/rutoken-bio-demo

Файлы:
- `index.html` — лендинг с hero-секцией, карточками возможностей, демо-секцией
- `style.css` — тёмная тема, адаптивная вёрстка, анимации
- `script.js` — интерактивная симуляция сканирования отпечатка

### Этап 2: Интеграция с Рутокен плагином

**Коммит:** `319cbfc` — "Add Rutoken plugin integration with bio demo"

Изучена референс-страница https://aktivco.github.io/rutoken-plugin-demo/ и её JS-код (`present.js`, ~3000 строк).

Ключевые выводы из анализа референса:
- Плагин загружается через `window.rutoken.loadPlugin()`
- Биометрический вход: `plugin.loginBio(deviceId, {objectId, timeout}, callback)`
- Проверка необходимости биометрии: `plugin.isLoginBioRequired(deviceId, keyId)`
- Выход по биометрии: `plugin.logoutBio(deviceId)`
- Остановка проверки: `plugin.stopLoginBio()`
- Подпись: `plugin.sign(deviceId, keyId, data, dataFormat, options)`

**Паттерн подписи с биометрией** (из референса):
```
isLoginBioRequired(deviceId, keyId) → если true:
  loginBio(deviceId, {objectId: keyId, timeout}) → callback(isLoginBioSuccessful):
    если успех → выполняем sign()
    если неуспех → отмена
  после sign → logoutBio()
иначе:
  сразу sign()
```

### Финальная структура файлов

```
rutoken-bio-demo/
├── index.html      # HTML: topbar, панели устройств/PIN/ключей/подписи, био-попап
├── style.css        # CSS: тёмная тема, grid-layout, попап, кнопки
├── script.js         # JS: загрузка плагина, все операции, биометрия
├── README.md         # Описание для разработчиков
└── AGENTS.md         # Этот файл — для агентов-преемников
```

## 🔧 Архитектура решения

### HTML (`index.html`)

Страница разделена на панели (grid-layout):

| Панель | Назначение |
|--------|-----------|
| **Topbar** | Заголовок + статус плагина |
| **Устройства** | Список подключённых токенов, обновление |
| **PIN-вход** | Поле ввода PIN, кнопки «Войти»/«Выйти» |
| **Ключевые пары** | Список ключей, обновление, удаление |
| **Создание ключа** | Выбор алгоритма, маркер, чекбокс биометрии |
| **Подпись** | Поле ввода данных, кнопка «Подписать», результат |
| **Консоль** | Лог всех операций с цветовой маркировкой |

**Биометрические кнопки** — в правом верхнем углу (`position: fixed; top: 16px; right: 24px`):
- `#btnLoginBio` — «Войти по биометрии» → `plugin.loginBio()`
- `#btnLogoutBio` — «Выйти по биометрии» → `plugin.logoutBio()`
- `#btnStopLoginBio` — «Остановить проверку био» → `plugin.stopLoginBio()`

**Биометрический попап** (`#bioPopup`):
- `position: fixed; top: 0; left: 0; right: 0; bottom: 0`
- Полупрозрачный фон `rgba(0,0,0,0.85)`
- Центрированный контент с иконкой отпечатка
- Показывается при подписи на био-ключе

### CSS (`style.css`)

- CSS Custom Properties (`:root`) для цветовой схемы
- Grid layout для основного контейнера
- `position: fixed` для био-кнопок и попапа
- Адаптивность: `@media (max-width: 768px)` переключает на одну колонку

### JavaScript (`script.js`)

IIFE-модуль с `'use strict'`. Основные функции:

```javascript
// Загрузка плагина
loadPlugin() → rutoken.ready → rutoken.isPluginInstalled() → rutoken.loadPlugin()

// Устройства
refreshDevices() → plugin.enumerateDevices() → plugin.getDeviceInfo()

// Вход по PIN
login() → plugin.login(currentDevice, pin)

// Создание ключевой пары
createKeyPair() → plugin.generateKeyPair(currentDevice, undefined, marker, options)
  // options.linkToBiometrics = true если чекбокс включён

// Подпись данных
signData():
  1. plugin.isLoginBioRequired(currentDevice, keyId)
  2. Если био нужна:
     - showBioPopup()
     - plugin.loginBio(currentDevice, {objectId: keyId, timeout: 30000}, callback)
     - В callback: если успех → hideBioPopup() → doSign()
  3. Если био не нужна:
     - doSign() напрямую

doSign(deviceId, keyId, data):
  plugin.sign(deviceId, keyId, data, false, {addUserCertificate: true})
  → показать результат в textarea

// Биометрические кнопки
loginBio()  → plugin.loginBio(currentDevice, {timeout: 30000}, callback)
logoutBio() → plugin.logoutBio(currentDevice)
stopLoginBio() → plugin.stopLoginBio()
```

## ⚠️ Что НЕ сделано (для следующих агентов)

1. **Деплой не выполнен** — страница не размещена на веб-сервере
2. **Не тестировалось с реальным токеном** — код написан по аналогии с референсом, но не проверен на реальном устройстве
3. **Обработка ошибок** — базовая, может потребовать улучшения
4. **Валидация ввода** — минимальная

## 📦 Инструкция для деплоя

### Вариант 1: GitHub Pages (простейший)

1. Зайти в настройки репозитория → Settings → Pages
2. Source: Deploy from a branch → Branch: `main` → Folder: `/ (root)`
3. Сохранить
4. Страница будет доступна по адресу: `https://code-agent-43824.github.io/rutoken-bio-demo/`

### Вариант 2: Веб-сервер (копирование файлов)

Скопировать содержимое репозитория в веб-директорию:
```bash
# Клонировать репозиторий
git clone https://github.com/code-agent-43824/rutoken-bio-demo.git

# Скопировать файлы в веб-директорию
cp rutoken-bio-demo/* /path/to/webroot/rutoken-bio-demo/
```

### Вариант 3: Локальный запуск (для тестирования)

```bash
cd rutoken-bio-demo
python3 -m http.server 8000
# Открыть http://localhost:8000 в браузере
```

## 🔌 Требования к окружению

- Браузер с поддержкой Рутокен плагина (Chrome, Firefox, Edge)
- Установленный Рутокен плагин в браузере
- Подключённый токен Рутокен Био

## 📝 Примечания

- Страница использует `window.rutoken` API
- Для работы плагина может потребоваться HTTPS
- Био-кнопки в правом верхнем углу — малозаметные, не отвлекают от основного интерфейса
- Попап «коснитесь биометрического датчика» — полноэкранный, полупрозрачный фон

## 🔄 Журнал изменений

| Коммит | Описание |
|--------|----------|
| `cac5897` | Создан лендинг с hero-секцией и описанием возможностей |
| `319cbfc` | Добавлена интеграция с Рутокен плагином: вход по PIN, создание ключей, подпись, биометрия |

## 🔗 Ссылки

- **Репозиторий:** https://github.com/code-agent-43824/rutoken-bio-demo
- **Референс (Рутокен плагин демо):** https://aktivco.github.io/rutoken-plugin-demo/
- **Документация плагина:** https://plugin.api.rutoken.ru/

---

© 2025 Рутокен Био — Демонстрационная страница

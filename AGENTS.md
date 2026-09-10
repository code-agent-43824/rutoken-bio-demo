# AGENTS.md — Рутокен Био Демо

## 📋 Контекст задачи

Создать демо-страницу для продукта **Рутокен Био** — биометрического USB-токена.

**Требования:**
1. Публичный репозиторий на GitHub
2. Не деплоить пока — это сделает другой агент
3. Взять функции работы с био-токеном со страницы https://aktivco.github.io/rutoken-plugin-demo/
4. Реализовать: логин по PIN, создание ключевой пары (с био-флагом и без), подпись на ключе
5. Кнопки биометрии в правом верхнем углу: «Войти по биометрии», «Выйти по биометрии», «Остановить проверку био»
6. При подписи на био-ключе — большой попап «коснитесь биометрического датчика»
7. При подписи на обычном ключе — просто показать результат подписи
8. Светлый дизайн в стиле rutoken.ru, не панель с функциями а customer journey

## 🏗️ Что сделано

### Этап 1: Создание репозитория

Создан публичный репозиторий: https://github.com/code-agent-43824/rutoken-bio-demo

### Этап 2: Лендинг + интеграция с плагином

Изучена референс-страница https://aktivco.github.io/rutoken-plugin-demo/ и её JS-код (~3000 строк).

**Ключевые выводы из анализа референса:**
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

### Этап 3: Светлый дизайн в стиле rutoken.ru

**Цветовая палитра Рутокен:**
- Красный: `#d23` (он же `#dd2233`)
- Бирюзовый: `#117788`
- Белый фон, светло-серые секции

**Структура страницы (customer journey):**

1. **Шапка** — логотип Рутокен + статус загрузки плагина
2. **Hero** — заголовок «Рутокен Био», подзаголовок, кнопки «Начать работу» и «Как это работает»
3. **4 шага** (steps-grid):
   - Шаг 1: Выбор устройства (select + кнопка «Обновить»)
   - Шаг 2: Вход по PIN (input + кнопки «Войти»/«Выйти»)
   - Шаг 3: Создание ключа (select algorithm + input marker + checkbox useBio)
   - Шаг 4: Подпись данных (textarea + кнопка «Подписать» + результат)
4. **Ключевые пары** — список ключей (select), кнопки «Обновить»/«Удалить»
5. **Био-кнопки** (правый верхний угол, `position: fixed`):
   - «Войти по биометрии» → `plugin.loginBio()`
   - «Выйти по биометрии» → `plugin.logoutBio()`
   - «Остановить проверку био» → `plugin.stopLoginBio()`
6. **Био-попап** (`#bioPopup`) — полноэкранный попап «Коснитесь биометрического датчика»

### Финальная структура файлов

```
rutoken-bio-demo/
├── index.html      # HTML: шапка, hero, 4 шага, ключи, био-кнопки, био-попап
├── style.css        # CSS: светлый дизайн rutoken.ru, карточки, попап
├── script.js         # JS: IIFE-модуль, loadPlugin, login, createKeyPair, signData, loginBio
├── AGENTS.md         # Подробная документация для агентов-преемников
└── README.md         # Краткое описание
```

## 🔧 Архитектура решения

### HTML (`index.html`)

Страница разделена на секции (grid-layout):

| Секция | Назначение |
|--------|-----------|
| **Шапка** | Логотип Рутокен + статус загрузки плагина |
| **Hero** | Заголовок, подзаголовок, кнопки |
| **4 шага** | Карточки с шагами: выбор устройства → вход по PIN → создание ключа → подпись |
| **Ключевые пары** | Список ключей, обновление, удаление |
| **Био-кнопки** | 3 кнопки в правом верхнем углу |
| **Био-попап** | Полноэкранный попап для биометрии |

### CSS (`style.css`)

- CSS Custom Properties (`:root`) для цветовой схемы Рутокен
- Grid layout для steps-grid
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
git clone https://github.com/code-agent-43824/rutoken-bio-demo.git
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
- Попап «Коснитесь биометрического датчика» — полноэкранный, полупрозрачный фон

## 🔄 Журнал изменений

| Коммит | Описание |
|--------|----------|
| `cac5897` | Создан лендинг с hero-секцией и описанием возможностей |
| `319cbfc` | Добавлена интеграция с Рутокен плагином: вход по PIN, создание ключей, подпись, биометрия |
| `b671bfd` | Подробный AGENTS.md для преемников + обновлённый README.md |
| `c8a9d2f` | Светлый дизайн в стиле rutoken.ru: шапка, hero, 4 шага customer journey, био-попап |
| `bef7c03` | Fix: add console section to HTML, bind btnClearConsole |

## 🔗 Ссылки

- **Репозиторий:** https://github.com/code-agent-43824/rutoken-bio-demo
- **GitHub Pages:** https://code-agent-43824.github.io/rutoken-bio-demo/
- **Референс:** https://aktivco.github.io/rutoken-plugin-demo/
- **Документация плагина:** https://plugin.api.rutoken.ru/

---

© 2025 Рутокен Био — Демонстрационная страница

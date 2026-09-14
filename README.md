# Рутокен Био — Демонстрация

Веб-страница для демонстрации работы биометрического USB-токена **Рутокен Био**.

Стиль: светлый дизайн в стиле [rutoken.ru](https://rutoken.ru).
Цвета: красный `#d23`, бирюзовый `#117788`, белый фон.

## 📚 Документы

| Файл | О чём |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Правила для кодинг-агентов — копия свода `code-agent-43824/coding-rules` |
| [`CLAUDE.md`](CLAUDE.md) | Импорт правил, команды и карта кода |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Продукт, требования владельца, стадии |
| [`docs/PLAN.md`](docs/PLAN.md) | Что делается в текущей стадии |
| [`docs/STATUS.md`](docs/STATUS.md) | **Что работает сейчас и что не проверено** |
| [`docs/WORKLOG.md`](docs/WORKLOG.md) | Что делали — по кускам работы |
| [`docs/JOURNAL.md`](docs/JOURNAL.md) | Что узнали о плагине и биометрии |

Агенту: начинайте с `AGENTS.md`, затем `docs/STATUS.md` и `docs/PLAN.md`.

## 🎯 Сценарии на странице

- 🔐 **Вход по PIN** — `plugin.login(deviceId, pin)`
- 🗝️ **Создание ключа** — `plugin.generateKeyPair(deviceId, undefined, marker, options)` с опцией `linkToBiometrics`
- 🗝️ **Список ключей** — `plugin.enumerateKeys(deviceId, '')` + `plugin.getKeyLabel()`
- ✍️ **Подпись данных на ключе** — `plugin.rawSign(deviceId, keyId, data, {computeHash: true})`
- 🔬 **Биометрия** — `plugin.loginBio()`, `plugin.logoutBio()`, `plugin.stopLoginBio()`
- 🧭 **Пять шагов** — устройство → PIN → создание → выбор ключа → подпись
- 🧾 **Подробный журнал** — трассировка вызовов API с копированием, без PIN и подписываемых данных

Насколько это проверено — в [`docs/STATUS.md`](docs/STATUS.md).

## 📁 Структура

```
rutoken-bio-demo/
├── index.html    # шапка, hero, 5 шагов, журнал, био-кнопки и попап
├── style.css     # светлый дизайн rutoken.ru, карточки, попап
├── script.js     # IIFE-модуль: loadPlugin, login, createKeyPair, signData, loginBio
├── test.js       # проверки на подменённом плагине
└── docs/         # проектные документы
```

## 🚀 Запуск

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## ✅ Проверка

```bash
node test.js
```

## 🌐 GitHub Pages

Страница публикуется из корня ветки `main`: **https://code-agent-43824.github.io/rutoken-bio-demo/**

## 📝 Технические детали

- **Без сборки** — чистые HTML/CSS/JS и официальный загрузчик `rutoken-plugin.js` с демо-портала Рутокен
- **Светлая тема** — цветовая схема на CSS Custom Properties
- **Адаптивность** — grid-layout с медиа-запросами
- **IIFE-модуль** — весь JS обёрнут в IIFE для изоляции scope

Как всё устроено внутри и какие инварианты нельзя нарушать — в [`CLAUDE.md`](CLAUDE.md).

## 🔌 Требования к окружению

- Браузер с установленным плагином Рутокен (Chrome, Firefox, Edge)
- Подключённый токен Рутокен Био
- Плагину может потребоваться HTTPS

## 🔗 Ссылки

- **Репозиторий:** https://github.com/code-agent-43824/rutoken-bio-demo
- **Референс:** https://aktivco.github.io/rutoken-plugin-demo/
- **Документация плагина:** https://plugin.api.rutoken.ru/

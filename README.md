# Рутокен Био — Демонстрация

> ⚠️ **Внимание следующему агенту:** перед началом работы прочтите `AGENTS.md` — там подробно описано что и почему сделано. Это обязательное чтение.

## 📋 Описание

Веб-страница для демонстрации работы биометрического USB-токена **Рутокен Био**.

Стиль: светлый дизайн в стиле [rutoken.ru](https://rutoken.ru).
Цвета: красный `#d23`, бирюзовый `#117788`, белый фон.

## 🎯 Возможности

- 🔐 **Вход по PIN** — `plugin.login(deviceId, pin)`
- 🗝️ **Создание ключа** — `plugin.generateKeyPair(deviceId, undefined, marker, options)` с опцией `linkToBiometrics`
- 🗝️ **Список ключей** — `plugin.enumerateKeys(deviceId, '')` + `plugin.getKeyLabel()`
- ✍️ **Подпись данных на ключе** — `plugin.rawSign(deviceId, keyId, data, {computeHash: true})`
- 🔬 **Биометрия** — `plugin.loginBio()`, `plugin.logoutBio()`, `plugin.stopLoginBio()`
- 🧭 **Пять шагов** — устройство → PIN → создание → выбор ключа → подпись
- 🧾 **Подробный журнал** — трассировка вызовов API с копированием, без PIN и подписываемых данных

## 📁 Структура

```
rutoken-bio-demo/
├── index.html      # HTML: шапка, hero, 5 шагов, журнал, био-кнопки и попап
├── style.css        # CSS: светлый дизайн rutoken.ru, карточки, попап
├── script.js         # JS: IIFE-модуль, loadPlugin, login, createKeyPair, signData, loginBio
├── AGENTS.md         # Подробная документация для агентов-преемников
└── README.md         # Этот файл
```

## 🚀 Запуск

```bash
cd rutoken-bio-demo
python3 -m http.server 8000
# → http://localhost:8000
```

## ✅ Проверка

```bash
node test.js
```

## 🌐 GitHub Pages

Страница доступна по адресу: **https://code-agent-43824.github.io/rutoken-bio-demo/**

## 📝 Технические детали

- **Без сборки** — чистые HTML/CSS/JS и официальный загрузчик `rutoken-plugin.js` с демо-портала Рутокен
- **Светлая тема** — цветовая схема на CSS Custom Properties
- **Адаптивность** — grid-layout с медиа-запросами
- **IIFE-модуль** — весь JS обёрнут в IIFE для изоляции scope
- **Читаемые метки** — после генерации ключа его метка задаётся через `setKeyLabel()`
- **Защита от гонок** — только последнее обновление устройств/ключей меняет интерфейс
- **Проверка биометрии** — перед био-генерацией проверяются поддержка и доступные попытки; если плагин возвращает неопределённые счётчики, готовность подтверждается отпечатком
- **Явное обновление ключей** — список читается только по кнопке «Обновить» после PIN-входа
- **Защищённые операции** — установка метки и удаление био-ключа выполняются после `loginBio(..., {objectId: keyId})`

## 🔗 Ссылки

- **Репозиторий:** https://github.com/code-agent-43824/rutoken-bio-demo
- **Референс:** https://aktivco.github.io/rutoken-plugin-demo/
- **Документация плагина:** https://plugin.api.rutoken.ru/

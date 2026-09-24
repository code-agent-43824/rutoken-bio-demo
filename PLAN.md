# PLAN.md — План работ rutoken-bio-demo

## Статус

Проект перенесён с GitHub (code-agent-43824/rutoken-bio-demo) в группу
`prototypes` внутреннего GitLab и приведён к стандартам coding-rules.

## Этапы

### Этап 1 — Прототип на GitHub (выполнено ранее, 2026-09-10)

- Демо-страница биометрического USB-токена «Рутокен Био».
- Интеграция с Рутокен Plugin (`window.rutoken.loadPlugin()`): вход по PIN,
  создание ключевой пары (с `linkToBiometrics` и без), подпись данных,
  биометрический вход/выход (`loginBio`/`logoutBio`/`stopLoginBio`).
- Светлый дизайн в стиле rutoken.ru (красный #d23, бирюзовый #117788).
- Customer journey: hero → 4 шага → ключи → консоль → био-попап.

### Этап 2 — Перенос в GitLab prototypes (2026-09-24)

- [x] Создан публичный проект `prototypes/rutoken-bio-demo` (ID 1977).
- [x] AGENTS.md — правила кодинга (общие + веб) из coding-rules.
- [x] .gitlab-ci.yml — пайплайн `pages` (копия фронтенда на GitLab Pages)
      + `release` (тар-архив → Package Registry → GitLab Release).
- [x] .gitignore, LICENSE (BSD 3-Clause), CHANGELOG.md, CONTRIBUTING.md, PLAN.md.
- [ ] Пайплайн на main (pages) — success.
- [ ] Релиз v1.0.0 (пуш тега) — Package Registry + GitLab Release.

## Известные ограничения

- Плагин Рутокен работает только в браузере с расширением
  «Адаптер Рутокен Plugin» и физически подключённым токеном; на GitLab Pages
  (https) плагин по file://-адаптеру может быть недоступен — основная
  публикация планируется на головном сервере (промежуточный вариант,
  см. coding-rules «Публикация веб-приложений»).
- Автотестов нет: статическая страница без сборки; проверка — smoke
  (сервер отдаёт index.html, JS синтаксически валиден).

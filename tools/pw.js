/* Playwright берётся из проекта, если установлен, иначе из глобальной
   установки контейнера. Один модуль — одна точка правки пути. */
var pw;
try { pw = require('playwright'); }
catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
module.exports = pw;

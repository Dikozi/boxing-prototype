#!/bin/sh
# Все пробники по порядку. Любой «✖» или падение скрипта — код выхода 1.
# Быстрые и решающие идут первыми: синтаксис, эталон боя, движения, живой бой.
cd "$(dirname "$0")" || exit 1
fail=0
python3 chk.py || fail=1
for s in reg moves ext live strike step react trans rag kofall clinch stance lay soak filmperf load; do
  [ -f "$s.js" ] || continue
  echo "### $s"
  out=$(node "$s.js" 2>&1) || fail=1
  echo "$out"
  echo "$out" | grep -q "✖" && fail=1
done
[ "$fail" = 0 ] && echo "=== ВСЕ ПРОБНИКИ ЗЕЛЁНЫЕ ===" || echo "=== ЕСТЬ ПРОВАЛЫ ==="
exit $fail

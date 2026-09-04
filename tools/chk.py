# Вынимает игровой скрипт из index.html (последний точный «<script>»: хвост с
# данными помечен id и не мешает) и гоняет через node --check.
import io, os, subprocess, sys, tempfile
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = io.open(os.path.join(root, 'index.html'), encoding='utf-8').read()
i = s.rindex('<script>'); j = s.index('</script>', i)
out = os.path.join(tempfile.gettempdir(), 'klinch-game.js')
io.open(out, 'w', encoding='utf-8').write(s[i + 8:j])
print('game.js:', s[i + 8:j].count('\n'), 'строк ->', out)
sys.exit(subprocess.call(['node', '--check', out]))

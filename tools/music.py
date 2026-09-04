# Сборка музыки. Из исходников music/ режет петли (по хвосту), кодирует
# 48 кбит/с моно 32 кГц (было 64 кбит/с 44.1 кГц — вдвое тяжелее без пользы
# на телефонном динамике) и с --apply подменяет данные в хвосте index.html.
# ffmpeg берётся из переменной FFMPEG или из PATH.
import base64, io, os, subprocess, sys
FF = os.environ.get('FFMPEG', 'ffmpeg')
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# длительности: fight и open — прежние петли; ko — 61.4 с, самое тихое окно
# 100 мс на отрезке 56–72 с (замер astats), трёхминутный трек целиком никто
# не дослушивает
TRACKS = [('fight', '1 бой.mp3', 129.541224), ('open', '2 опенинг.mp3', 58.331429), ('ko', '3 нокаут.mp3', 61.4)]
out = os.path.join(root, 'tools', '.out'); os.makedirs(out, exist_ok=True)
data = {}
for key, src, dur in TRACKS:
    dst = os.path.join(out, key + '.mp3')
    subprocess.check_call([FF, '-v', 'error', '-y', '-i', os.path.join(root, 'music', src), '-t', str(dur),
                           '-ar', '32000', '-ac', '1', '-b:a', '48k', '-compression_level', '0', dst])
    data[key] = open(dst, 'rb').read()
    print('%-6s %7d байт  %.1f с' % (key, len(data[key]), dur))
print('итого %d байт, в base64 %d' % (sum(map(len, data.values())), sum(len(base64.b64encode(v)) for v in data.values())))
if '--apply' in sys.argv:
    p = os.path.join(root, 'index.html'); s = io.open(p, encoding='utf-8').read()
    i = s.index('tailMusic({'); j = s.index('});', i) + 3
    block = 'tailMusic({\n' + ',\n'.join("  %s: 'data:audio/mpeg;base64,%s'" % (k, base64.b64encode(data[k]).decode())
                                          for k in ('fight', 'open', 'ko')) + '\n});'
    io.open(p, 'w', encoding='utf-8').write(s[:i] + block + s[j:])
    print('index.html обновлён:', os.path.getsize(p), 'байт')

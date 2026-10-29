import pathlib
import zipfile

raiz = pathlib.Path(__file__).resolve().parent.parent
dist = raiz / 'dist'
salida = raiz / 'prototipo-itch.zip'

if not (dist / 'index.html').exists():
    raise SystemExit('No existe dist/index.html: ejecuta primero npm run build.')

with zipfile.ZipFile(salida, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(dist.rglob('*')):
        if f.is_file():
            z.write(f, f.relative_to(dist).as_posix())

with zipfile.ZipFile(salida) as z:
    assert z.testzip() is None and 'index.html' in z.namelist()
    assert all('\\' not in n for n in z.namelist())
    print(salida.name, z.namelist())

# Receptor en Google Sheets (HU-04)

## Despliegue (una sola vez, con tu cuenta de Google)

1. Crea una hoja de cálculo nueva en Google Drive, por ejemplo «Registros prototipo».
2. Abre **Extensiones > Apps Script**, borra el contenido de `Código.gs` y pega el contenido de `Code.gs`. Guarda.
3. Pulsa **Implementar > Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario** (necesario para que el juego envíe datos sin iniciar sesión).
4. Autoriza los permisos que pide Google y copia la **URL de la aplicación web** (termina en `/exec`).
5. En la carpeta del proyecto, copia `.env.example` como `.env.local` y pega la URL en `VITE_URL_REGISTRO`.

La pestaña `registros` y sus columnas (`ts, codigo, evento, version, navegador, so, datos`) se crean solas con el primer envío.

## Prueba desde la terminal

```bash
curl -L -H "Content-Type: text/plain" -d '{"codigo":"TEST23","evento":"prueba","version":"0.1.0","navegador":"curl","so":"terminal","datos":{}}' "PEGA_AQUI_LA_URL"
```

Respuesta esperada: `{"ok":true}` y una fila nueva en la hoja.

Sin `codigo` o sin `evento`, la respuesta es `{"ok":false,...}` y no se guarda nada.

## Si cambias Code.gs

Usa **Implementar > Gestionar implementaciones > Editar > Nueva versión**. Así la URL no cambia.

## Separar y limpiar los datos (Separar.gs)

1. En **Extensiones > Apps Script**, pulsa **+ > Secuencia de comandos**, llámalo `Separar` y pega el contenido de `Separar.gs`. Guarda.
2. Recarga la hoja de cálculo. Aparece el menú **Datos > Separar y limpiar datos** (la primera vez pide autorizar).
3. El script crea o rehace dos pestañas y no toca `registros`:
   - `resultados`: una fila por participante, con el tamizaje, el desempeño y la encuesta de cada nivel (`n1_` a `n5_`), el PXI, el SUS y la pregunta abierta.
   - `tecnico`: una fila por participante y nivel, con navegador, sistema operativo, pantalla, tiempo de carga, oleada, formación, semilla, generación y FPS. Los excluidos aparecen aquí solo con su motivo.
4. Descarta las filas `-dev`, las de prueba y las duplicadas por reenvío. Sí/no se escribe como 1/0. `valido = 1` marca a quien completó todo y acertó la pregunta de control.

No requiere una nueva implementación: el menú corre dentro de la hoja.

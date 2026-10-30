# Receptor en Google Sheets

`Code.gs` recibe los eventos del juego y los escribe al instante en dos hojas. No hay que ejecutar nada después.

| Hoja | Una fila por | Contenido |
|---|---|---|
| `jugador` | participante | grupo, tamizaje, desempeño y encuesta de cada nivel (`n1_` a `n5_`), PXI, SUS, pregunta abierta y las columnas `completo`, `control_ok` y `valido` |
| `sistema` | participante y nivel | equipo (navegador, sistema operativo, pantalla, tiempo de carga), oleada, formación, dificultad, densidad, semilla, generación del UMDA, FPS y tiempo de respuesta de la encuesta. La fila con `evento = sesion` guarda los datos del equipo |
| `respaldo` (oculta) | evento | copia de cada evento tal como llegó, por si hace falta revisar algo |

- `valido = 1` marca a quien completó el tamizaje, los cinco niveles con su encuesta y el cuestionario final, y acertó la pregunta de control.
- A quien no cumple el tamizaje solo se le registra el motivo en la columna `excluido`.
- Un reenvío del mismo evento actualiza la misma fila, así que no hay duplicados.
- Las filas de `npm run dev` (versión `-dev`) se ignoran. Para guardarlas al probar, cambia `GUARDAR_PRUEBAS` a `true`.
- Sí/no se escribe como 1/0.

## Despliegue

1. Crea una hoja de cálculo nueva en Google Drive.
2. Abre **Extensiones > Apps Script**, borra el contenido de `Código.gs` y pega el contenido de `Code.gs`. Si el proyecto tiene otros archivos de una versión anterior (por ejemplo `Separar`), elimínalos. Guarda.
3. Pulsa **Implementar > Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario** (necesario para que el juego envíe datos sin iniciar sesión).
4. Autoriza los permisos que pide Google y copia la **URL de la aplicación web** (termina en `/exec`).
5. En la carpeta del proyecto, copia `.env.example` como `.env.local` y pega la URL en `VITE_URL_REGISTRO`.

Las tres hojas se crean solas con el primer envío.

## Si cambias Code.gs

Usa **Implementar > Gestionar implementaciones > Editar > Nueva versión**. Así la URL no cambia.

## Prueba desde la terminal

```bash
curl -L -H "Content-Type: text/plain" -d '{"codigo":"TEST23","evento":"sesion","version":"0.4.5","navegador":"curl","so":"terminal","datos":{"grupo":"control"}}' "PEGA_AQUI_LA_URL"
```

Respuesta esperada: `{"ok":true}`, una fila en `jugador` y otra en `sistema`. Un código o evento inválido responde `{"ok":false,...}` y no guarda nada.

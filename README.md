# Prototipo Space Invaders con generación procedural de oleadas (EDA)

Prototipo del artículo «Generación procedural de oleadas con EDA: experiencia y usabilidad en jugadores universitarios» (Seminario de Investigación I, CIS 2026, Universidad de Lima).

Hecho con Phaser 4, TypeScript y Vite. Se publica en itch.io como juego HTML5.

## Descripción

Videojuego web tipo Space Invaders creado para un cuasiexperimento con jugadores universitarios. Tiene dos versiones que comparten las mecánicas, la interfaz y los cinco niveles. La experimental genera cada oleada de enemigos y objetos con el algoritmo UMDA, un algoritmo de estimación de distribuciones, y ajusta la dificultad entre niveles según el desempeño del jugador. La de control usa oleadas predefinidas que siguen una curva de dificultad fija.

El juego asigna la versión al azar después del consentimiento informado. Aplica un formulario de tamizaje, una encuesta breve al final de cada nivel y, al terminar los cinco niveles, un cuestionario final con el PXI y el SUS. Los datos se registran de forma anónima en Google Sheets.

Versión actual: 0.4.5.

## Requisitos

- Node.js 20 o superior y npm.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias (una vez) |
| `npm run dev` | Abre el juego en modo desarrollo, con contador de FPS. `?grupo=experimental` o `?grupo=control` fuerza el grupo |
| `npm test` | Ejecuta las pruebas |
| `npm run build` | Revisa los tipos y genera `dist/` para itch.io |
| `npm run preview` | Sirve `dist/` para probar el build |

## Estructura

```
src/
├── main.ts        flujo del estudio (sección 4.4 del artículo)
├── juego/         escenas de Phaser
├── generador/     ecuación 1, densidad, UMDA con ecuación 2 (Tabla 4.1), formaciones y oleadas de control
├── jugador/       ecuaciones 3 y 4, estadísticas de FPS
├── registro/      código anónimo y envío a Google Sheets
└── encuestas/     consentimiento, tamizaje, encuesta por nivel y cuestionario final (sprint 3)
apps_script/       receptor en Google Sheets
tests/             pruebas
```

## Datos

No se registra ningún dato personal. Cada sesión genera un código anónimo de 6 caracteres, que el participante ve al final. Si no acepta el consentimiento, no se envía nada.

Cada fila de la hoja `registros` tiene `ts, codigo, evento, version, navegador, so, datos`. La columna `datos` es un JSON que depende del evento:

| evento | Cuándo | datos |
|---|---|---|
| `sesion` | Tras el tamizaje, solo si cumple los criterios | `grupo`, `carga_ms`, `pantalla` |
| `pretest` | Tras el tamizaje, solo si cumple los criterios | `edad`, `universitario`, `frecuencia`, `generos`, `familiaridad` |
| `excluido` | Menor de 18 o no universitario (no se guardan sus respuestas) | `motivo` |
| `nivel` | Al terminar cada nivel | `nivel`, `aciertos`, `disparos`, `vidasInicio`, `vidasFin`, `tiempoMs`, `superado`, `fpsMedio`, `fpsP5`, `grupo`, `oleada`, `formacion` (plantilla de la figura), `d_objetivo` (D*), `d_oleada` (ecuación 1), `densidad`, `A`, `V`, `T`, `R` (ecuación 3), `d_siguiente` (ecuación 4); solo en el grupo experimental: `ms_generacion`, `semilla`, `generaciones`, `aptitud` (ecuación 2), `den_objetivo` (Den* sorteada) |
| `encuesta_nivel` | Tras las 5 preguntas del nivel | `nivel`, `desafio`, `maestria`, `inmersion`, `disfrute` (−3 a +3), `dificultad` (1 a 7), `ms_respuesta` |
| `postest` | Al final | ítems `pxi_*` (−3 a +3), `control`, `sus_1` a `sus_10` (1 a 5), `abierta`, `control_ok`, `sus_puntaje`, `pxi_promedios` |

Las filas generadas con `npm run dev` llevan la versión con el sufijo `-dev` y no son datos del cuasiexperimento.

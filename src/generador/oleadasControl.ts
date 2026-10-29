import { formar, type NombrePlantilla } from './formacion';
import { BASICO, DOBLE, ESCUDO, LENTA, MEDIA, NINGUNO, RAPIDA, RAPIDO, RESISTENTE, VIDA, type Oleada } from './oleada';

export const CURVA_BASE = [0.3, 0.4, 0.5, 0.6, 0.7];

interface Composicion { basicos: number; rapidos: number; resistentes: number; velocidad: number; objeto: number; plantilla: NombrePlantilla }

const COMPOSICIONES: Composicion[] = [
  // d = (1 · (6 + 2·4 + 2·3) − 2) / 60 = 0.30 · 13 enemigos
  { basicos: 6, rapidos: 4, resistentes: 3, velocidad: LENTA, objeto: ESCUDO, plantilla: 'bloque' },
  // d = (1 · (6 + 2·5 + 2·5) − 2) / 60 = 0.40 · 16 enemigos
  { basicos: 6, rapidos: 5, resistentes: 5, velocidad: LENTA, objeto: VIDA, plantilla: 'flecha' },
  // d = (1.25 · (5 + 2·5 + 2·5) − 1) / 60 = 0.504 · 15 enemigos
  { basicos: 5, rapidos: 5, resistentes: 5, velocidad: MEDIA, objeto: DOBLE, plantilla: 'rombo' },
  // d = (1.5 · (5 + 2·5 + 2·5) − 2) / 60 = 0.592 · 15 enemigos
  { basicos: 5, rapidos: 5, resistentes: 5, velocidad: RAPIDA, objeto: ESCUDO, plantilla: 'pinzas' },
  // d = (1.5 · (3 + 2·6 + 2·7) − 2) / 60 = 0.692 · 16 enemigos
  { basicos: 3, rapidos: 6, resistentes: 7, velocidad: RAPIDA, objeto: VIDA, plantilla: 'tablero' },
];

export const PLANTILLAS_CONTROL: NombrePlantilla[] = COMPOSICIONES.map((c) => c.plantilla);

export const OLEADAS_CONTROL: Oleada[] = COMPOSICIONES.map((c) => {
  const celdas = [
    ...Array<number>(c.basicos).fill(BASICO), ...Array<number>(c.rapidos).fill(RAPIDO), ...Array<number>(c.resistentes).fill(RESISTENTE),
  ];
  const base = [...celdas, ...Array<number>(20 - celdas.length).fill(0), c.velocidad, c.objeto, NINGUNO, NINGUNO];
  return formar(base, c.plantilla);
});

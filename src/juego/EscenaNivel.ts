import Phaser from 'phaser';
import * as C from '../config';
import {
  COLUMNAS, DOBLE, ESCUDO, FACTOR_VELOCIDAD, NINGUNO, RAPIDO, RESISTENTE, VACIO, VIDA, type Oleada,
} from '../generador/oleada';
import { estadisticasFps } from '../jugador/fps';
import { estaSilenciado, sonido } from './sonido';

export interface Desempeno {
  nivel: number;
  aciertos: number;
  disparos: number;
  vidasInicio: number;
  vidasFin: number;
  tiempoMs: number;
  superado: boolean;
  fpsMedio: number;
  fpsP5: number;
}

export interface DatosNivel {
  oleada: Oleada;
  nivel: number;
  vidas: number;
  alTerminar: (d: Desempeno) => void;
}

interface Enemigo { img: Phaser.GameObjects.Image; tipo: number; golpes: number; col: number }
interface Bala { img: Phaser.GameObjects.Image; vy: number }
interface Objeto { txt: Phaser.GameObjects.Text; tipo: number }

const ETIQUETA_OBJETO: Record<number, [string, string, string]> = {
  [VIDA]: ['+VIDA', '#e63946', '#ffffff'],
  [ESCUDO]: ['ESCUDO', '#4361ee', '#ffffff'],
  [DOBLE]: ['x2', '#ffb703', '#000000'],
};

const choca = (a: Phaser.GameObjects.Components.GetBounds, b: Phaser.GameObjects.Components.GetBounds) =>
  Phaser.Geom.Intersects.RectangleToRectangle(a.getBounds(), b.getBounds());

export class EscenaNivel extends Phaser.Scene {
  private d!: DatosNivel;
  private nave!: Phaser.GameObjects.Image;
  private aura!: Phaser.GameObjects.Arc;
  private hud!: Phaser.GameObjects.Text;
  private fps?: Phaser.GameObjects.Text;
  private avisoPausa!: Phaser.GameObjects.Text;
  private teclas!: Record<'izq' | 'der' | 'a' | 'd' | 'disparo', Phaser.Input.Keyboard.Key>;

  private enemigos: Enemigo[] = [];
  private balas: Bala[] = [];
  private balasEnemigas: Bala[] = [];
  private objetos: Objeto[] = [];
  private porSoltar: number[] = [];
  private umbrales: number[] = [];

  private factor = 1;
  private dir = 1;
  private vidas = 0;
  private escudo = false;
  private dobleHasta = 0;
  private invulnerableHasta = 0;
  private tiempo = 0;
  private ultimoDisparo = 0;
  private proxDisparoEnemigo = 0;
  private aciertos = 0;
  private disparos = 0;
  private destruidos = 0;
  private terminado = false;
  private disparoPendiente = false;
  private deltas: number[] = [];

  constructor() {
    super('nivel');
  }

  init(d: DatosNivel) {
    this.d = d;
    this.enemigos = [];
    this.balas = [];
    this.balasEnemigas = [];
    this.objetos = [];
    this.factor = FACTOR_VELOCIDAD[d.oleada[20]];
    this.dir = 1;
    this.vidas = d.vidas;
    this.escudo = false;
    this.dobleHasta = 0;
    this.invulnerableHasta = 0;
    this.tiempo = 0;
    this.ultimoDisparo = 0;
    this.proxDisparoEnemigo = C.DISPARO_ENEMIGO_MS / this.factor;
    this.aciertos = 0;
    this.disparos = 0;
    this.destruidos = 0;
    this.terminado = false;
    this.disparoPendiente = false;
    this.deltas = [];
  }

  create() {
    crearTexturas(this);
    const o = this.d.oleada;

    const x0 = (C.ANCHO - (COLUMNAS - 1) * C.CELDA_X) / 2;
    o.slice(0, 20).forEach((tipo, i) => {
      if (tipo === VACIO) return;
      const x = x0 + (i % COLUMNAS) * C.CELDA_X;
      const y = C.FORMACION_Y0 + Math.floor(i / COLUMNAS) * C.CELDA_Y;
      this.enemigos.push({
        img: this.add.image(x, y, `enemigo${tipo}`), tipo, golpes: tipo === RESISTENTE ? C.GOLPES_RESISTENTE : 1,
        col: i % COLUMNAS,
      });
    });

    this.porSoltar = o.slice(21, 24).filter((t) => t !== NINGUNO);
    this.umbrales = this.porSoltar.map((_, i) => Math.ceil((this.enemigos.length * (i + 1)) / (this.porSoltar.length + 1)));

    this.nave = this.add.image(C.ANCHO / 2, C.NAVE_Y, 'nave');
    this.aura = this.add.circle(this.nave.x, this.nave.y, 30).setStrokeStyle(2, 0x4361ee).setVisible(false);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.teclas = {
      izq: kb.addKey(K.LEFT), der: kb.addKey(K.RIGHT), a: kb.addKey(K.A), d: kb.addKey(K.D), disparo: kb.addKey(K.SPACE),
    };
    kb.on('keydown-SPACE', () => (this.disparoPendiente = true));

    this.hud = this.add.text(12, 12, '', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' });
    if (import.meta.env.DEV) {
      this.fps = this.add.text(C.ANCHO - 12, 12, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffff00' }).setOrigin(1, 0);
    }

    this.avisoPausa = this.add.text(C.ANCHO / 2, C.ALTO / 2, 'PAUSA\n\nHaz clic en el juego para continuar', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', backgroundColor: '#000000', align: 'center', padding: { x: 20, y: 14 },
    }).setOrigin(0.5).setDepth(10).setVisible(false);
    const reanudar = () => {
      if (!this.scene.isPaused()) return;
      this.disparoPendiente = false;
      this.avisoPausa.setVisible(false);
      this.scene.resume();
    };
    this.game.events.on(Phaser.Core.Events.FOCUS, reanudar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.FOCUS, reanudar));
  }

  update(_t: number, delta: number) {
    if (this.terminado) return;
    if (!document.hasFocus()) {
      this.avisoPausa.setVisible(true);
      this.scene.pause();
      return;
    }
    this.tiempo += delta;
    this.deltas.push(delta);
    const dt = delta / 1000;

    this.moverNave(dt);
    this.moverFormacion(dt);
    if (this.terminado) return;
    this.disparoEnemigo();
    this.moverBalas(dt);
    this.moverObjetos(dt);
    this.actualizarHud();

    if (this.enemigos.length === 0) this.terminar(true);
  }

  private moverNave(dt: number) {
    const t = this.teclas;
    const eje = Number(t.der.isDown || t.d.isDown) - Number(t.izq.isDown || t.a.isDown);
    this.nave.x = Phaser.Math.Clamp(this.nave.x + eje * C.NAVE_VEL * dt, 24, C.ANCHO - 24);
    this.aura.setPosition(this.nave.x, this.nave.y);

    if (this.tiempo < C.CADENCIA_MS) this.disparoPendiente = false;
    if ((this.disparoPendiente || t.disparo.isDown) && this.tiempo - this.ultimoDisparo >= C.CADENCIA_MS) {
      this.disparoPendiente = false;
      this.ultimoDisparo = this.tiempo;
      const offsets = this.tiempo < this.dobleHasta ? [-10, 10] : [0];
      for (const dx of offsets) {
        this.balas.push({ img: this.add.image(this.nave.x + dx, this.nave.y - 18, 'bala'), vy: -C.BALA_VEL });
      }
      this.disparos += offsets.length;
      sonido.disparo();
    }
  }

  private moverFormacion(dt: number) {
    let dx = this.dir * C.FORMACION_VEL * this.factor * dt;
    const xs = this.enemigos.map((e) => e.img.x);
    if (Math.max(...xs) + dx > C.ANCHO - 30 || Math.min(...xs) + dx < 30) {
      this.dir *= -1;
      dx = 0;
      for (const e of this.enemigos) e.img.y += C.DESCENSO;
    }
    for (const e of this.enemigos) e.img.x += dx;

    if (this.enemigos.some((e) => e.img.y + 12 >= C.NAVE_Y - 12)) {
      this.vidas = 0;
      this.terminar(false);
    }
  }

  private disparoEnemigo() {
    if (this.tiempo < this.proxDisparoEnemigo) return;
    this.proxDisparoEnemigo = this.tiempo + C.DISPARO_ENEMIGO_MS / this.factor;

    const frente = new Map<number, Enemigo>();
    for (const e of this.enemigos) {
      const f = frente.get(e.col);
      if (!f || e.img.y > f.img.y) frente.set(e.col, e);
    }
    const candidatos = [...frente.values()].flatMap((e) => (e.tipo === RAPIDO ? [e, e] : [e]));
    if (candidatos.length === 0) return;
    const e = Phaser.Utils.Array.GetRandom(candidatos);
    const vel = C.BALA_ENEMIGA_VEL * (e.tipo === RAPIDO ? 1.5 : 1);
    this.balasEnemigas.push({ img: this.add.image(e.img.x, e.img.y + 14, 'balaEnemiga'), vy: vel });
    sonido.disparoEnemigo();
  }

  private moverBalas(dt: number) {
    for (const b of [...this.balas, ...this.balasEnemigas]) b.img.y += b.vy * dt;

    this.balas = this.balas.filter((b) => {
      const e = this.enemigos.find((en) => choca(b.img, en.img));
      if (!e && b.img.y > -20) return true;
      b.img.destroy();
      if (e) this.impactarEnemigo(e);
      return false;
    });

    this.balasEnemigas = this.balasEnemigas.filter((b) => {
      const golpea = choca(b.img, this.nave);
      if (!golpea && b.img.y < C.ALTO + 20) return true;
      b.img.destroy();
      if (golpea) this.impactarNave();
      return false;
    });
  }

  private impactarEnemigo(e: Enemigo) {
    this.aciertos++;
    e.golpes--;
    if (e.golpes > 0) {
      e.img.setTexture('enemigo3dañado');
      sonido.golpeResistente();
      return;
    }
    e.img.destroy();
    sonido.explosionEnemigo();
    this.enemigos = this.enemigos.filter((x) => x !== e);
    this.destruidos++;
    while (this.porSoltar.length && this.destruidos >= this.umbrales[0]) {
      const tipo = this.porSoltar.shift()!;
      this.umbrales.shift();
      const [texto, fondo, color] = ETIQUETA_OBJETO[tipo];
      const txt = this.add.text(e.img.x, e.img.y, texto, {
        fontFamily: 'monospace', fontSize: '14px', color, backgroundColor: fondo, padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      this.objetos.push({ txt, tipo });
    }
  }

  private impactarNave() {
    if (this.tiempo < this.invulnerableHasta) return;
    this.invulnerableHasta = this.tiempo + C.INVULNERABLE_MS;
    if (this.escudo) {
      this.escudo = false;
      this.aura.setVisible(false);
      sonido.escudoAbsorbe();
      return;
    }
    this.vidas--;
    sonido.naveDanada();
    this.tweens.add({ targets: this.nave, alpha: 0.2, duration: 100, yoyo: true, repeat: 4 });
    if (this.vidas <= 0) this.terminar(false);
  }

  private moverObjetos(dt: number) {
    this.objetos = this.objetos.filter((ob) => {
      ob.txt.y += C.OBJETO_VEL * dt;
      const atrapado = choca(ob.txt, this.nave);
      if (!atrapado && ob.txt.y < C.ALTO + 20) return true;
      ob.txt.destroy();
      if (!atrapado) return false;
      sonido.objeto();
      if (ob.tipo === VIDA) this.vidas = Math.min(C.VIDAS_MAX, this.vidas + 1);
      if (ob.tipo === ESCUDO) {
        this.escudo = true;
        this.aura.setVisible(true);
      }
      if (ob.tipo === DOBLE) this.dobleHasta = this.tiempo + C.DOBLE_MS;
      return false;
    });
  }

  private actualizarHud() {
    const doble = this.tiempo < this.dobleHasta ? `   x2 ${Math.ceil((this.dobleHasta - this.tiempo) / 1000)}s` : '';
    const escudo = this.escudo ? '   ESCUDO' : '';
    const mudo = estaSilenciado() ? '   [M] sin sonido' : '';
    this.hud.setText(`Nivel ${this.d.nivel}/${C.NIVELES}   Vidas ${this.vidas}${escudo}${doble}${mudo}`);
    this.fps?.setText(`FPS ${this.game.loop.actualFps.toFixed(0)}`);
  }

  private terminar(superado: boolean) {
    if (this.terminado) return;
    this.terminado = true;
    if (superado) sonido.nivelSuperado();
    else sonido.nivelPerdido();
    const desempeno: Desempeno = {
      nivel: this.d.nivel,
      aciertos: this.aciertos,
      disparos: this.disparos,
      vidasInicio: this.d.vidas,
      vidasFin: Math.max(0, this.vidas),
      tiempoMs: Math.round(this.tiempo),
      superado,
      ...estadisticasFps(this.deltas),
    };
    this.time.delayedCall(800, () => {
      this.scene.stop();
      this.d.alTerminar(desempeno);
    });
  }
}

/** Dibuja las figuras una sola vez. Cada tipo de enemigo tiene forma y color propios. */
function crearTexturas(s: Phaser.Scene) {
  if (s.textures.exists('nave')) return;
  const g = s.add.graphics();
  const textura = (clave: string, w: number, h: number, dibujar: () => void) => {
    g.clear();
    dibujar();
    g.generateTexture(clave, w, h);
  };

  textura('nave', 40, 20, () => {
    g.fillStyle(0x00e5ff).fillRect(0, 8, 40, 12).fillRect(16, 0, 8, 8);
  });
  textura('enemigo1', 32, 22, () => {
    g.fillStyle(0x7cfc00).fillRect(0, 0, 32, 22);
    g.fillStyle(0x000000).fillRect(7, 6, 5, 5).fillRect(20, 6, 5, 5);
  });
  textura('enemigo2', 32, 24, () => {
    g.fillStyle(0xffd60a).fillTriangle(0, 0, 32, 0, 16, 24);
  });
  textura('enemigo3', 36, 26, () => {
    g.fillStyle(0xff4d4d).fillRect(0, 0, 36, 26);
    g.lineStyle(3, 0xffffff).strokeRect(1.5, 1.5, 33, 23);
  });
  textura('enemigo3dañado', 36, 26, () => {
    g.lineStyle(3, 0xff4d4d).strokeRect(1.5, 1.5, 33, 23);
  });
  textura('bala', 4, 12, () => {
    g.fillStyle(0xffffff).fillRect(0, 0, 4, 12);
  });
  textura('balaEnemiga', 4, 12, () => {
    g.fillStyle(0xff9f1c).fillRect(0, 0, 4, 12);
  });
  g.destroy();
}

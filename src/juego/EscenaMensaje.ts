import Phaser from 'phaser';

export interface DatosMensaje {
  titulo: string;
  lineas: string[];
  alContinuar?: () => void;
}

export class EscenaMensaje extends Phaser.Scene {
  constructor() {
    super('mensaje');
  }

  create(d: DatosMensaje) {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 90, d.titulo, {
      fontFamily: 'monospace', fontSize: '36px', color: '#7CFC00',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 10, d.lineas.join('\n'), {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5, 0);

    const alContinuar = d.alContinuar;
    if (!alContinuar) return;
    this.time.delayedCall(700, () => {
      this.input.keyboard?.once('keydown-SPACE', () => {
        this.scene.stop();
        alContinuar();
      });
    });
  }
}

import { registry } from '../minigames/index.js';
import { background, button, label, panel, SPACES } from '../ui/theme.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }
  create() {
    this.spaceId='plaza';background(this,'plaza');
    panel(this, 44, 30, this.scale.width - 88, 102);
    label(this, 'LUMIA  ·  아르카디아의 일곱 수업', 72, 50, 34, { fontStyle: 'bold' });
    label(this, '서로 다른 공간에서 새로운 규칙이 열립니다. 마음에 드는 수업을 선택하세요.', 73, 97, 17);
    const cardW = 280, cardH = 236, gap = 18, left = 44, top = 153;
    registry.forEach((game, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = left + col * (cardW + gap), y = top + row * (cardH + gap);
      panel(this, x, y, cardW, cardH, 0.98);
      this.add.image(x+cardW/2,y+59,`space-${game.space}`).setDisplaySize(cardW-8,110);
      this.add.rectangle(x+4,y+4,cardW-8,110,SPACES[game.space].dark,0.48).setOrigin(0);
      label(this,game.title,x+16,y+29,23,{fontStyle:'bold',color:'#fff9e9'});
      label(this,SPACES[game.space].name,x+17,y+78,15,{color:'#fff0d5'});
      label(this,`${game.className} · ${game.stat}`,x+18,y+127,15,{color:'#596675'});
      label(this,game.description,x+18,y+153,16,{wordWrap:{width:cardW-36},lineSpacing:4});
      label(this,`예상 ${game.expectedDuration}`,x+18,y+205,14);
      button(this, '플레이', x + cardW - 105, y + cardH - 45, 88, 33, () => {
        this.scene.start(game.id, { difficulty: 1, seed: 'demo-seed', maxDurationMs: 180000 });
      });
    });
    label(this, '독립 실행형 데모 · 캐릭터/일정/스탯 저장 없음', 46, this.scale.height - 38, 15, { color: '#fff1d2' });
  }
}

import { background, button, label, panel, SPACES } from '../../ui/theme.js';
import { createResultGate } from './result.js';

export class BaseMinigameScene extends Phaser.Scene {
  constructor(key) { super(key); this.gameId = key; }
  init(data = {}) {
    this.startData = { difficulty: data.difficulty ?? 1, seed: data.seed ?? 'demo-seed', maxDurationMs: data.maxDurationMs ?? 180000 };
    this.startedAt = 0;
    this.score = 0;
    this.metrics = {};
    this.done = false;
    this.emitOnce = createResultGate((event, result) => this.game.events.emit(event, result));
  }
  createShell(title, objective, spaceId = 'training') {
    this.startedAt = performance.now();
    this.spaceId = spaceId;
    background(this, spaceId);
    panel(this, 25, 20, this.scale.width - 50, 95);
    label(this, title, 50, 35, 30, { fontStyle: 'bold' });
    label(this, `✦ ${SPACES[spaceId]?.name || '아르카디아'}`, 350, 44, 18, { color: '#687080' });
    this.objectiveText = label(this, objective, 51, 76, 18, { wordWrap: { width: 940 } });
    this.timerText = label(this, '', this.scale.width - 190, 40, 20, { fontStyle: 'bold' });
    button(this, '처음부터', this.scale.width - 270, this.scale.height - 65, 105, 42, () => this.restart(), 'quiet');
    button(this, '목록으로', this.scale.width - 150, this.scale.height - 65, 120, 42, () => this.finish('quit'), 'quiet');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.time.removeAllEvents();
      this.tweens.killAll();
      this.input.keyboard?.removeAllListeners();
    });
  }
  update() {
    if (this.done || !this.timerText) return;
    const left = Math.max(0, this.startData.maxDurationMs - (performance.now() - this.startedAt));
    this.timerText.setText(`남은 시간 ${Math.ceil(left / 1000)}초`);
    if (left <= 0) this.finish('timeout');
  }
  setObjective(text) { this.objectiveText?.setText(text); }
  announce(text) {
    const backdrop=this.add.rectangle(this.scale.width/2,135,620,58,0x122938,0.88).setDepth(100);
    const title=label(this,text,this.scale.width/2,135,22,{color:'#fff6dc',fontStyle:'bold'}).setOrigin(0.5).setDepth(101);
    this.tweens.add({targets:[backdrop,title],alpha:0,duration:450,delay:1450,onComplete:()=>{backdrop.destroy();title.destroy();}});
  }
  burst(x,y,color=0xffd985) {
    const circle=this.add.circle(x,y,15).setStrokeStyle(5,color,0.95).setDepth(90);
    this.tweens.add({targets:circle,scale:3,alpha:0,duration:430,ease:'Cubic.Out',onComplete:()=>circle.destroy()});
  }
  restart() {
    if (this.done) return;
    this.scene.start(this.gameId, { ...this.startData });
  }
  finish(outcome, metrics = this.metrics) {
    if (this.done) return;
    this.done = true;
    const result = {
      gameId: this.gameId, outcome, score: Math.max(0, Math.round(this.score)),
      durationMs: Math.max(0, Math.round(performance.now() - this.startedAt)),
      difficulty: this.startData.difficulty, seed: this.startData.seed,
      metrics: { ...metrics },
    };
    this.emitOnce(result);
    this.scene.start(outcome === 'quit' ? 'menu' : 'result', { result, startData: { ...this.startData } });
  }
}

import {RuneCircuitScene} from '../../minigame-demo/src/minigames/rune-circuit/RuneCircuitScene.js';
// Keep the independent demo intact; only its navigation belongs to this adapter.
export class EngineRuneCircuitScene extends RuneCircuitScene{
 createShell(...args){
  super.createShell(...args);
  for(const child of this.children.list)if(child.text==='목록으로')child.setText('마이룸으로');
 }
 finish(outcome,metrics=this.metrics){
  if(this.done)return;
  this.done=true;
  this.emitOnce({gameId:this.gameId,outcome,score:Math.max(0,Math.round(this.score)),
   durationMs:Math.max(0,Math.round(performance.now()-this.startedAt)),
   difficulty:this.startData.difficulty,seed:this.startData.seed,metrics:{...metrics}});
  this.scene.start('home');
 }
}

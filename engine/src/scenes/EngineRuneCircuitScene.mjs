import {RuneCircuitScene} from '../../minigame-demo/src/minigames/rune-circuit/RuneCircuitScene.js';
import {createMinigameResult} from '../core/minigame-contract.mjs';
// Keep the independent demo intact; only its navigation belongs to this adapter.
export class EngineRuneCircuitScene extends RuneCircuitScene{
 createShell(...args){
  super.createShell(...args);
  for(const child of this.children.list)if(child.text==='목록으로')child.setText('마이룸으로');
 }
 init(data={}){super.init(data);this.engineContext={gameId:this.gameId,locationId:data.locationId??'workshop',
  difficulty:data.difficulty??1,seed:data.seed??'demo-seed',rewardInputs:data.rewardInputs??null};}
 finish(outcome,metrics=this.metrics){
  if(this.done)return;
  this.done=true;
  this.emitOnce(createMinigameResult(this.engineContext,outcome,this.score??0,
   Math.max(0,performance.now()-(this.startedAt??performance.now())),metrics??{}));
  this.scene.start('home');
 }
}

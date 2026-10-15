import {registry} from '../../minigame-demo/src/minigames/index.js';
import {createMinigameResult} from '../core/minigame-contract.mjs';
export const previewScenes=registry.map(entry=>class extends entry.scene{
 init(data={}){super.init(data);this.engineContext=data;}
 createShell(...args){
  super.createShell(...args);
  for(const child of this.children.list){if(child.text==='목록으로')child.setText('마이룸으로');if(child.type==='Text')child.setFontFamily('Gowun Batang, serif');}
 }
 finish(outcome,metrics=this.metrics){
  if(this.done)return;
  this.done=true;
  const result=createMinigameResult(this.engineContext,outcome,this.score??0,
   Math.max(0,performance.now()-(this.startedAt??performance.now())),metrics??{});
  this.emitOnce(result);
  this.scene.start('home');
 }
});

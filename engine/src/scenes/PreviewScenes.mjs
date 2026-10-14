import {registry} from '../../minigame-demo/src/minigames/index.js';
import {EngineRuneCircuitScene} from './EngineRuneCircuitScene.mjs';
export const previewScenes=registry.map(entry=>class extends entry.scene{
 createShell(...args){
  super.createShell(...args);
  for(const child of this.children.list){if(child.text==='목록으로')child.setText('마이룸으로');if(child.type==='Text')child.setFontFamily('Gowun Batang, serif');}
 }
 finish(...args){return EngineRuneCircuitScene.prototype.finish.apply(this,args);}
});

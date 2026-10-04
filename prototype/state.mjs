import {initialPuzzle} from './puzzle.mjs';
export const scenes=['title','select','admission','plaza','greenhouse','adventure','reaction','choice','room','record','report'];
export function freshState(){return {version:1,scene:'title',node:0,knowledge:[],herbs:0,restored:false,runeObserved:false,choice:null,reflection:null,recorded:false,position:{x:180,y:920},puzzle:initialPuzzle(),hint:0};}
export function inspectPlant(s){if(!s.knowledge.includes('light-flow'))s.knowledge.push('light-flow');}
export function collectHerb(s){s.herbs=1;}
export function recoverWorld(s){s.restored=true;}
export function makeReport(s){return {episode:'빛을 잃은 온실',choice:s.choice,restored:s.restored};}
export function validateState(s){return !!s&&s.version===1&&scenes.includes(s.scene)&&Number.isInteger(s.node)&&s.node>=0&&s.node<=20&&Array.isArray(s.knowledge)&&s.knowledge.every(x=>x==='light-flow')&&[0,1].includes(s.herbs)&&typeof s.restored==='boolean'&&typeof s.runeObserved==='boolean'&&[null,'together','time','ask'].includes(s.choice)&&[null,'listen','observe','help'].includes(s.reflection)&&typeof s.recorded==='boolean'&&Number.isInteger(s.hint)&&s.hint>=0&&s.hint<=3&&Number.isFinite(s.position?.x)&&s.position.x>=48&&s.position.x<=1752&&Number.isFinite(s.position?.y)&&s.position.y>=48&&s.position.y<=1052&&s.puzzle?.rotations?.length===9&&s.puzzle.rotations.every(x=>Number.isInteger(x)&&x>=0&&x<4)&&JSON.stringify(s.puzzle.masks)===JSON.stringify(initialPuzzle().masks)&&JSON.stringify(s.puzzle.solution)===JSON.stringify(initialPuzzle().solution);}

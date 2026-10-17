// Initial differences transcribed from document/03_CHARACTERS.md; never applied to an existing run.
export const HIDDEN_STATS=Object.freeze(['empathy','responsibility','curiosity','courage','cooperation','independence','prudence','honesty']);
export const startingHiddenStats=()=>Object.fromEntries(HIDDEN_STATS.map(key=>[key,0]));
const pairs={CH03:['magic','expression'],CH04:['knowledge','expression'],CH05:['expression','magic'],CH06:['dexterity','expression'],CH07:['magic','knowledge'],CH09:['magic','dexterity'],CH10:['expression','dexterity'],CH11:['expression','dexterity'],CH12:['knowledge','expression'],CH13:['expression','dexterity'],CH14:['expression','exploration'],CH17:['dexterity','expression'],CH18:['knowledge','exploration'],CH19:['dexterity','magic'],CH20:['knowledge','exploration'],CH21:['knowledge','exploration'],CH22:['dexterity','expression'],CH23:['expression','knowledge'],CH24:['expression','magic'],CH25:['dexterity','expression'],CH26:['magic','expression'],CH27:['expression','knowledge'],CH28:['exploration','knowledge'],CH29:['dexterity','knowledge'],CH30:['exploration','knowledge'],CH32:['expression','knowledge']};
export function characterStartModifiers(id){const pair=pairs[id];return pair?{[pair[0]]:10,[pair[1]]:-10}:{};}
export function startingStats(id,permanentBonuses={}){
 const modifiers=characterStartModifiers(id),stats={};
 for(const key of ['knowledge','expression','dexterity','exploration','magic']){const bonus=permanentBonuses[key]??0;if(!Number.isInteger(bonus)||bonus<0||bonus>15)throw new Error('영구 성장 보너스가 올바르지 않습니다.');stats[key]=Math.min(500,Math.max(0,50+(modifiers[key]??0)+bonus));}
 return stats;
}

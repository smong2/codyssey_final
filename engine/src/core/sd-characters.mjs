// asset/sd_character/README.md: 256px frames, 3 frames per strip, foot Y=218.
const CHARACTERS=Object.freeze({CH01:['kael',0],CH02:['sera',8],CH08:['iris',16],CH15:['robin',24],CH16:['tia',32],CH31:['nico',40]});
export const SD_DIRECTIONS=Object.freeze(['S','SW','W','NW','N','NE','E','SE']);
export function sdCharacterStrip(characterId,direction){
 const character=Object.hasOwn(CHARACTERS,characterId)?CHARACTERS[characterId]:null,index=SD_DIRECTIONS.indexOf(direction);
 if(!character||index<0)throw new Error('등록되지 않은 SD 캐릭터 또는 방향입니다.');
 return './design-assets/sd_character/'+character[0]+'_'+direction.toLowerCase()+'_strip_'+String(character[1]+index).padStart(3,'0')+'.png';
}

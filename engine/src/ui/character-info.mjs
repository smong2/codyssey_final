import {characterProfileFields} from '../core/character-profile.mjs';
export function appendCharacterInfo(container,student,el){
 container.append(el('h2',student.name),el('p',student.description??'소개 미등록'));
 const fields=el('dl',null,'selection-profile');for(const [label,value]of characterProfileFields(student))fields.append(el('dt',label),el('dd',value));
 container.append(fields);if(student.profile?.quote)container.append(el('blockquote',student.profile.quote));
}

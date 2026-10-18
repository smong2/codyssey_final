import {characterProfileFields} from '../core/character-profile.mjs';
export function appendCharacterInfo(container,student,el){
 const title=el('header',null,'character-info-heading');title.append(el('h2',student.name),el('p',student.description??'소개 미등록'));
 const details=el('section',null,'character-info-details'),fields=el('dl',null,'selection-profile');details.append(el('h3','이 친구는요'));
 for(const [label,value]of characterProfileFields(student))fields.append(el('dt',label),el('dd',value));
 details.append(fields);container.append(title,details);
 if(student.profile?.quote){const quote=el('section',null,'character-info-quote');quote.append(el('h3','한마디'),el('blockquote',student.profile.quote));container.append(quote);}
}

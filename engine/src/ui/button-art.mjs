export const TITLE_BUTTON_ART=Object.freeze({
 start:'BT04_blank_pale_green.png',
 newGame:'BT04_blank_pale_green.png',
 continue:'BT04_blank_pale_green.png'
});

export const ROOM_BUTTON_ART=Object.freeze({
 diary:'BT01_diary_green.png',
 bag:'BT02_backpack_green.png',
 menu:'BT03_menu_green.png'
});

export const BAG_BUTTON_ART=Object.freeze({default:'BT04_blank_pale_ivory_short.png',selected:'BT04_blank_pale_green_short.png'});
export function createBagButton({el,btn,label,onClick,selected}){
 const control=btn(label,onClick,'bag-ui-button'+(selected?' is-selected':''));
 control.style.backgroundImage=`url("./design-assets/ui/${BAG_BUTTON_ART[selected?'selected':'default']}")`;
 if(typeof selected==='boolean')control.setAttribute('aria-pressed',String(selected));
 return control;
}

export function createImageButton({el,btn,src,label,caption=null,onClick,className='image-button'}){
 const control=btn('',onClick,className);
 control.setAttribute('aria-label',label);
 const art=el('img',null,'button-art');art.src=src;art.alt='';art.setAttribute('aria-hidden','true');
 control.append(art);
 if(caption!==null)control.append(el('span',caption,'button-art-caption'));
 return control;
}

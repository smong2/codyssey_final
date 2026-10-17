// main's 2026-10-16 design renames. Preserve old engine/save URLs without copying assets.
const backgrounds=Object.fromEntries([
 ['BG04_academy_dormitory_1920x1080_013.png','BG03_academy_dormitory_1920x1080_013.png'],
 ['BG05_grand_library_1920x1080_014.png','BG04_grand_library_1920x1080_014.png'],
 ['BG06_starlight_observatory_1920x1080_015.png','BG05_starlight_observatory_1920x1080_015.png'],
 ['BG07_glass_greenhouse_1920x1080_016.png','BG06_glass_greenhouse_1920x1080_016.png'],
 ['BG08_healing_herb_garden_1920x1080_017.png','BG07_healing_herb_garden_1920x1080_017.png'],
 ['BG09_magic_workshop_1920x1080_018.png','BG08_magic_workshop_1920x1080_018.png'],
 ['BG10_rune_training_ground_1920x1080_019.png','BG09_rune_training_ground_1920x1080_019.png'],
 ['BG03_myroom1_day_1920x1080_012.png','BG10_myroom1_day_1920x1080_012.png'],
 ...['myroom1_sunset_1920x1080_021','myroom1_night_1920x1080_022','myroom2_day_1920x1080_023','myroom2_sunset_1920x1080_024','myroom2_night_1920x1080_025'].map(name=>['BG03_'+name+'.png','BG11_'+name+'.png'])
]);
const pets=Object.fromEntries(['owl1|PT01_owl','fox2|PT02_fox','rabbit3|PT03_rabbit','otter4|PT04_otter','puppy5|PT05_puppy','cat6|PT06_cat','red_panda7|PT07_red_panda','squirrel8|PT08_squirrel','hedgehog9|PT09_hedgehog','fawn10|PT10_fawn'].map(pair=>pair.split('|').map(name=>name+'.png')));
export function assetReference(category,file){
 if(category==='background'&&Object.hasOwn(backgrounds,file))return {category,file:backgrounds[file]};
 if(category==='bern')return {category:'pet',file:Object.hasOwn(pets,file)?pets[file]:file};
 if(category==='map')return {category,file:file.replace(/^map01_greenhouse_/,'MP01_greenhouse_')};
 return {category,file};
}

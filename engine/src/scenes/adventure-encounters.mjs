export const ADVENTURE_NPC_ENCOUNTER_RADIUS=180;

export function takeAdventureEncounter(encounters,position){
 for(const encounter of encounters){
  if(encounter.triggered||Math.hypot(position.x-encounter.point.x,position.y-encounter.point.y)>ADVENTURE_NPC_ENCOUNTER_RADIUS)continue;
  encounter.triggered=true;
  return encounter.npc;
 }
 return null;
}

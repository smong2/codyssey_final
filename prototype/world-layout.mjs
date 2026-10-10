export function enterWorld(state,map){const next=structuredClone(state);if(next.mapLayout!=='map04'){next.position={...map.spawn};next.mapLayout='map04';}return next;}

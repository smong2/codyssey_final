const GROUPS = [
  ['A','B','C'],
  ['A','B','C','D'],
  ['A','B','C','D','E'],
];
export const LEVELS = GROUPS.map((colors, level) => {
  const nodes=[];
  colors.forEach((color,group)=>{
    for(let slot=0;slot<3;slot++) {
      const angle=(group*3+slot)*Math.PI*2/(colors.length*3)-Math.PI/2;
      nodes.push({ id:`${color}${slot}`, color, x:Math.round(325+Math.cos(angle)*(group%2?170:218)), y:Math.round(365+Math.sin(angle)*(group%2?170:218)),
        requires:group===0?[]:group===1&&level===2&&slot<2?[]:[`${colors[group-1]}${slot}`] });
    }
  });
  return { nodes, capacity:level===0?5:4 };
});
export function exposed(node, removed) { return node.requires.every(id=>removed.includes(id)); }
export function take(level, state, id) {
  const node=level.nodes.find(item=>item.id===id);
  if(!node||state.removed.includes(id)||!exposed(node,state.removed)) return null;
  const removed=[...state.removed,id],tray=[...state.tray,node.color];
  if(tray.filter(color=>color===node.color).length===3) {
    for(let i=tray.length-1;i>=0;i--) if(tray[i]===node.color) tray.splice(i,1);
  }
  return { removed, tray, won:removed.length===level.nodes.length, overflow:tray.length>=level.capacity };
}

const ROOMS=new Set(['room-1','room-2','room-3']);
const SLOT=/^slot-[1-5]$/;
const TOKEN=/^\d+:[1-9]\d*:[0-4]$/;

export function validateCollectionNoticeState(state){
 if(state===undefined)return true;
 if(!state||typeof state!=='object'||Array.isArray(state)||Object.keys(state).sort().join(',')!=='processedIds,unreadRoomIds'||
  !Array.isArray(state.processedIds)||!Array.isArray(state.unreadRoomIds)||
  state.processedIds.some(id=>typeof id!=='string'||!id.trim())||new Set(state.processedIds).size!==state.processedIds.length||
  state.unreadRoomIds.some(id=>!ROOMS.has(id))||new Set(state.unreadRoomIds).size!==state.unreadRoomIds.length)throw new Error('마이룸 알림 정보를 읽지 못했습니다.');
 return true;
}

export function unreadRoomIds(meta){
 const state=meta?.collectionNoticeState;validateCollectionNoticeState(state);return [...(state?.unreadRoomIds??[])];
}

export function acceptCollectionReceipts(meta,events){
 if(!meta||typeof meta!=='object'||!Array.isArray(events))throw new Error('마이룸 수집 알림을 읽지 못했습니다.');
 const old=meta.collectionNoticeState;validateCollectionNoticeState(old);
 const rooms=meta.collectionView?.rooms;if(!Array.isArray(rooms))throw new Error('배경 퍼즐 정보를 읽지 못했습니다.');
 const known=new Set(old?.processedIds??[]),seen=new Set(),candidates=[];
 for(const event of events){
  if(!event||typeof event!=='object'||Array.isArray(event)||Object.keys(event).sort().join(',')!=='activityToken,pieceCount,receiptId,roomId,slotId,unlocked'||
   typeof event.receiptId!=='string'||!event.receiptId.trim()||typeof event.slotId!=='string'||!SLOT.test(event.slotId)||
   typeof event.activityToken!=='string'||!TOKEN.test(event.activityToken)||!ROOMS.has(event.roomId)||
   !Number.isInteger(event.pieceCount)||event.pieceCount<1||event.pieceCount>12||typeof event.unlocked!=='boolean'||seen.has(event.receiptId))throw new Error('마이룸 수집 알림 정보가 올바르지 않습니다.');
  seen.add(event.receiptId);
  const room=rooms.find(row=>row?.id===event.roomId);
  if(!room||!Array.isArray(room.pieces)||room.pieces.length!==event.pieceCount||room.unlocked!==event.unlocked||
   (event.unlocked&&event.pieceCount!==12))throw new Error('배경 퍼즐 정보와 수집 알림이 일치하지 않습니다.');
  if(!known.has(event.receiptId))candidates.push(event);
 }
 const state={processedIds:[...(old?.processedIds??[])],unreadRoomIds:[...(old?.unreadRoomIds??[])]};
 const notices=[];
 for(const event of candidates){state.processedIds.push(event.receiptId);if(!state.unreadRoomIds.includes(event.roomId))state.unreadRoomIds.push(event.roomId);
  notices.push({receiptId:event.receiptId,roomId:event.roomId,message:event.unlocked?'새로운 마이룸 배경을 완성했어요! 가방 > 마이룸에서 확인해보세요.':`퍼즐 조각을 발견했어요! 기숙사방 ${event.roomId.slice(-1)} · ${event.pieceCount} / 12`});
 }
 meta.collectionNoticeState=state;return notices;
}

export function markRoomNoticesRead(meta,roomId){
 const state=meta?.collectionNoticeState;validateCollectionNoticeState(state);if(state===undefined)return;
 if(roomId!==undefined&&!ROOMS.has(roomId))throw new Error('등록되지 않은 마이룸입니다.');
 state.unreadRoomIds=roomId===undefined?[]:state.unreadRoomIds.filter(id=>id!==roomId);
}

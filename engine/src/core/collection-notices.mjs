import {BADGE_GROUPS} from './collection-view.mjs';

const ROOMS=new Set(['room-1','room-2','room-3']);
const SLOT=/^slot-[1-5]$/;
const TOKEN=/^\d+:[1-9]\d*:[0-4]$/;
const ORNAMENTS=['star_030','bow_031','laurel_032','crown_033','gem_034','shell_035','wings_036','flower_037'];
const badgeReceiptKeys='activityToken,categoryId,receiptId,slotId,subcategoryTitle,tier';

function badgeReceiptView(meta,receipt){
 const group=BADGE_GROUPS.find(item=>item.id===receipt.categoryId),sub=group?.subgroups.find(item=>item.title===receipt.subcategoryTitle);
 if(!group||!sub||!Number.isInteger(receipt.tier)||receipt.tier<1||receipt.tier>8)throw new Error('배지 획득 정보를 읽지 못했습니다.');
 const row=meta?.collectionView?.badges?.find(item=>item?.categoryId===group.id&&item?.subcategoryTitle===sub.title);
 if(!Array.isArray(row?.earnedTiers)||!row.earnedTiers.includes(receipt.tier))throw new Error('배지 보유 정보와 획득 알림이 일치하지 않습니다.');
 return {receiptId:receipt.receiptId,categoryId:group.id,subcategoryTitle:sub.title,tier:receipt.tier,categoryTitle:group.title,badgeTitle:sub.title+' · '+receipt.tier+'단계',images:[group.frame,sub.symbol,'badge_ornament_'+ORNAMENTS[receipt.tier-1]+'.png']};
}

export function validateCollectionNoticeState(state){
 if(state===undefined)return true;
 if(!state||typeof state!=='object'||Array.isArray(state)||!['processedIds,unreadRoomIds','pendingBadgeReceipts,processedIds,unreadRoomIds'].includes(Object.keys(state).sort().join(','))||
  !Array.isArray(state.processedIds)||!Array.isArray(state.unreadRoomIds)||
  state.processedIds.some(id=>typeof id!=='string'||!id.trim())||new Set(state.processedIds).size!==state.processedIds.length||
  state.unreadRoomIds.some(id=>!ROOMS.has(id))||new Set(state.unreadRoomIds).size!==state.unreadRoomIds.length||
  state.pendingBadgeReceipts!==undefined&&(!Array.isArray(state.pendingBadgeReceipts)||state.pendingBadgeReceipts.some(item=>!item||Object.keys(item).sort().join(',')!=='categoryId,receiptId,subcategoryTitle,tier'||typeof item.receiptId!=='string'||!item.receiptId.trim()||typeof item.categoryId!=='string'||typeof item.subcategoryTitle!=='string'||!Number.isInteger(item.tier)||item.tier<1||item.tier>8||!state.processedIds.includes(item.receiptId))||new Set(state.pendingBadgeReceipts.map(item=>item.receiptId)).size!==state.pendingBadgeReceipts.length))throw new Error('수집 알림 정보를 읽지 못했습니다.');
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
 const state={processedIds:[...(old?.processedIds??[])],unreadRoomIds:[...(old?.unreadRoomIds??[])],...(old?.pendingBadgeReceipts?{pendingBadgeReceipts:structuredClone(old.pendingBadgeReceipts)}:{})};
 const notices=[];
 for(const event of candidates){state.processedIds.push(event.receiptId);if(!state.unreadRoomIds.includes(event.roomId))state.unreadRoomIds.push(event.roomId);
  notices.push({receiptId:event.receiptId,roomId:event.roomId,message:event.unlocked?'새로운 마이룸 배경을 완성했어요! 가방 > 마이룸에서 확인해보세요.':`퍼즐 조각을 발견했어요! 기숙사방 ${event.roomId.slice(-1)} · ${event.pieceCount} / 12`});
 }
 meta.collectionNoticeState=state;return notices;
}

// Accept only an already-awarded badge receipt whose saved earned tier agrees.
export function acceptBadgeReceipts(meta,events){
 if(!meta||typeof meta!=='object'||!Array.isArray(events))throw new Error('배지 획득 알림을 읽지 못했습니다.');
 const old=meta.collectionNoticeState;validateCollectionNoticeState(old);
 const known=new Set(old?.processedIds??[]),seen=new Set(),candidates=[];
 for(const event of events){
  if(!event||typeof event!=='object'||Array.isArray(event)||Object.keys(event).sort().join(',')!==badgeReceiptKeys||typeof event.receiptId!=='string'||!event.receiptId.trim()||typeof event.slotId!=='string'||!SLOT.test(event.slotId)||typeof event.activityToken!=='string'||!TOKEN.test(event.activityToken)||typeof event.categoryId!=='string'||typeof event.subcategoryTitle!=='string'||!Number.isInteger(event.tier)||event.tier<1||event.tier>8||seen.has(event.receiptId))throw new Error('배지 획득 알림 정보가 올바르지 않습니다.');
  seen.add(event.receiptId);const view=badgeReceiptView(meta,event);if(!known.has(event.receiptId))candidates.push({event,view});
 }
 if(!candidates.length)return [];
 const state={processedIds:[...(old?.processedIds??[])],unreadRoomIds:[...(old?.unreadRoomIds??[])],pendingBadgeReceipts:[...(old?.pendingBadgeReceipts??[])]};
 for(const {event} of candidates){state.processedIds.push(event.receiptId);state.pendingBadgeReceipts.push({receiptId:event.receiptId,categoryId:event.categoryId,subcategoryTitle:event.subcategoryTitle,tier:event.tier});}
 meta.collectionNoticeState=state;return candidates.map(({view})=>view);
}

export function pendingBadgeReceipts(meta){
 const state=meta?.collectionNoticeState;validateCollectionNoticeState(state);
 return (state?.pendingBadgeReceipts??[]).map(receipt=>badgeReceiptView(meta,receipt));
}

export function acknowledgeBadgeReceipts(meta,receiptIds){
 const state=meta?.collectionNoticeState;validateCollectionNoticeState(state);if(state===undefined)return;
 if(!Array.isArray(receiptIds)||receiptIds.some(id=>typeof id!=='string'))throw new Error('배지 확인 정보가 올바르지 않습니다.');
 const acknowledged=new Set(receiptIds);state.pendingBadgeReceipts=(state.pendingBadgeReceipts??[]).filter(item=>!acknowledged.has(item.receiptId));
}

export function markRoomNoticesRead(meta,roomId){
 const state=meta?.collectionNoticeState;validateCollectionNoticeState(state);if(state===undefined)return;
 if(roomId!==undefined&&!ROOMS.has(roomId))throw new Error('등록되지 않은 마이룸입니다.');
 state.unreadRoomIds=roomId===undefined?[]:state.unreadRoomIds.filter(id=>id!==roomId);
}

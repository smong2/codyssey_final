// 영상 재생 시간(초). 수정 후 저장 → 새로고침 → 인트로 다시 보기.
export const INTRO_TIMING=Object.freeze({
 fadeStartSeconds:8,
 fadeEndSeconds:10,
 titleStartSeconds:8
});
export function introFrame(playbackSeconds,timing=INTRO_TIMING){
 const {fadeStartSeconds:start,fadeEndSeconds:end,titleStartSeconds:title}=timing;
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)throw new Error('페이드 종료 시간은 시작 시간보다 커야 합니다.');
 if(!Number.isFinite(title)||title<start||title>end)throw new Error('타이틀 시작 시간은 페이드 시작·종료 사이로 설정하세요.');
 const progress=Math.min(1,Math.max(0,(playbackSeconds-start)/(end-start)));
 return {opacity:1-progress,titleVisible:playbackSeconds>=title,complete:playbackSeconds>=end};
}

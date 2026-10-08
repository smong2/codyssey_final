const topicText={
'오늘의 이야기':['온실에서 함께 발견한 작은 빛','혼자 해결해야 한다고 생각해서, 걱정을 말하지 못했어요.'],
'함께한 친구':['친구와 나눈 말','함께 들어줘서 마음이 조금 가벼워졌어요.'],
'모험의 발견':['빛을 되찾은 유리꽃','잎에 작은 빛이 돌아오는 걸 함께 봤어요.'],
'마음의 선택':['다시 건넨 한마디','다음에는 함께 살펴보자고 말해 주었어요.'],
'돌아보기':['오늘의 마음 기록','천천히 이야기해도 괜찮다는 말이 기억나요.']};
document.querySelectorAll('.topic').forEach(b=>b.onclick=()=>{const journal=b.closest('.journal');journal.querySelectorAll('.topic').forEach(x=>x.classList.toggle('active',x===b));journal.querySelector('.topic-title').textContent=b.dataset.topic;journal.querySelector('.page-heading p').textContent=topicText[b.dataset.topic][0];journal.querySelector('.quote').textContent='“'+topicText[b.dataset.topic][1]+'”';});
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('.journal').hidden=true);
document.querySelectorAll('.openjournal').forEach(b=>b.onclick=()=>{const j=document.querySelector('.journal[data-variant="'+b.dataset.open+'"]');j.hidden=false;j.scrollIntoView({block:'center',behavior:'auto'});});
document.querySelectorAll('.pagenext,.pageback').forEach(b=>b.onclick=()=>{const j=b.closest('.journal');let p=+(j.dataset.page||1);p=Math.max(1,Math.min(12,p+(b.classList.contains('pagenext')?1:-1)));j.dataset.page=p;j.querySelector('.page-counter').textContent=String(p).padStart(2,'0')+' / 12';j.querySelector('.record-meta span:last-child').textContent='대화 기록 '+String(p).padStart(2,'0');});
document.querySelectorAll('.date[data-day]').forEach(b=>b.onclick=()=>{if(!+b.dataset.day)return;document.querySelectorAll('.date').forEach(x=>x.classList.toggle('selected',x===b));document.getElementById('day-title').textContent='10월 '+b.dataset.day+'일';});
document.querySelector('.search').oninput=e=>{const q=e.target.value.trim();const j=e.target.closest('.journal');j.querySelector('.conversation').hidden=!!q&&!j.querySelector('.conversation').textContent.includes(q);};


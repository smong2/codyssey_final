# NPC별 스토리

인물별 관계·대화·개별 사건을 보관합니다. 학생 32명과 안내 인물의 설정은 [캐릭터 문서](../../document/03_CHARACTERS.md)를 기준으로 확인합니다. 인물·에피소드별 파일로 분리합니다. [예시 템플릿](예시_NPC_스토리.md)은 확정 시나리오가 아닙니다.

본편 NPC Story는 **GUIDE / WORK / LULU 3개 체인만 사용**합니다. GUIDE는 티아(주인공이 티아면 로빈), WORK는 렌(주인공이 렌이면 다나), LULU는 루루가 담당합니다. 과거 검토했던 `TBD1 / TBD2` 추가 체인은 스펙 아웃되었습니다. 구조와 노출 일정은 [feedback_npc.md](feedback_npc.md), 실제 공통 대화·나레이션·이미지·선택 시퀀스는 [`document/dialogue/npc/`](../../document/dialogue/npc/README.md), CH01~CH32 실제 플레이어 대사·선택 문구·상대 반응은 [`document/dialogue/npc/character_sets/`](../../document/dialogue/npc/character_sets/README.md)를 기준으로 합니다. 현재 대사 검수는 승인됐고 `backend/database/sqlite/seed_npc_story.py`까지 구현되어 있으며 실제 SQLite 실행 검증이 남아 있습니다.

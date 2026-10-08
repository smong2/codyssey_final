## 2026-10-01 Prototype 제작 기준

사용자가 등록한 최신 문서:
- [통합 게임 기획](references/production-2026-10-01/LUMIA_GAME_DESIGN.md): 확정 설계와 변경 사항.
- [Prototype 범위](references/production-2026-10-01/LUMIA_PROTOTYPE_PLAN.md): 온실 시나리오와 제외 범위.
- [디자이너 가이드](references/production-2026-10-01/LUMIA_DESIGNER_GUIDE.md): 재사용·분리·규격 원칙.
- [제작 요청서](references/production-2026-10-01/LUMIA_DESIGNER_PRODUCTION_REQUEST.md): 상태·크기·수량 확인.

디자인 제작 전 가이드와 요청서, Prototype 범위를 읽는다. Draft/TBD를 최종 확정으로 바꾸지 않는다. Game Design의 구 8장/기술 데이터에는 Life 직접 이동·Stage/Checkpoint 등 옛 내용이 남아 있으므로, 명시된 확정 설계와 최신 Prototype 범위를 따른다: Life는 정적 큰 배경+큰 인물, Adventure는 같은 온실의 SD 직접 조작이며 별도 장소가 아니다.

기존 32인·배경·소품을 먼저 파일 단위 대조한다. 기존이라고 적혀 있어도 실제 없으면 미제작으로 기록한다(베른 사례). 🔴 중 시나리오에 필요하고 재사용 불가능한 요소만 우선 제작. Later/Optional/TBD는 별도 요청 또는 결정 전 대량 생성하지 않는다. 32인 SD·175 표정 패치·추가 장소 일괄 제작은 현재 큐가 아니다. SD Cell·퍼즐 Grid는 팀/테스트 결정 대기. 초기 권장 크기 범위에서 고른 값은 테스트용으로 표시하고 최종 확정값처럼 서술하지 않는다.

이번 Prototype 초기 기준은 Life 1920×1080, 큰 인물 1024×1536이며 이전 고해상도 목표와 구분한다. 파일 실제 크기·알파·상태 연속성을 확인하고 반환 크기가 다르면 정규화 대기로 기록한다. 새 State는 같은 물체 원본을 편집하고 새 물체로 다시 발명하지 않는다. UI는 재사용 재료+CSS/SVG, 이름/본문은 동적 텍스트. 원본은 보존한다.

저장소 결과는 document/03_characters 안에서 번호 분류를 유지한다. 이미지 생성 전에 중복 대조·예정 파일명·규격·상태가 포함된 Markdown 체크리스트를 작성한다. 사용자 요청이 있을 때 카테고리 완료마다 GitHub에 저장한다. 문서 자체는 외부 쓰기 허가가 아니다.

# 08_sd_character — Prototype 생성 결과

생성 파일이며 게임 적용 QA는 미완료. 00_images는 초기 테스트 규격, 01_sources는 생성 원본. 리사이즈는 종횡비 유지(투명 개체는 contain, 불투명 배경은 cover). 크기 일치는 미술·알파·애니메이션 합격을 의미하지 않는다.

## SD01 카엘_기준

- 원본: 1254×1254 / 테스트 파일: 256×256
- 상태: generated_pending_game_qa, 샘플 알파: 0~255

![카엘_기준](../assets/character_images/SD01_kael_reference_063.png)

## SD02 카엘_걷기_마스터

- 원본: 768×2048 / 테스트 파일: 768×2048
- 상태: generated_pending_game_qa, 샘플 알파: 0~254

![카엘_걷기_마스터](../assets/character_images/SD02_kael_walk_master_064.png)



## 검수 결과
SD01: 비율 수정본 저장. SD02: 768×2048 크기는 충족하지만 행 내부 방향 혼합과 배경 후광이 남아 있음. 수정 시도 2회 포함 시안 보관. 게임용 자동 분리 및 걷기 애니메이션 납품은 미완료. 00_images 위치는 제작 시안이며 출시 승인 의미가 아님.


## SD03 방향별 재제작
8방향 스트립과 24개 256×256 프레임 저장. 발 기준선 218px. [움직임 검수 페이지](../code/sd_character_motion_review_009.html), [프레임 목록](sd_character_SD03_manifest_139.json). 방향 혼합과 넓은 후광은 개선되었지만 후면 책 위치 변화·일부 유사 보폭·방향 간 비율은 미완료 QA로 남음.

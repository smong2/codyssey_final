# Database

데이터베이스는 **Cloud Firestore**를 사용합니다.

주 저장 대상은 다음과 같습니다.

- Firebase Authentication UID와 연결되는 사용자 메타
- Global Meta Progress
- 5개 세이브 슬롯과 현재 active run
- 캐릭터·펫·배지·퍼즐·배경·엔딩 해금 상태
- 플레이 완료 캐릭터와 누적 행동 카운터
- 엔딩 판정 및 AI 편지에 필요한 실제 플레이 기록

캐릭터 정의, 스토리 원본, 배지 조건 같은 게임 마스터 데이터는 가능한 한 Git의 코드/JSON/문서로 버전 관리하고 Firestore는 사용자별 상태를 중심으로 사용합니다. 구체적인 collection/document 구조와 Security Rules는 API 구현 단계에서 확정합니다.

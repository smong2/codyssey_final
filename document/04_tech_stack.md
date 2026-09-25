# ⚙️ [04] 개발환경 & 기술 스택 (Tech Stack & Architecture)

> **핵심 설계 목표**: 
> * 크롬북, 태블릿, 저사양 PC 등 학교 및 가정 환경에서 별도 설치 없이 즉시 실행되는 웹 기반 아키텍처.
> * 2.5D 감성의 고품질 비주얼을 가볍고 부드럽게 렌더링하는 경량 웹 엔진 채택.
> * 학생의 선택 로그를 실시간 분석하여 학부모에게 심리 피드백을 전달하는 서버리스 BaaS 구축.
> **문서 버전**: v1.0  
> **작성 일자**: 2026-09-23  

---

## 1. 기술 스택 종합 다이어그램

```
┌────────────────────────────────────────────────────────────────────────┐
│                        [ 시스템 전체 아키텍처 ]                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [클라이언트 (웹 브라우저)]                                           │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ UI 계층: HTML5 / Modern CSS (양피지 고서 테마, 반응형)        │     │
│   │ 게임 계층: HTML5 Canvas 2.5D 경량 엔진 (Pixi.js / Phaser 3)   │     │
│   │ 연출 계층: WebGL Shader / CSS Matrix 2.5D 마이크로 모션      │     │
│   │ 로직 계층: TypeScript / Vanilla ES6+ 모듈                    │     │
│   └───────────────────────────────┬──────────────────────────────┘     │
│                                   │ HTTPS / WebSocket                  │
│                                   ▼                                    │
│   [백엔드 서비스 (BaaS: Firebase or Supabase)]                         │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ 인증 (Auth): 학생 간편 로그인 / 학부모 연동 인증             │     │
│   │ 데이터베이스 (Cloud Firestore / PostgreSQL):                 │     │
│   │   - 학생 프로필 & 선택 캐릭터                                │     │
│   │   - 퀘스트 진행 및 선택지 행동 로그                          │     │
│   │   - 마이룸 가구 배치 좌표 및 소지품                          │     │
│   │ 클라우드 함수 (Cloud Functions / Edge Functions):            │     │
│   │   - 선택지 로그 기반 MBTI 행동 패턴 실시간 집계              │     │
│   │   - 학부모용 '마음 성장 리포트' 지표 가공                    │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                   │                                    │
│   [배포 & 인프라 (Hosting)]       ▼                                    │
│   - Cloudflare Pages / Vercel / Firebase Hosting (글로벌 CDN)          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 계층별 상세 기술 스택

### 2.1 클라이언트 (Frontend & Game Client)

| 구분 | 채택 기술 | 선정 사유 및 역할 |
| :--- | :--- | :--- |
| **기반 언어** | **Modern JavaScript (ES6+) / TypeScript** | 표준 웹 기술로 브라우저 호환성 극대화 및 유지보수 용이성 확보 |
| **마크업/스타일** | **HTML5, CSS3 / PostCSS** | 아르카디아 특유의 양피지, 황동 금장 프레임 UI를 반응형 웹으로 구현 |
| **게임 렌더러** | **HTML5 Canvas 2.5D (Pixi.js / Phaser 3 검토)** | 모바일 및 저사양 태블릿에서도 60fps를 안정적으로 유지하는 초경량 렌더러 |
| **캐릭터 애니메이션** | **WebGL Shader / CSS Matrix 키프레임** | 32종 완성형 일러스트에 미세한 호흡, 눈 깜빡임, 옷자락 흔들림을 GPU 가속으로 부드럽게 구현 |
| **오디오** | **Web Audio API / Howler.js** | 서정적인 켈틱 BGM 및 고풍스러운 마법 효과음 스트리밍 관리 |

---

### 2.2 백엔드 & 데이터베이스 (Backend & DB)

서버 인프라 구축 및 유지비용을 최소화하고, 빠른 개발과 안정적인 확장을 위해 **Firebase (또는 Supabase)**를 채택합니다.

* **후보 1: Google Firebase (권장)**
  * **Firebase Authentication**: 학교 번호/이메일 간편 로그인 및 학부모 핀코드 연동 지원.
  * **Cloud Firestore (NoSQL Document DB)**: 실시간 동기화(Realtime Sync)를 통해 마이룸 가구 배치 및 대화 진행 상태 즉각 반영.
  * **Cloud Functions**: 아이의 대화 선택 로그가 발생할 때마다 백그라운드에서 감정 및 행동 지표를 계산하여 부모 대시보드로 전달.
* **후보 2: Supabase (PostgreSQL BaaS)**
  * 관계형 쿼리(SQL)를 통한 정밀한 통계 및 RLS(Row Level Security)를 통한 강력한 학생 개인정보 보호.

---

## 3. 데이터베이스 모델 설계 (Core Schema)

### 3.1 학생 사용자 컬렉션 (`users/{userId}`)
```json
{
  "userId": "std_2026_0921",
  "name": "민수",
  "grade": 4,
  "selectedCharacter": "INTJ_M_KAEL",
  "createdAt": "2026-09-23T10:00:00Z",
  "lastLogin": "2026-09-23T15:30:00Z",
  "parentId": "parent_0921_auth"
}
```

### 3.2 선택지 행동 로그 컬렉션 (`choice_logs/{logId}`)
```json
{
  "logId": "log_88291",
  "userId": "std_2026_0921",
  "timestamp": "2026-09-23T15:45:00Z",
  "npcId": "ISIS_SENIOR",
  "episodeId": "EP_01_HERB_SECRET",
  "choiceTaken": {
    "choiceId": "OPT_EMPATHY_TRUTH",
    "text": "선배가 진짜로 하고 싶은 일이 무엇인지 듣고 싶어요.",
    "dimensionTags": ["공감", "경청", "용기", "진실"]
  }
}
```

### 3.3 마이룸 가구 배치 컬렉션 (`myroom/{userId}`)
```json
{
  "userId": "std_2026_0921",
  "roomTheme": "ARCADIA_ATTIC_DEFAULT",
  "placedItems": [
    { "itemId": "DESK_ANTIQUE_OAK", "x": 120, "y": 240, "layer": 1 },
    { "itemId": "LAMP_RUNE_WARM", "x": 135, "y": 210, "layer": 2 },
    { "itemId": "BED_VELVET_NAVY", "x": 450, "y": 180, "layer": 1 }
  ]
}
```

### 3.4 학부모 리포트 지표 (`growth_reports/{userId}`)
```json
{
  "userId": "std_2026_0921",
  "period": "2026-W38",
  "dominantChoices": {
    "empathyScore": 88,
    "assertivenessScore": 72,
    "responsibilityScore": 95,
    "flexibilityScore": 65
  },
  "coachComment": "아이가 친구의 무거운 침묵 뒤에 숨겨진 부담감에 깊이 공감하는 선택을 보였습니다. 가정에서도 아이의 작은 고민에 먼저 귀 기울여 주시면 더욱 큰 안정감을 얻을 수 있습니다.",
  "recommendedQuestions": [
    "오늘 친구 중에 힘들어하는 친구가 있었니?",
    "그럴 때 민수는 어떤 말을 건네주고 싶었어?"
  ]
}
```

---

## 4. 인프라 및 배포 파이프라인

* **정적 웹 호스팅**: **Cloudflare Pages** 또는 **Vercel**
  * 전 세계 엣지 네트워크를 통한 초고속 캐싱 및 로딩 지연 최소화.
  * Git 푸시 시 자동 빌드 및 미리보기(Preview) 환경 지원.
* **보안 및 개인정보 보호 (Data Privacy)**:
  * 초등학생 사용자의 개인정보 보호 규정 준수 (최소 정보 수집 원칙).
  * 학부모 연동은 난수화된 페어링 코드(Pairing Code) 기반으로 암호화 연결.

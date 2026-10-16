# AI 엔딩 화면 연결 프레임

기준: `document/09_AI_ENDING_LETTER.md`와 엔딩 시스템. 직업 판정·실제 플레이 기록 4~6개 및 중요 선택 최대 2개 선별·Gemini 호출·응답 안전 검증·회차 완료/저장은 백엔드/게임 규칙의 책임이며 이 화면은 결과를 표시합니다.

## 확인 방법

마이룸 → 메뉴 → 전체 흐름 보기 → 최종 이벤트 · 엔딩에서 짧은 예시 편지를 봅니다. `실제 연결 프레임 보기`로 데이터가 없는 상태도 확인합니다. 정상 52주 종료 경로에서는 실제 연결 프레임부터 엽니다. X는 마이룸으로 돌아갑니다. 미리보기는 날짜·슬롯·메타·회차 완료를 변경하지 않습니다.

예시의 룬 연구가 ID/직업명/편지는 사용자가 승인한 화면용 fixture입니다. 최종 직업 목록이나 실제 AI 출력이 아니며 저장하거나 API 입력에 사용하지 않습니다. 왼쪽 기록은 예시와 별개로 현재 회차의 실제 완료 활동을 합산합니다. 과거 저장에 기록이 없으면 미등록으로 표시합니다.

## 엔진 내부 adapter 제안 — 실제 API 계약 미확정

`createEndingUI`의 선택적 `loadEnding({slotId, runNumber})`에 준비된 결과를 조회하는 함수를 주입합니다. 현재 실행판은 adapter를 주입하지 않습니다. HTTP endpoint, 인증 방식 구현, 실제 response 필드명은 백엔드 담당자와 확정 후 이 adapter에서 변환합니다. Gemini 키나 프롬프트를 브라우저에 두지 않습니다.

엔진 표시 모델:

```js
{
  slotId, runNumber,
  career: {id, name, type, careerAnchor}, // 규칙 엔진이 확정한 CAREER/FALLBACK 결과
  playRecords: [], // 백엔드가 확정한 4~6개 실제 횟수 기록
  letter: {
    status: 'pending' | 'ready' | 'failed',
    source: 'ai' | 'fallback',
    validated: true, // ready 응답은 백엔드 검증 완료 필요
    careerId,
    sections: {future, reflection, encouragement}
  }
}
```

ready 편지는 같은 슬롯·회차·확정 직업, 3개 필수 섹션, 검증 완료를 확인합니다. 콘텐츠 안전성·사실 근거 검증 자체는 백엔드 책임입니다. 응답 텍스트는 HTML로 해석하지 않습니다. pending/failed 상태에서도 확정 직업은 표시하며 조회 실패 시 재확인할 수 있습니다. 화면 이탈 뒤 도착한 응답은 무시합니다. fallback은 백엔드가 검증해 보내는 템플릿만 표시합니다.

## 남은 연결

- 정식 직업 10종 + `별길 개척자` fallback 연결, 4~6개 실제 기록 및 중요 선택 선별
- FastAPI endpoint/request/response와 Firebase 인증 adapter
- Gemini 생성·검증·재시도·fallback·결과 저장
- 엔딩 완료 및 메타 반영/다음 회차 처리

현재 프레임에 위 기능이 구현되었다고 해석하지 않습니다.

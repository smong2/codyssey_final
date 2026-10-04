# LUMIA Greenhouse Prototype Implementation Plan

**Goal:** PC에서 타이틀부터 부모 리포트까지 프런트엔드 전체 흐름을 검증한다.

**Architecture:** HTML/CSS 생활 화면과 Phaser 3 탐험 장면을 하나의 앱 상태로 연결한다. 임시 JSON 콘텐츠와 로컬 저장은 렌더링에서 분리한다.

**Tech Stack:** ES modules, Phaser 3.90.0, Node 정적 개발 서버, node:test.

**Spec:** docs/LUMIA_PROTOTYPE_PLAN.md

## 제약

카엘 1명, 같은 온실의 모드별 자산, 조사/채집 구분, Connect/Rotate만 사용. 로그인/API/서버 저장은 제외. 부모 리포트에 개인 성찰을 노출하지 않는다. main의 기존 자산을 복사 재사용하고 원본 내용은 보존한다.

## 구현 순서

- [x] 콘텐츠·상태: `prototype/content.json`, `prototype/state.mjs`, `prototype/puzzle.mjs`, `prototype/tests/core.test.mjs`. 경로 연결, 회전 연결 판정, 중복 수집·해결 방지, 저장 손상 처리와 리포트 개인 데이터 제외를 node:test로 확인한다.
- [x] 전체 흐름: `prototype/index.html`, `prototype/app.mjs`, `prototype/styles.css`, `prototype/storage.mjs`. 타이틀/카엘/입학/광장/온실/Choice/My Room/Record/Report와 모달 UI, 로컬 이어하기를 구현한다.
- [x] 탐험: `prototype/adventure.mjs`. JSON 배치·충돌·발 기준점, WASD/화살표 이동, E 상호작용, 카메라, 조사/채집/룬 퍼즐, 회복 상태를 연결한다.
- [x] 검증·실행: `prototype/server.mjs`, README. 로컬 HTTP 서버 실행, 전체 브라우저 플레이, 퍼즐 해결·이어하기·개인 기록 제외·자산 누락·콘솔 오류를 확인한다.

## 결정 기록

기존 루트 dev-ds checkout에서 실행한다. 사용자 요청 범위의 구현을 직접 진행하며 별도 실행 승인 단계는 추가하지 않는다. 시온은 임시 캐스팅이다. 전체 자산 제작/수정은 수행하지 않는다.

## 실행 결과

4개 작업 구현 완료. 핵심 상태 테스트는 최초 모듈 누락 실패를 확인한 후 구현하여 통과했다. 전체 자동 검증 11/11, JavaScript 문법 검사 및 실제 브라우저 전체 플레이 확인. 상세 결과는 prototype/VERIFICATION.md.

마우스 바닥 클릭 이동을 PC 검증 편의 기능으로 추가했다. 자동 길찾기는 포함하지 않았다. Phaser는 CDN에서 고정 버전을 받아 로컬 동봉했다. 저사양 실기기/태블릿/최종 디자인 QA는 이후 검증이다. 코드 자체 검토에서 모드 전환, 저장/복귀, 부모 리포트 개인 데이터 제외와 JSON 자산 연결을 확인했다.

# 캐릭터

## 구성과 사용 원칙

아르카디아에는 서로 다른 성향과 배경을 가진 학생 캐릭터 32명이 설정되어 있습니다. 남학생 16명, 여학생 16명으로 구성합니다. 각 인물의 MBTI 표기는 제작용 성격 참조이지, 플레이어를 분류·평가하거나 대사의 정답을 정하는 장치가 아닙니다.

보이는 성장 스탯의 기본 시작값은 `지식 / 표현력 / 솜씨 / 탐험 / 마법 = 각 50`입니다. 체력은 모든 캐릭터가 동일하게 `100`으로 시작하며 캐릭터별 보정 대상에서 제외합니다.

- 게임 시작 시 남학생 3명, 여학생 3명, 총 **6명**을 기본 오픈합니다.
- 기본 오픈 캐릭터는 다양한 취향으로 고를 수 있도록 성격과 플레이 이미지가 겹치지 않게 구성하고 **스탯 보정을 적용하지 않습니다.**
- 나머지 26명은 캐릭터의 설정과 강점·약점에 따라 성장 스탯 하나에 `+10`, 다른 하나에 `-10`을 적용합니다.
- 따라서 보정 캐릭터도 성장 스탯 총합은 기본 캐릭터와 같으며, 해금 캐릭터가 단순 상위호환이 되지 않습니다.
- `+10` 스탯은 기본값 50에서 60, `-10` 스탯은 40으로 시작합니다.

### 기본 오픈 캐릭터 6명

| 성별 | 캐릭터 | 선택 이유 |
|---|---|---|
| 남 | **카엘(CH01)** | 차분하고 멋있는 전략가형 |
| 남 | **로빈(CH15)** | 친근하고 활발한 모험가형 |
| 남 | **니코(CH31)** | 유쾌하고 화려한 쇼맨형 |
| 여 | **세라(CH02)** | 고요하고 신비로운 통찰가형 |
| 여 | **아이리스(CH08)** | 호기심 많고 당찬 실험·모험가형 |
| 여 | **티아(CH16)** | 밝고 사랑스러운 요정 소환사형 |

기본 오픈 6명은 캐릭터 선택 단계에서 특정 스탯 조합을 정답처럼 느끼지 않고 **외형과 성격 취향으로 첫 캐릭터를 선택하게 하는 역할**을 합니다.

## 학생 캐릭터 32명

캐릭터 이미지는 전신 1장과 대화·감정 표현용 상반신 5장을 한 세트로 사용합니다. 표의 이미지 열은 다음 의미로 통일합니다.

| 이미지 열 | 용도 | 파일명 규칙 예시 |
|---|---|---|
| 캐릭터 img | 전신 | `kael0_fullbody.png` |
| img1 | 기본 상반신 | `kael1_base.png` |
| img2 | 경청 | `kael2_listening.png` |
| img3 | 생각 | `kael3_thinking.png` |
| img4 | 격려 | `kael4_encouraging.png` |
| img5 | 안도 | `kael5_relieved.png` |

엘리아는 표준 6장 외에 전신 크기 보정본 `elia6_fullbody_resized.png`가 별도 자산으로 존재합니다. 이 파일은 감정 표현 이미지가 아니므로 아래 표의 `img1~img5`에는 포함하지 않습니다.

### 분석가형 — NT

| ID | 인물 | 성별 | 성향 | 핵심 설정 | 초기 상태 | 보정 스탯 | 캐릭터 img | img1 | img2 | img3 | img4 | img5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CH01 | 카엘 | 남 | INTJ | 그림자 도서관의 전략가. 치밀하지만 감정 표현에 서툼 | **기본 오픈** | 없음 | <img src="../asset/character/kael0_fullbody.png" width="100" alt="카엘 전신"> | <img src="../asset/character/kael1_base.png" width="100" alt="카엘 기본"> | <img src="../asset/character/kael2_listening.png" width="100" alt="카엘 경청"> | <img src="../asset/character/kael3_thinking.png" width="100" alt="카엘 생각"> | <img src="../asset/character/kael4_encouraging.png" width="100" alt="카엘 격려"> | <img src="../asset/character/kael5_relieved.png" width="100" alt="카엘 안도"> |
| CH02 | 세라 | 여 | INTJ | 별을 읽는 은둔 사제. 깊은 통찰과 느린 신뢰 | **기본 오픈** | 없음 | <img src="../asset/character/sera0_fullbody.png" width="100" alt="세라 전신"> | <img src="../asset/character/sera1_base.png" width="100" alt="세라 기본"> | <img src="../asset/character/sera2_listening.png" width="100" alt="세라 경청"> | <img src="../asset/character/sera3_thinking.png" width="100" alt="세라 생각"> | <img src="../asset/character/sera4_encouraging.png" width="100" alt="세라 격려"> | <img src="../asset/character/sera5_relieved.png" width="100" alt="세라 안도"> |
| CH03 | 시온 | 남 | INTP | 룬 마법 이론 연구생. 호기심과 창의적 가설 | 해금 | 마법 +10 / 표현력 -10 | <img src="../asset/character/sion0_fullbody.png" width="100" alt="시온 전신"> | <img src="../asset/character/sion1_base.png" width="100" alt="시온 기본"> | <img src="../asset/character/sion2_listening.png" width="100" alt="시온 경청"> | <img src="../asset/character/sion3_thinking.png" width="100" alt="시온 생각"> | <img src="../asset/character/sion4_encouraging.png" width="100" alt="시온 격려"> | <img src="../asset/character/sion5_relieved.png" width="100" alt="시온 안도"> |
| CH04 | 로엔 | 여 | INTP | 잊힌 고문서 해독가. 근거를 중시하는 분석가 | 해금 | 지식 +10 / 표현력 -10 | <img src="../asset/character/roen0_fullbody.png" width="100" alt="로엔 전신"> | <img src="../asset/character/roen1_base.png" width="100" alt="로엔 기본"> | <img src="../asset/character/roen2_listening.png" width="100" alt="로엔 경청"> | <img src="../asset/character/roen3_thinking.png" width="100" alt="로엔 생각"> | <img src="../asset/character/roen4_encouraging.png" width="100" alt="로엔 격려"> | <img src="../asset/character/roen5_relieved.png" width="100" alt="로엔 안도"> |
| CH05 | 레온 | 남 | ENTJ | 아카데미 총학생회장. 결단력과 높은 기준 | 해금 | 표현력 +10 / 마법 -10 | <img src="../asset/character/leon0_fullbody.png" width="100" alt="레온 전신"> | <img src="../asset/character/leon1_base.png" width="100" alt="레온 기본"> | <img src="../asset/character/leon2_listening.png" width="100" alt="레온 경청"> | <img src="../asset/character/leon3_thinking.png" width="100" alt="레온 생각"> | <img src="../asset/character/leon4_encouraging.png" width="100" alt="레온 격려"> | <img src="../asset/character/leon5_relieved.png" width="100" alt="레온 안도"> |
| CH06 | 벨라 | 여 | ENTJ | 룬 기사단 총지휘관. 대담하지만 감정 조율은 서툼 | 해금 | 솜씨 +10 / 표현력 -10 | <img src="../asset/character/bella0_fullbody.png" width="100" alt="벨라 전신"> | <img src="../asset/character/bella1_base.png" width="100" alt="벨라 기본"> | <img src="../asset/character/bella2_listening.png" width="100" alt="벨라 경청"> | <img src="../asset/character/bella3_thinking.png" width="100" alt="벨라 생각"> | <img src="../asset/character/bella4_encouraging.png" width="100" alt="벨라 격려"> | <img src="../asset/character/bella5_relieved.png" width="100" alt="벨라 안도"> |
| CH07 | 유안 | 남 | ENTP | 마도 연금술사. 재치와 임기응변 | 해금 | 마법 +10 / 지식 -10 | <img src="../asset/character/yuan0_fullbody.png" width="100" alt="유안 전신"> | <img src="../asset/character/yuan1_base.png" width="100" alt="유안 기본"> | <img src="../asset/character/yuan2_listening.png" width="100" alt="유안 경청"> | <img src="../asset/character/yuan3_thinking.png" width="100" alt="유안 생각"> | <img src="../asset/character/yuan4_encouraging.png" width="100" alt="유안 격려"> | <img src="../asset/character/yuan5_relieved.png" width="100" alt="유안 안도"> |
| CH08 | 아이리스 | 여 | ENTP | 시공간 실험가. 실패를 새 시도로 바꾸는 모험가 | **기본 오픈** | 없음 | <img src="../asset/character/iris0_fullbody.png" width="100" alt="아이리스 전신"> | <img src="../asset/character/iris1_base.png" width="100" alt="아이리스 기본"> | <img src="../asset/character/iris2_listening.png" width="100" alt="아이리스 경청"> | <img src="../asset/character/iris3_thinking.png" width="100" alt="아이리스 생각"> | <img src="../asset/character/iris4_encouraging.png" width="100" alt="아이리스 격려"> | <img src="../asset/character/iris5_relieved.png" width="100" alt="아이리스 안도"> |

### 외교관형 — NF

| ID | 인물 | 성별 | 성향 | 핵심 설정 | 초기 상태 | 보정 스탯 | 캐릭터 img | img1 | img2 | img3 | img4 | img5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CH09 | 에녹 | 남 | INFJ | 은빛 호수의 은둔 예언자. 타인의 상처에 민감 | 해금 | 마법 +10 / 솜씨 -10 | <img src="../asset/character/enoch0_fullbody.png" width="100" alt="에녹 전신"> | <img src="../asset/character/enoch1_base.png" width="100" alt="에녹 기본"> | <img src="../asset/character/enoch2_listening.png" width="100" alt="에녹 경청"> | <img src="../asset/character/enoch3_thinking.png" width="100" alt="에녹 생각"> | <img src="../asset/character/enoch4_encouraging.png" width="100" alt="에녹 격려"> | <img src="../asset/character/enoch5_relieved.png" width="100" alt="에녹 안도"> |
| CH10 | 엘리아 | 여 | INFJ | 정령의 목소리를 듣는 무녀. 따뜻한 중재자 | 해금 | 표현력 +10 / 솜씨 -10 | <img src="../asset/character/elia0_fullbody.png" width="100" alt="엘리아 전신"> | <img src="../asset/character/elia1_base.png" width="100" alt="엘리아 기본"> | <img src="../asset/character/elia2_listening.png" width="100" alt="엘리아 경청"> | <img src="../asset/character/elia3_thinking.png" width="100" alt="엘리아 생각"> | <img src="../asset/character/elia4_encouraging.png" width="100" alt="엘리아 격려"> | <img src="../asset/character/elia5_relieved.png" width="100" alt="엘리아 안도"> |
| CH11 | 루카 | 남 | INFP | 달빛을 노래하는 음유시인. 섬세하고 낭만적 | 해금 | 표현력 +10 / 솜씨 -10 | <img src="../asset/character/luca0_fullbody.png" width="100" alt="루카 전신"> | <img src="../asset/character/luca1_base.png" width="100" alt="루카 기본"> | <img src="../asset/character/luca2_listening.png" width="100" alt="루카 경청"> | <img src="../asset/character/luca3_thinking.png" width="100" alt="루카 생각"> | <img src="../asset/character/luca4_encouraging.png" width="100" alt="루카 격려"> | <img src="../asset/character/luca5_relieved.png" width="100" alt="루카 안도"> |
| CH12 | 리네 | 여 | INFP | 유리 온실의 식물 교감사. 수줍지만 생명을 지킴 | 해금 | 지식 +10 / 표현력 -10 | <img src="../asset/character/rine0_fullbody.png" width="100" alt="리네 전신"> | <img src="../asset/character/rine1_base.png" width="100" alt="리네 기본"> | <img src="../asset/character/rine2_listening.png" width="100" alt="리네 경청"> | <img src="../asset/character/rine3_thinking.png" width="100" alt="리네 생각"> | <img src="../asset/character/rine4_encouraging.png" width="100" alt="리네 격려"> | <img src="../asset/character/rine5_relieved.png" width="100" alt="리네 안도"> |
| CH13 | 아드리안 | 남 | ENFJ | 모두를 이끄는 마음의 등불. 다정한 멘토 | 해금 | 표현력 +10 / 솜씨 -10 | <img src="../asset/character/adrian0_fullbody.png" width="100" alt="아드리안 전신"> | <img src="../asset/character/adrian1_base.png" width="100" alt="아드리안 기본"> | <img src="../asset/character/adrian2_listening.png" width="100" alt="아드리안 경청"> | <img src="../asset/character/adrian3_thinking.png" width="100" alt="아드리안 생각"> | <img src="../asset/character/adrian4_encouraging.png" width="100" alt="아드리안 격려"> | <img src="../asset/character/adrian5_relieved.png" width="100" alt="아드리안 안도"> |
| CH14 | 스텔라 | 여 | ENFJ | 음악당의 조율사. 관계의 화음을 찾음 | 해금 | 표현력 +10 / 탐험 -10 | <img src="../asset/character/stella0_fullbody.png" width="100" alt="스텔라 전신"> | <img src="../asset/character/stella1_base.png" width="100" alt="스텔라 기본"> | <img src="../asset/character/stella2_listening.png" width="100" alt="스텔라 경청"> | <img src="../asset/character/stella3_thinking.png" width="100" alt="스텔라 생각"> | <img src="../asset/character/stella4_encouraging.png" width="100" alt="스텔라 격려"> | <img src="../asset/character/stella5_relieved.png" width="100" alt="스텔라 안도"> |
| CH15 | 로빈 | 남 | ENFP | 바람을 쫓는 자유 유랑자. 빠른 친화력 | **기본 오픈** | 없음 | <img src="../asset/character/robin0_fullbody.png" width="100" alt="로빈 전신"> | <img src="../asset/character/robin1_base.png" width="100" alt="로빈 기본"> | <img src="../asset/character/robin2_listening.png" width="100" alt="로빈 경청"> | <img src="../asset/character/robin3_thinking.png" width="100" alt="로빈 생각"> | <img src="../asset/character/robin4_encouraging.png" width="100" alt="로빈 격려"> | <img src="../asset/character/robin5_relieved.png" width="100" alt="로빈 안도"> |
| CH16 | 티아 | 여 | ENFP | 빛의 요정 소환사. 분위기를 밝히는 인물 | **기본 오픈** | 없음 | <img src="../asset/character/tia0_fullbody.png" width="100" alt="티아 전신"> | <img src="../asset/character/tia1_base.png" width="100" alt="티아 기본"> | <img src="../asset/character/tia2_listening.png" width="100" alt="티아 경청"> | <img src="../asset/character/tia3_thinking.png" width="100" alt="티아 생각"> | <img src="../asset/character/tia4_encouraging.png" width="100" alt="티아 격려"> | <img src="../asset/character/tia5_relieved.png" width="100" alt="티아 안도"> |

### 관리자형 — SJ

| ID | 인물 | 성별 | 성향 | 핵심 설정 | 초기 상태 | 보정 스탯 | 캐릭터 img | img1 | img2 | img3 | img4 | img5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CH17 | 바론 | 남 | ISTJ | 성벽의 룬 수호 기사. 원칙과 책임 | 해금 | 솜씨 +10 / 표현력 -10 | <img src="../asset/character/baron0_fullbody.png" width="100" alt="바론 전신"> | <img src="../asset/character/baron1_base.png" width="100" alt="바론 기본"> | <img src="../asset/character/baron2_listening.png" width="100" alt="바론 경청"> | <img src="../asset/character/baron3_thinking.png" width="100" alt="바론 생각"> | <img src="../asset/character/baron4_encouraging.png" width="100" alt="바론 격려"> | <img src="../asset/character/baron5_relieved.png" width="100" alt="바론 안도"> |
| CH18 | 클레어 | 여 | ISTJ | 대서고의 수석 기록관. 기록의 정확성 | 해금 | 지식 +10 / 탐험 -10 | <img src="../asset/character/claire0_fullbody.png" width="100" alt="클레어 전신"> | <img src="../asset/character/claire1_base.png" width="100" alt="클레어 기본"> | <img src="../asset/character/claire2_listening.png" width="100" alt="클레어 경청"> | <img src="../asset/character/claire3_thinking.png" width="100" alt="클레어 생각"> | <img src="../asset/character/claire4_encouraging.png" width="100" alt="클레어 격려"> | <img src="../asset/character/claire5_relieved.png" width="100" alt="클레어 안도"> |
| CH19 | 요한 | 남 | ISFJ | 약초원과 온실의 보호자. 세심한 돌봄 | 해금 | 솜씨 +10 / 마법 -10 | <img src="../asset/character/johan0_fullbody.png" width="100" alt="요한 전신"> | <img src="../asset/character/johan1_base.png" width="100" alt="요한 기본"> | <img src="../asset/character/johan2_listening.png" width="100" alt="요한 경청"> | <img src="../asset/character/johan3_thinking.png" width="100" alt="요한 생각"> | <img src="../asset/character/johan4_encouraging.png" width="100" alt="요한 격려"> | <img src="../asset/character/johan5_relieved.png" width="100" alt="요한 안도"> |
| CH20 | 하젤 | 여 | ISFJ | 마음 치유실의 견습생. 인내와 포용 | 해금 | 지식 +10 / 탐험 -10 | <img src="../asset/character/hazel0_fullbody.png" width="100" alt="하젤 전신"> | <img src="../asset/character/hazel1_base.png" width="100" alt="하젤 기본"> | <img src="../asset/character/hazel2_listening.png" width="100" alt="하젤 경청"> | <img src="../asset/character/hazel3_thinking.png" width="100" alt="하젤 생각"> | <img src="../asset/character/hazel4_encouraging.png" width="100" alt="하젤 격려"> | <img src="../asset/character/hazel5_relieved.png" width="100" alt="하젤 안도"> |
| CH21 | 빅터 | 남 | ESTJ | 학원 풍기위원장. 공정과 질서 | 해금 | 지식 +10 / 탐험 -10 | <img src="../asset/character/victor0_fullbody.png" width="100" alt="빅터 전신"> | <img src="../asset/character/victor1_base.png" width="100" alt="빅터 기본"> | <img src="../asset/character/victor2_listening.png" width="100" alt="빅터 경청"> | <img src="../asset/character/victor3_thinking.png" width="100" alt="빅터 생각"> | <img src="../asset/character/victor4_encouraging.png" width="100" alt="빅터 격려"> | <img src="../asset/character/victor5_relieved.png" width="100" alt="빅터 안도"> |
| CH22 | 로렌 | 여 | ESTJ | 룬 마법 훈련 교관. 실력과 명확한 피드백 | 해금 | 솜씨 +10 / 표현력 -10 | <img src="../asset/character/lauren0_fullbody.png" width="100" alt="로렌 전신"> | <img src="../asset/character/lauren1_base.png" width="100" alt="로렌 기본"> | <img src="../asset/character/lauren2_listening.png" width="100" alt="로렌 경청"> | <img src="../asset/character/lauren3_thinking.png" width="100" alt="로렌 생각"> | <img src="../asset/character/lauren4_encouraging.png" width="100" alt="로렌 격려"> | <img src="../asset/character/lauren5_relieved.png" width="100" alt="로렌 안도"> |
| CH23 | 테오 | 남 | ESFJ | 기숙사 생활 반장. 소속감을 만드는 친구 | 해금 | 표현력 +10 / 지식 -10 | <img src="../asset/character/theo0_fullbody.png" width="100" alt="테오 전신"> | <img src="../asset/character/theo1_base.png" width="100" alt="테오 기본"> | <img src="../asset/character/theo2_listening.png" width="100" alt="테오 경청"> | <img src="../asset/character/theo3_thinking.png" width="100" alt="테오 생각"> | <img src="../asset/character/theo4_encouraging.png" width="100" alt="테오 격려"> | <img src="../asset/character/theo5_relieved.png" width="100" alt="테오 안도"> |
| CH24 | 미리엄 | 여 | ESFJ | 학원 축제 준비위원장. 꼼꼼한 조직력 | 해금 | 표현력 +10 / 마법 -10 | <img src="../asset/character/miriam0_fullbody.png" width="100" alt="미리엄 전신"> | <img src="../asset/character/miriam1_base.png" width="100" alt="미리엄 기본"> | <img src="../asset/character/miriam2_listening.png" width="100" alt="미리엄 경청"> | <img src="../asset/character/miriam3_thinking.png" width="100" alt="미리엄 생각"> | <img src="../asset/character/miriam4_encouraging.png" width="100" alt="미리엄 격려"> | <img src="../asset/character/miriam5_relieved.png" width="100" alt="미리엄 안도"> |

### 탐험가형 — SP

| ID | 인물 | 성별 | 성향 | 핵심 설정 | 초기 상태 | 보정 스탯 | 캐릭터 img | img1 | img2 | img3 | img4 | img5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CH25 | 렌 | 남 | ISTP | 무구 공방의 마석 조각사. 수리와 실천 | 해금 | 솜씨 +10 / 표현력 -10 | <img src="../asset/character/ren0_fullbody.png" width="100" alt="렌 전신"> | <img src="../asset/character/ren1_base.png" width="100" alt="렌 기본"> | <img src="../asset/character/ren2_listening.png" width="100" alt="렌 경청"> | <img src="../asset/character/ren3_thinking.png" width="100" alt="렌 생각"> | <img src="../asset/character/ren4_encouraging.png" width="100" alt="렌 격려"> | <img src="../asset/character/ren5_relieved.png" width="100" alt="렌 안도"> |
| CH26 | 다나 | 여 | ISTP | 룬 메커니즘 엔지니어. 기계적 직관 | 해금 | 마법 +10 / 표현력 -10 | <img src="../asset/character/dana0_fullbody.png" width="100" alt="다나 전신"> | <img src="../asset/character/dana1_base.png" width="100" alt="다나 기본"> | <img src="../asset/character/dana2_listening.png" width="100" alt="다나 경청"> | <img src="../asset/character/dana3_thinking.png" width="100" alt="다나 생각"> | <img src="../asset/character/dana4_encouraging.png" width="100" alt="다나 격려"> | <img src="../asset/character/dana5_relieved.png" width="100" alt="다나 안도"> |
| CH27 | 미엘 | 남 | ISFP | 아틀리에의 수채화가. 조용한 공감 | 해금 | 표현력 +10 / 지식 -10 | <img src="../asset/character/miel0_fullbody.png" width="100" alt="미엘 전신"> | <img src="../asset/character/miel1_base.png" width="100" alt="미엘 기본"> | <img src="../asset/character/miel2_listening.png" width="100" alt="미엘 경청"> | <img src="../asset/character/miel3_thinking.png" width="100" alt="미엘 생각"> | <img src="../asset/character/miel4_encouraging.png" width="100" alt="미엘 격려"> | <img src="../asset/character/miel5_relieved.png" width="100" alt="미엘 안도"> |
| CH28 | 실비아 | 여 | ISFP | 숲의 궁수와 바람의 추적자. 관찰과 집중 | 해금 | 탐험 +10 / 지식 -10 | <img src="../asset/character/sylvia0_fullbody.png" width="100" alt="실비아 전신"> | <img src="../asset/character/sylvia1_base.png" width="100" alt="실비아 기본"> | <img src="../asset/character/sylvia2_listening.png" width="100" alt="실비아 경청"> | <img src="../asset/character/sylvia3_thinking.png" width="100" alt="실비아 생각"> | <img src="../asset/character/sylvia4_encouraging.png" width="100" alt="실비아 격려"> | <img src="../asset/character/sylvia5_relieved.png" width="100" alt="실비아 안도"> |
| CH29 | 카일 | 남 | ESTP | 결투장의 펜싱 챔피언. 대담한 행동 | 해금 | 솜씨 +10 / 지식 -10 | <img src="../asset/character/kyle0_fullbody.png" width="100" alt="카일 전신"> | <img src="../asset/character/kyle1_base.png" width="100" alt="카일 기본"> | <img src="../asset/character/kyle2_listening.png" width="100" alt="카일 경청"> | <img src="../asset/character/kyle3_thinking.png" width="100" alt="카일 생각"> | <img src="../asset/character/kyle4_encouraging.png" width="100" alt="카일 격려"> | <img src="../asset/character/kyle5_relieved.png" width="100" alt="카일 안도"> |
| CH30 | 제나 | 여 | ESTP | 야생 조련사. 솔직하고 추진력 있음 | 해금 | 탐험 +10 / 지식 -10 | <img src="../asset/character/jena0_fullbody.png" width="100" alt="제나 전신"> | <img src="../asset/character/jena1_base.png" width="100" alt="제나 기본"> | <img src="../asset/character/jena2_listening.png" width="100" alt="제나 경청"> | <img src="../asset/character/jena3_thinking.png" width="100" alt="제나 생각"> | <img src="../asset/character/jena4_encouraging.png" width="100" alt="제나 격려"> | <img src="../asset/character/jena5_relieved.png" width="100" alt="제나 안도"> |
| CH31 | 니코 | 남 | ESFP | 무대 위의 환상 마술사. 유쾌한 쇼맨 | **기본 오픈** | 없음 | <img src="../asset/character/nico0_fullbody.png" width="100" alt="니코 전신"> | <img src="../asset/character/nico1_base.png" width="100" alt="니코 기본"> | <img src="../asset/character/nico2_listening.png" width="100" alt="니코 경청"> | <img src="../asset/character/nico3_thinking.png" width="100" alt="니코 생각"> | <img src="../asset/character/nico4_encouraging.png" width="100" alt="니코 격려"> | <img src="../asset/character/nico5_relieved.png" width="100" alt="니코 안도"> |
| CH32 | 리코 | 여 | ESFP | 빛의 리본 무희. 밝은 애정과 축제성 | 해금 | 표현력 +10 / 지식 -10 | <img src="../asset/character/rico0_fullbody.png" width="100" alt="리코 전신"> | <img src="../asset/character/rico1_base.png" width="100" alt="리코 기본"> | <img src="../asset/character/rico2_listening.png" width="100" alt="리코 경청"> | <img src="../asset/character/rico3_thinking.png" width="100" alt="리코 생각"> | <img src="../asset/character/rico4_encouraging.png" width="100" alt="리코 격려"> | <img src="../asset/character/rico5_relieved.png" width="100" alt="리코 안도"> |

## 보정 스탯 사용 기준

캐릭터 보정은 **초기 플레이 감각과 캐릭터성을 구분하기 위한 시작값 차이**입니다.

| 구분 | 처리 |
|---|---|
| 기본 오픈 6명 | 모든 성장 스탯 50, 보정 없음 |
| 해금 캐릭터 26명 | 한 스탯 +10, 한 스탯 -10, 나머지 3개는 50 |
| 체력 | 전 캐릭터 100으로 동일 시작 |
| 장기 성장 | 성장 스탯 공통 범위 0~500 |

수업의 종류와 수업별 성장량이 확정된 뒤 실제 플레이 테스트에서 `±10`의 체감이 지나치게 크거나 작으면 **보정 폭만 재조정**하고, 각 캐릭터의 강점·약점 방향은 유지합니다.

## 주요 안내·조력 인물

- **발렌티누스**는 룬과 세계를 알려주고 모험의 방향을 질문으로 제시하는 스승입니다. 플레이어가 발견해야 할 원인이나 해법을 먼저 밝히지 않습니다.
- **베른**은 데모 단계에서 펫 역할로 검토했던 이전 설정이며 **본편에는 등장하지 않습니다.** 본편은 별도의 펫 10마리를 수집·선택하는 구조를 사용합니다. 상세 기준은 [펫 시스템](content/03_COLLECTION_UNLOCKS/05_PET_SYSTEM.md)을 따릅니다.
- **시온(CH03)**은 학생 캐릭터이면서 이야기에서 대화·관계의 상대가 될 수 있습니다. 학생 32명과 별도 인물로 중복 계산하지 않습니다.

초기 캐릭터 문서에는 별도 선배 인물이 주요 인물로 적혀 있으나, 현재 통합 기획의 주요 역할 구성과 일치하지 않습니다. 새 이야기에서 사용할지 여부는 **검토 필요**로 둡니다. 등장 여부를 임의로 확정하지 마세요.

작성 당시 캐릭터 마스터·통합 기획·이미지 제작 기록을 참고했습니다. 해당 원문은 현재 저장소에 없어 상세 설정이나 선정 이력을 재확인하려면 별도 자료가 필요합니다.

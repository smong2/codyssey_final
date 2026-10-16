const roster = [
  {
    "id": "CH01",
    "name": "카엘",
    "gender": "male",
    "title": "그림자 도서관의 전략가",
    "strength": "작은 변화도 잘 알아차려요."
  },
  {
    "id": "CH02",
    "name": "세라",
    "gender": "female",
    "title": "별을 읽는 은둔 사제",
    "strength": "편견 없이 사건의 본질과 이면을 꿰뚫어 보는 통찰."
  },
  {
    "id": "CH03",
    "name": "시온",
    "gender": "male",
    "title": "룬 마법 이론 연구생",
    "strength": "통념을 완전히 뒤엎는 혁신적이고 창의적인 원리 증명."
  },
  {
    "id": "CH04",
    "name": "로엔",
    "gender": "female",
    "title": "잊혀진 고문서 해독가",
    "strength": "방대한 텍스트 속에서 숨겨진 암호와 연결고리를 찾는 집요한 분석력."
  },
  {
    "id": "CH05",
    "name": "레온",
    "gender": "male",
    "title": "아카데미 총학생회장",
    "strength": "사람들의 잠재력을 간파하고 적재적소에 배치하여 승리를 이끎."
  },
  {
    "id": "CH06",
    "name": "벨라",
    "gender": "female",
    "title": "룬 기사단 총지휘관",
    "strength": "극한의 위기에서도 흔들리지 않는 대담함과 강력한 추진력."
  },
  {
    "id": "CH07",
    "name": "유안",
    "gender": "male",
    "title": "기상천외한 마도 연금술사",
    "strength": "위기를 한순간에 유쾌한 기회로 뒤바꾸는 최고의 임기응변."
  },
  {
    "id": "CH08",
    "name": "아이리스",
    "gender": "female",
    "title": "시공간 왜곡 실험가",
    "strength": "실패를 겪어도 웃어넘기며 새로운 해결책을 창조해 냄."
  },
  {
    "id": "CH09",
    "name": "에녹",
    "gender": "male",
    "title": "은빛 호수의 은둔 예언자",
    "strength": "말하지 않아도 친구의 내면에 숨겨진 외로움과 상처를 보듬어 줌."
  },
  {
    "id": "CH10",
    "name": "엘리아",
    "gender": "female",
    "title": "정령의 목소리를 듣는 무녀",
    "strength": "얽힌 인간관계의 오해를 눈 녹듯 풀어내는 따뜻한 중재력."
  },
  {
    "id": "CH11",
    "name": "루카",
    "gender": "male",
    "title": "달빛을 노래하는 음유시인",
    "strength": "타인의 개성을 편견 없이 순수하게 존중해 줌."
  },
  {
    "id": "CH12",
    "name": "리네",
    "gender": "female",
    "title": "유리 온실의 식물 교감사",
    "strength": "곁에 있는 것만으로도 사람의 마음을 차분하게 가라앉히는 온화한 치유력."
  },
  {
    "id": "CH13",
    "name": "아드리안",
    "gender": "male",
    "title": "모두를 이끄는 마음의 등불",
    "strength": "소외된 이 하나 없이 모두를 하나의 따뜻한 공동체로 묶어냄."
  },
  {
    "id": "CH14",
    "name": "스텔라",
    "gender": "female",
    "title": "음악당의 조율사",
    "strength": "상대방의 사소한 장점도 놓치지 않고 칭찬하여 용기를 불어넣음."
  },
  {
    "id": "CH15",
    "name": "로빈",
    "gender": "male",
    "title": "바람을 쫓는 자유 유랑자",
    "strength": "처음 만난 사람과도 5분 만에 둘도 없는 친구가 되는 친화력."
  },
  {
    "id": "CH16",
    "name": "티아",
    "gender": "female",
    "title": "빛의 요정 소환사",
    "strength": "어두운 침묵과 절망을 순식간에 희망찬 축제로 뒤바꾸는 긍정의 힘."
  },
  {
    "id": "CH17",
    "name": "바론",
    "gender": "male",
    "title": "성벽의 룬 수호 기사",
    "strength": "가혹한 폭풍우 속에서도 맡은 자리와 의무를 결코 저버리지 않는 묵직함."
  },
  {
    "id": "CH18",
    "name": "클레어",
    "gender": "female",
    "title": "대서고의 수석 기록관",
    "strength": "방대한 사안 속에서 오류를 잡아내고 질서를 세우는 정밀함."
  },
  {
    "id": "CH19",
    "name": "요한",
    "gender": "male",
    "title": "약초원과 온실의 보호자",
    "strength": "친구들의 사소한 표정 변화와 불편을 기가 막히게 알아채고 보살핌."
  },
  {
    "id": "CH20",
    "name": "하젤",
    "gender": "female",
    "title": "마음 치유실의 견습생",
    "strength": "어떤 불안 속에서도 상대방에게 평온과 안정을 되찾아 주는 깊은 포용력."
  },
  {
    "id": "CH21",
    "name": "빅터",
    "gender": "male",
    "title": "학원 풍기위원장",
    "strength": "혼란과 분열에 빠진 집단을 강력한 통솔로 단숨에 정상화함."
  },
  {
    "id": "CH22",
    "name": "로렌",
    "gender": "female",
    "title": "룬 마법 훈련 교관",
    "strength": "두려움을 모르는 결단력과 명확한 피드백으로 동료를 성장시킴."
  },
  {
    "id": "CH23",
    "name": "테오",
    "gender": "male",
    "title": "기숙사 생활 반장",
    "strength": "구성원들의 갈등을 매끄럽게 중재하고 끈끈한 소속감을 심어줌."
  },
  {
    "id": "CH24",
    "name": "미리엄",
    "gender": "female",
    "title": "학원 축제 준비위원장",
    "strength": "꼼꼼한 조직력과 모든 사람을 품는 넉넉한 인심."
  },
  {
    "id": "CH25",
    "name": "렌",
    "gender": "male",
    "title": "무구 공방의 마석 조각사",
    "strength": "위기 상황에서 고장 난 도구를 즉석에서 수리하고 해결책을 만듦."
  },
  {
    "id": "CH26",
    "name": "다나",
    "gender": "female",
    "title": "룬 메커니즘 엔지니어",
    "strength": "냉철한 상황 판단력과 실용적인 문제 해결력."
  },
  {
    "id": "CH27",
    "name": "미엘",
    "gender": "male",
    "title": "아틀리에의 수채화가",
    "strength": "타인의 아픔을 편견 없이 수용하고 곁을 묵묵히 지켜주는 평화주의자."
  },
  {
    "id": "CH28",
    "name": "실비아",
    "gender": "female",
    "title": "숲의 궁수와 바람의 추적자",
    "strength": "탁월한 오감과 동물과의 교감 능력, 흔들림 없는 집중력."
  },
  {
    "id": "CH29",
    "name": "카일",
    "gender": "male",
    "title": "결투장의 펜싱 챔피언",
    "strength": "돌발적인 위험 속에서 주저 없이 몸을 던져 판도를 뒤엎는 순발력."
  },
  {
    "id": "CH30",
    "name": "제나",
    "gender": "female",
    "title": "맹수를 다루는 야생 조련사",
    "strength": "엄청난 행동력과 어떤 권위 앞에서도 주눅 들지 않는 배짱."
  },
  {
    "id": "CH31",
    "name": "니코",
    "gender": "male",
    "title": "무대 위의 환상 마술사",
    "strength": "어떤 냉랭하고 어색한 분위기도 단숨에 축제로 뒤바꿈."
  },
  {
    "id": "CH32",
    "name": "리코",
    "gender": "female",
    "title": "빛의 리본 무희",
    "strength": "주변 친구들에게 무조건적인 애정과 긍정적 찬사를 보냄."
  }
];

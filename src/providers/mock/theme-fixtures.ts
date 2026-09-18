import type { InvestmentTheme } from '../../domain/theme';

export type MockThemeFixture = Omit<
  InvestmentTheme,
  'relatedNewsCount' | 'source' | 'updatedAt'
>;

export const MOCK_THEME_FIXTURES = [
  {
    id: 'semiconductor',
    name: '반도체',
    description: '메모리, 연산 칩, 제조 장비와 소재로 이어지는 반도체 가치사슬을 살핍니다.',
    domesticStocks: [
      { symbol: '005930.KS', name: '삼성전자', relation: 'core' },
      { symbol: '000660.KS', name: 'SK하이닉스', relation: 'core' },
      { symbol: '058470.KS', name: '리노공업', relation: 'supply-chain' },
    ],
    usStocks: [
      { symbol: 'NVDA', name: 'NVIDIA', relation: 'core' },
      { symbol: 'AMAT', name: 'Applied Materials', relation: 'supply-chain' },
      { symbol: 'ANET', name: 'Arista Networks', relation: 'indirect-beneficiary' },
    ],
    catalysts: ['고대역폭 메모리 검증 진전', '첨단 공정 가동률 회복'],
    risks: ['재고 재축적 지연', '수출 규제 확대'],
    recentInterest: 92,
    shortTermMomentum: 'positive',
  },
  {
    id: 'ai-infrastructure',
    name: 'AI 인프라',
    description: '가속기, 네트워크, 서버와 클라우드 운영을 묶어 AI 연산 기반을 추적합니다.',
    domesticStocks: [
      { symbol: '000660.KS', name: 'SK하이닉스', relation: 'supply-chain' },
      { symbol: '035420.KS', name: 'NAVER', relation: 'core' },
    ],
    usStocks: [
      { symbol: 'NVDA', name: 'NVIDIA', relation: 'core' },
      { symbol: 'MSFT', name: 'Microsoft', relation: 'core' },
      { symbol: 'VRT', name: 'Vertiv', relation: 'indirect-beneficiary' },
    ],
    catalysts: ['추론 워크로드 증가', '클라우드 설비투자 확대'],
    risks: ['가속기 공급 병목', '투자 대비 수익성 검증 지연'],
    recentInterest: 96,
    shortTermMomentum: 'positive',
  },
  {
    id: 'electric-vehicle',
    name: '전기차',
    description: '완성차, 배터리, 충전 설비와 전력 반도체의 수요 변화를 함께 봅니다.',
    domesticStocks: [
      { symbol: '005380.KS', name: '현대차', relation: 'core' },
      { symbol: '006400.KS', name: '삼성SDI', relation: 'supply-chain' },
    ],
    usStocks: [
      { symbol: 'TSLA', name: 'Tesla', relation: 'core' },
      { symbol: 'ON', name: 'onsemi', relation: 'supply-chain' },
      { symbol: 'CHPT', name: 'ChargePoint', relation: 'indirect-beneficiary' },
    ],
    catalysts: ['보급형 모델 출시', '충전망 이용률 개선'],
    risks: ['가격 경쟁 심화', '배터리 원재료 변동성'],
    recentInterest: 68,
    shortTermMomentum: 'neutral',
  },
  {
    id: 'nuclear-power',
    name: '원전',
    description: '대형 원전과 소형 모듈 원자로의 설계, 기자재, 운영 생태계를 다룹니다.',
    domesticStocks: [
      { symbol: '034020.KS', name: '두산에너빌리티', relation: 'core' },
      { symbol: '052690.KS', name: '한전기술', relation: 'supply-chain' },
    ],
    usStocks: [
      { symbol: 'CEG', name: 'Constellation Energy', relation: 'core' },
      { symbol: 'GEV', name: 'GE Vernova', relation: 'supply-chain' },
      { symbol: 'CCJ', name: 'Cameco', relation: 'indirect-beneficiary' },
    ],
    catalysts: ['신규 건설 심사 진전', '전력 수요의 기저부하 확대'],
    risks: ['인허가 일정 지연', '건설비 상승'],
    recentInterest: 81,
    shortTermMomentum: 'positive',
  },
  {
    id: 'defense',
    name: '방산',
    description: '항공, 지상 체계, 정밀 유도와 감시 장비의 장기 수주 흐름을 살핍니다.',
    domesticStocks: [
      { symbol: '012450.KS', name: '한화에어로스페이스', relation: 'core' },
      { symbol: '079550.KS', name: 'LIG넥스원', relation: 'core' },
      { symbol: '047810.KS', name: '한국항공우주', relation: 'supply-chain' },
    ],
    usStocks: [
      { symbol: 'LMT', name: 'Lockheed Martin', relation: 'core' },
      { symbol: 'RTX', name: 'RTX', relation: 'supply-chain' },
    ],
    catalysts: ['수출 대상국 다변화', '무인 체계 도입 확대'],
    risks: ['수주 인식 시점 변동', '정책 및 지정학 의존도'],
    recentInterest: 87,
    shortTermMomentum: 'positive',
  },
  {
    id: 'robotics',
    name: '로봇',
    description: '산업 자동화, 협동 로봇, 물류 로봇과 센서 소프트웨어를 연결해 봅니다.',
    domesticStocks: [
      { symbol: '277810.KS', name: '레인보우로보틱스', relation: 'core' },
      { symbol: '035420.KS', name: 'NAVER', relation: 'indirect-beneficiary' },
    ],
    usStocks: [
      { symbol: 'ROK', name: 'Rockwell Automation', relation: 'core' },
      { symbol: 'AMZN', name: 'Amazon', relation: 'indirect-beneficiary' },
      { symbol: 'TER', name: 'Teradyne', relation: 'supply-chain' },
    ],
    catalysts: ['물류 자동화 투자', '협동 안전 규격 정립'],
    risks: ['도입 비용 회수 지연', '현장 안전 규제 강화'],
    recentInterest: 74,
    shortTermMomentum: 'positive',
  },
  {
    id: 'biotech',
    name: '바이오',
    description: '신약 연구, 위탁개발생산, 진단과 규제 일정의 불확실성을 중심으로 봅니다.',
    domesticStocks: [
      { symbol: '207940.KS', name: '삼성바이오로직스', relation: 'core' },
      { symbol: '068270.KS', name: '셀트리온', relation: 'core' },
    ],
    usStocks: [
      { symbol: 'REGN', name: 'Regeneron', relation: 'core' },
      { symbol: 'TMO', name: 'Thermo Fisher', relation: 'supply-chain' },
    ],
    catalysts: ['주요 임상 데이터 공개', '위탁생산 수주 확대'],
    risks: ['임상 실패 가능성', '약가와 규제 불확실성'],
    recentInterest: 61,
    shortTermMomentum: 'neutral',
  },
  {
    id: 'shipbuilding',
    name: '조선',
    description: '상선과 특수선 발주, 선가, 엔진과 친환경 개조 수요를 추적합니다.',
    domesticStocks: [
      { symbol: '009540.KS', name: 'HD한국조선해양', relation: 'core' },
      { symbol: '010140.KS', name: '삼성중공업', relation: 'core' },
      { symbol: '071970.KS', name: 'HD현대마린엔진', relation: 'supply-chain' },
    ],
    usStocks: [
      { symbol: 'HII', name: 'Huntington Ingalls', relation: 'core' },
      { symbol: 'CAT', name: 'Caterpillar', relation: 'indirect-beneficiary' },
    ],
    catalysts: ['친환경 선박 교체', '선가와 수주잔고 개선'],
    risks: ['후판 가격 상승', '인도 지연과 인력 부족'],
    recentInterest: 79,
    shortTermMomentum: 'positive',
  },
  {
    id: 'aerospace',
    name: '우주항공',
    description: '위성, 발사체, 항공 구조물과 지상 통신 인프라의 사업화를 살핍니다.',
    domesticStocks: [
      { symbol: '047810.KS', name: '한국항공우주', relation: 'core' },
      { symbol: '012450.KS', name: '한화에어로스페이스', relation: 'supply-chain' },
    ],
    usStocks: [
      { symbol: 'LMT', name: 'Lockheed Martin', relation: 'core' },
      { symbol: 'RKLB', name: 'Rocket Lab', relation: 'core' },
      { symbol: 'IRDM', name: 'Iridium', relation: 'indirect-beneficiary' },
    ],
    catalysts: ['소형 위성 발사 증가', '부품 인증 상호 인정'],
    risks: ['발사 실패', '긴 개발 주기와 자금 조달'],
    recentInterest: 77,
    shortTermMomentum: 'positive',
  },
  {
    id: 'data-center-power',
    name: '데이터센터 전력',
    description: '데이터센터의 송배전, 냉각, 에너지 저장과 전력 계약을 한 흐름으로 봅니다.',
    domesticStocks: [
      { symbol: '010120.KS', name: 'LS ELECTRIC', relation: 'supply-chain' },
      { symbol: '267260.KS', name: 'HD현대일렉트릭', relation: 'supply-chain' },
    ],
    usStocks: [
      { symbol: 'VRT', name: 'Vertiv', relation: 'core' },
      { symbol: 'ETN', name: 'Eaton', relation: 'supply-chain' },
      { symbol: 'MSFT', name: 'Microsoft', relation: 'indirect-beneficiary' },
    ],
    catalysts: ['데이터센터 전력 계약 증가', '고효율 냉각 교체 수요'],
    risks: ['전력망 연결 지연', '설비 과잉 투자'],
    recentInterest: 89,
    shortTermMomentum: 'positive',
  },
] as const satisfies readonly MockThemeFixture[];

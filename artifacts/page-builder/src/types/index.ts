export type SectionType =
  | "hero"
  | "problem"
  | "benefits"
  | "lifestyle"
  | "detail"
  | "comparison"
  | "trust"
  | "components"
  | "howto"
  | "cta";

export type SectionStatus = "idle" | "generating" | "done" | "error";

export interface SectionField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea";
  required?: boolean;
}

export interface SectionConfig {
  type: SectionType;
  num: number;
  title: string;
  description: string;
  fields: SectionField[];
  supportsImageUpload: boolean;
}

export interface Section {
  id: string;
  type: SectionType;
  userInputs: Record<string, string>;
  uploadedImages: string[];
  generatedPrompt: string;
  generatedImageUrl: string | null;
  status: SectionStatus;
}

export interface MasterStyle {
  designStyle: string;
  mainColor: string;
  backgroundStyle: string;
  fontMood: string;
  tone: string;
}

export interface Project {
  id: string;
  productName: string;
  brandName: string;
  category: string;
  targetCustomer: string;
  platform: string;
  masterStyle: MasterStyle;
  sections: Section[];
  createdAt: string;
}

export const SECTION_CONFIGS: SectionConfig[] = [
  {
    type: "hero",
    num: 1,
    title: "메인 히어로",
    description: "구매자가 첫 화면에서 상품의 매력을 즉시 느끼는 이미지",
    supportsImageUpload: true,
    fields: [
      {
        key: "mainCopy",
        label: "핵심 카피",
        placeholder: "예: 피부가 달라지는 7일의 기적",
        type: "text",
        required: true,
      },
      {
        key: "subCopy",
        label: "서브 카피",
        placeholder: "예: 매일 아침 3분으로 완성하는 건강한 피부 루틴",
        type: "textarea",
      },
    ],
  },
  {
    type: "problem",
    num: 2,
    title: "문제 제기 / 공감",
    description: "고객의 불편함에 공감하며 상품의 필요성을 느끼게 하는 영역",
    supportsImageUpload: false,
    fields: [
      {
        key: "painPoint",
        label: "고객의 고민",
        placeholder: "예: 세탁 후 줄어드는 니트, 이제 그만 고민하세요",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    type: "benefits",
    num: 3,
    title: "핵심 장점 3가지",
    description: "상품의 강점을 카드형으로 명확하게 전달",
    supportsImageUpload: false,
    fields: [
      {
        key: "benefit1",
        label: "장점 1",
        placeholder: "예: 국내산 프리미엄 원단 사용",
        type: "text",
        required: true,
      },
      {
        key: "benefit2",
        label: "장점 2",
        placeholder: "예: 세탁 후에도 형태 유지",
        type: "text",
        required: true,
      },
      {
        key: "benefit3",
        label: "장점 3",
        placeholder: "예: 사계절 내내 착용 가능한 두께",
        type: "text",
        required: true,
      },
    ],
  },
  {
    type: "lifestyle",
    num: 4,
    title: "사용 장면 / 라이프스타일",
    description: "실제 생활 속에서 자연스럽게 사용되는 감성 이미지",
    supportsImageUpload: true,
    fields: [
      {
        key: "usePlace",
        label: "사용 장소",
        placeholder: "예: 집, 사무실, 카페, 야외",
        type: "text",
        required: true,
      },
      {
        key: "useCase",
        label: "사용 상황",
        placeholder: "예: 주말 홈카페에서 여유롭게 즐기는 모습",
        type: "textarea",
      },
    ],
  },
  {
    type: "detail",
    num: 5,
    title: "디테일 강조",
    description: "소재, 마감, 기능 등 제품의 세부 특징을 확대컷으로 표현",
    supportsImageUpload: true,
    fields: [
      {
        key: "detail1",
        label: "강조 디테일 1",
        placeholder: "예: 더블 스티치 마감으로 내구성 강화",
        type: "text",
        required: true,
      },
      {
        key: "detail2",
        label: "강조 디테일 2",
        placeholder: "예: 피부에 닿는 안감은 100% 면 소재",
        type: "text",
      },
      {
        key: "detail3",
        label: "강조 디테일 3",
        placeholder: "예: 세탁기 사용 가능한 특수 처리",
        type: "text",
      },
    ],
  },
  {
    type: "comparison",
    num: 6,
    title: "비교 / 차별점",
    description: "기존 제품과의 차이를 직관적으로 보여주는 비교 이미지",
    supportsImageUpload: false,
    fields: [
      {
        key: "normalProductProblem",
        label: "일반 제품의 문제점",
        placeholder: "예: 한 번 세탁에 늘어나고 색이 바래는 저가 니트",
        type: "textarea",
        required: true,
      },
      {
        key: "ourDifference",
        label: "우리 제품의 차별점",
        placeholder: "예: 20번 세탁 후에도 처음 그대로의 형태와 색감",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    type: "trust",
    num: 7,
    title: "신뢰 요소",
    description: "브랜드와 상품에 대한 신뢰감을 형성하는 영역",
    supportsImageUpload: false,
    fields: [
      {
        key: "trustPoint",
        label: "신뢰 요소",
        placeholder:
          "예: 국내 자체 제작 / KC인증 완료 / 3년 연속 베스트셀러 / 누적 판매 10만 개",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    type: "components",
    num: 8,
    title: "구성품 / 옵션 안내",
    description: "포함된 구성품이나 선택 옵션을 카드형으로 정리",
    supportsImageUpload: true,
    fields: [
      {
        key: "componentsList",
        label: "구성품 목록",
        placeholder:
          "예: 본품 1개 / 파우치 1개 / 설명서 1부 / 사은품 미니 샘플 3종",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    type: "howto",
    num: 9,
    title: "사용 방법",
    description: "1·2·3단계로 쉽게 이해할 수 있는 사용 가이드",
    supportsImageUpload: false,
    fields: [
      {
        key: "step1",
        label: "1단계",
        placeholder: "예: 클렌징 후 피부결을 정리해 주세요",
        type: "text",
        required: true,
      },
      {
        key: "step2",
        label: "2단계",
        placeholder: "예: 적당량을 덜어 얼굴 전체에 고르게 펴 발라요",
        type: "text",
        required: true,
      },
      {
        key: "step3",
        label: "3단계",
        placeholder: "예: 가볍게 두드려 흡수시키면 완성!",
        type: "text",
        required: true,
      },
    ],
  },
  {
    type: "cta",
    num: 10,
    title: "구매 마무리 CTA",
    description: "브랜드 신뢰와 구매 확신을 주는 마지막 유도 문구",
    supportsImageUpload: false,
    fields: [
      {
        key: "closingCopy",
        label: "마무리 문구",
        placeholder: "예: 지금 이 순간, 당신의 피부에 진짜 변화를 선물하세요",
        type: "textarea",
        required: true,
      },
    ],
  },
];

export const DESIGN_STYLES = [
  { value: "premium-minimal", label: "프리미엄 미니멀" },
  { value: "lifestyle-emotional", label: "감성 라이프스타일" },
  { value: "sales-driven", label: "강한 매출형" },
  { value: "clean-info", label: "깔끔한 정보형" },
  { value: "kids-cute", label: "키즈 / 귀여운 스타일" },
  { value: "traditional-luxury", label: "전통 / 고급 브랜드 스타일" },
];

export const BACKGROUND_STYLES = [
  { value: "white", label: "화이트" },
  { value: "light-gray", label: "연그레이" },
  { value: "warm-beige", label: "따뜻한 베이지" },
  { value: "luxury-black", label: "고급 블랙" },
  { value: "lifestyle-natural", label: "자연광 라이프스타일" },
];

export const FONT_MOODS = [
  { value: "clean-gothic", label: "깔끔한 고딕" },
  { value: "soft-emotional", label: "부드러운 감성체" },
  { value: "luxury-serif", label: "고급 세리프 느낌" },
  { value: "bold-ad", label: "강한 광고형 굵은 글씨" },
];

export const TONES = [
  { value: "trust", label: "신뢰감" },
  { value: "luxury", label: "고급스러움" },
  { value: "cute", label: "귀여움" },
  { value: "practical", label: "실용적" },
  { value: "gift", label: "선물용 감성" },
  { value: "professional", label: "전문가 느낌" },
];

export const CATEGORIES = [
  "패션/의류",
  "뷰티/화장품",
  "식품/건강",
  "가전/디지털",
  "생활/주방",
  "스포츠/레저",
  "유아/아동",
  "반려동물",
  "문구/사무",
  "인테리어/가구",
  "기타",
];

export const PLATFORMS = [
  { value: "smartstore", label: "네이버 스마트스토어" },
  { value: "coupang", label: "쿠팡" },
  { value: "own-mall", label: "자사몰" },
  { value: "instagram", label: "인스타 광고용" },
  { value: "other", label: "기타" },
];

export const TARGET_CUSTOMERS = [
  "20대 여성",
  "20대 남성",
  "30대 여성",
  "30대 남성",
  "40대 여성",
  "40대 남성",
  "50대 이상",
  "10대",
  "영유아 부모",
  "직장인",
  "주부",
  "운동/건강 관심자",
  "반려동물 보호자",
];

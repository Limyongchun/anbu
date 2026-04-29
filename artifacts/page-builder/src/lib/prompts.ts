import type { Project, Section, SectionType } from "@/types";

function masterPrompt(project: Project): string {
  const styleLabels: Record<string, string> = {
    "premium-minimal": "프리미엄 미니멀",
    "lifestyle-emotional": "감성 라이프스타일",
    "sales-driven": "강한 매출형",
    "clean-info": "깔끔한 정보형",
    "kids-cute": "키즈/귀여운 스타일",
    "traditional-luxury": "전통/고급 브랜드 스타일",
  };
  const bgLabels: Record<string, string> = {
    white: "화이트 배경",
    "light-gray": "연그레이 배경",
    "warm-beige": "따뜻한 베이지 배경",
    "luxury-black": "고급 블랙 배경",
    "lifestyle-natural": "자연광 라이프스타일 배경",
  };
  const fontLabels: Record<string, string> = {
    "clean-gothic": "깔끔한 고딕체",
    "soft-emotional": "부드러운 감성체",
    "luxury-serif": "고급 세리프 느낌",
    "bold-ad": "강한 광고형 굵은 글씨",
  };
  const toneLabels: Record<string, string> = {
    trust: "신뢰감",
    luxury: "고급스러움",
    cute: "귀여움",
    practical: "실용적",
    gift: "선물용 감성",
    professional: "전문가 느낌",
  };

  const { masterStyle: s } = project;

  return `[공통 마스터 설정]
이 이미지는 상품 상세페이지의 한 섹션입니다.
전체 상세페이지와 디자인 톤이 일관되어야 합니다.
브랜드명: ${project.brandName}
상품명: ${project.productName}
카테고리: ${project.category}
타깃 고객: ${project.targetCustomer}
디자인 스타일: ${styleLabels[s.designStyle] ?? s.designStyle}
대표 컬러: ${s.mainColor}
배경 스타일: ${bgLabels[s.backgroundStyle] ?? s.backgroundStyle}
서체 느낌: ${fontLabels[s.fontMood] ?? s.fontMood}
전체 분위기: ${toneLabels[s.tone] ?? s.tone}
이미지 규격: 가로 860px 기준의 세로형 섹션 이미지 (세로 900~1600px)
한글 문구는 크고 선명하게 배치합니다.
오탈자 없이 짧고 강한 문구만 사용합니다.
여백이 충분하고 모바일에서도 잘 읽혀야 합니다.`;
}

const sectionTemplates: Record<
  SectionType,
  (inputs: Record<string, string>, master: string) => string
> = {
  hero: (inputs, master) => `${master}

[섹션 1 - 메인 히어로 이미지]
상품 대표 이미지와 핵심 카피를 중심으로 구매자가 첫 화면에서 상품의 매력을 즉시 느끼게 하는 프리미엄 상세페이지 메인 히어로 이미지를 제작합니다.
상품이 가장 돋보이도록 중앙 또는 대각선 구도로 배치합니다.
상단에는 강한 헤드라인을 넣고, 하단에는 짧은 서브카피를 넣습니다.
과한 장식은 피하고 브랜드 신뢰감과 구매욕구를 동시에 만듭니다.

핵심 카피: ${inputs.mainCopy ?? ""}
서브 카피: ${inputs.subCopy ?? ""}`,

  problem: (inputs, master) => `${master}

[섹션 2 - 문제 제기 / 공감 영역]
고객이 이 상품을 필요로 하는 상황을 공감형으로 표현합니다.
문제 상황을 너무 부정적으로 표현하지 말고, '이런 고민이 있다면' 정도의 부드러운 흐름으로 만듭니다.
간단한 문구와 상황 이미지로 구성합니다.

고객 고민: ${inputs.painPoint ?? ""}`,

  benefits: (inputs, master) => `${master}

[섹션 3 - 핵심 장점 3가지]
상품의 핵심 장점 3가지를 카드형 레이아웃으로 표현합니다.
각 장점은 짧은 제목과 한 줄 설명으로 구성합니다.
아이콘 또는 미니 일러스트를 함께 배치합니다.
전체적으로 깔끔하고 신뢰감 있게 구성합니다.

장점 1: ${inputs.benefit1 ?? ""}
장점 2: ${inputs.benefit2 ?? ""}
장점 3: ${inputs.benefit3 ?? ""}`,

  lifestyle: (inputs, master) => `${master}

[섹션 4 - 사용 장면 / 라이프스타일 이미지]
상품이 실제 생활 속에서 사용되는 장면을 자연스럽게 보여줍니다.
라이프스타일 이미지처럼 감성적으로 연출하되 상품이 명확히 보이게 합니다.
사용자는 상품의 크기, 분위기, 활용 상황을 직관적으로 이해해야 합니다.

사용 장소: ${inputs.usePlace ?? ""}
사용 상황: ${inputs.useCase ?? ""}`,

  detail: (inputs, master) => `${master}

[섹션 5 - 디테일 강조]
상품의 소재, 마감, 구조, 기능적 디테일을 확대컷처럼 보여줍니다.
디테일 라벨을 2~3개 정도 짧게 넣습니다.
전문적이고 신뢰감 있는 제품 설명 이미지로 구성합니다.

강조 디테일 1: ${inputs.detail1 ?? ""}
강조 디테일 2: ${inputs.detail2 ?? ""}
강조 디테일 3: ${inputs.detail3 ?? ""}`,

  comparison: (inputs, master) => `${master}

[섹션 6 - 비교 / 차별점]
기존 제품과 이 상품의 차별점을 쉽게 이해할 수 있도록 표현합니다.
좌우 비교 또는 Before/After 느낌으로 구성합니다.
비교 문구는 짧고 명확해야 합니다.

일반 제품 문제점: ${inputs.normalProductProblem ?? ""}
우리 제품 차별점: ${inputs.ourDifference ?? ""}`,

  trust: (inputs, master) => `${master}

[섹션 7 - 신뢰 요소]
브랜드와 상품에 대한 신뢰를 주는 섹션을 제작합니다.
국내 제조, 자체 제작, 오랜 경험, 검수 과정, 소재 신뢰성 등을 고급스럽고 차분하게 표현합니다.

신뢰 요소: ${inputs.trustPoint ?? ""}`,

  components: (inputs, master) => `${master}

[섹션 8 - 구성품 / 옵션 안내]
상품 구성품이나 옵션을 보기 쉽게 정리합니다.
각 구성품은 이미지 카드 형태로 보여줍니다.
복잡한 표보다는 심플한 카드형 레이아웃을 사용합니다.

구성품 목록: ${inputs.componentsList ?? ""}`,

  howto: (inputs, master) => `${master}

[섹션 9 - 사용 방법]
사용 방법을 1, 2, 3단계로 쉽게 보여줍니다.
각 단계는 작은 이미지와 짧은 문장으로 구성합니다.
초보자도 바로 이해할 수 있게 만듭니다.

1단계: ${inputs.step1 ?? ""}
2단계: ${inputs.step2 ?? ""}
3단계: ${inputs.step3 ?? ""}`,

  cta: (inputs, master) => `${master}

[섹션 10 - 구매 마무리 CTA]
상세페이지 마지막 구매 유도 섹션을 제작합니다.
강한 할인 느낌보다는 브랜드 신뢰와 구매 확신을 주는 방향으로 구성합니다.
마지막 문구는 짧고 감성적이어야 합니다.

마무리 문구: ${inputs.closingCopy ?? ""}`,
};

export function generatePrompt(project: Project, section: Section): string {
  const master = masterPrompt(project);
  const template = sectionTemplates[section.type];
  return template(section.userInputs, master);
}

export function truncateInputs(
  inputs: Record<string, string>,
  maxLength = 100,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(inputs)) {
    result[key] = value.length > maxLength ? value.slice(0, maxLength) + "…" : value;
  }
  return result;
}

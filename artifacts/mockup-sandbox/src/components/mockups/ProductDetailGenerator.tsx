import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Upload,
  ImagePlus,
  Wand2,
  ChevronRight,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";

type Step = "input" | "generating" | "result";

const EXAMPLE_PROMPTS = [
  "여름 신상 린넨 반팔 셔츠, 남성용, 화이트/네이비 2가지 컬러",
  "유기농 콜드브루 원두 커피 200g, 에티오피아 예가체프",
  "무선 노이즈캔슬링 이어폰, 블루투스 5.3, 배터리 30시간",
];

const GENERATED_SECTIONS = [
  {
    label: "헤드라인",
    content: "완벽한 여름을 완성하는 린넨 터치, 시원함이 스타일이 되다",
  },
  {
    label: "서브 카피",
    content:
      "천연 린넨 소재가 선사하는 통기성과 세련된 실루엣. 일상과 외출 어디서든 당신의 여름을 업그레이드하세요.",
  },
  {
    label: "주요 특징",
    content:
      "• 100% 천연 린넨 소재로 여름철 쾌적한 착용감\n• 루즈핏 실루엣으로 활동성과 스타일 동시에\n• 화이트 / 네이비 2가지 컬러로 다양한 코디 연출\n• 단추 디테일로 포인트를 준 클래식한 디자인\n• 가정세탁 가능, 관리가 편리한 소재",
  },
  {
    label: "추천 대상",
    content:
      "더운 여름에도 스타일을 포기하지 않는 분 / 편안하고 자연스러운 캐주얼룩을 선호하는 분 / 여행과 일상 모두에서 활용도 높은 아이템을 찾는 분",
  },
  {
    label: "SEO 태그",
    content:
      "#린넨셔츠 #여름셔츠 #남성셔츠 #여름신상 #캐주얼룩 #린넨패션 #시원한옷 #여름코디",
  },
];

function InputStep({
  value,
  onChange,
  onGenerate,
}: {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          상품 정보 입력
        </label>
        <Textarea
          placeholder="상품명, 카테고리, 소재, 색상, 주요 특징 등을 자유롭게 입력하세요.&#10;예) 여름 신상 린넨 반팔 셔츠, 남성용, 화이트/네이비 2가지 컬러"
          className="min-h-[140px] resize-none text-sm leading-relaxed bg-white border-gray-200 focus:border-violet-400 focus:ring-violet-400/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-medium">입력 예시</p>
        <div className="flex flex-col gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onChange(prompt)}
              className="text-left text-xs text-gray-500 bg-gray-50 hover:bg-violet-50 hover:text-violet-700 border border-gray-100 hover:border-violet-200 rounded-lg px-3 py-2.5 transition-all duration-150 leading-relaxed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Upload size={13} />
          <span>상품 이미지 첨부 (선택)</span>
        </div>
        <button className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-violet-300 rounded-xl py-5 text-gray-400 hover:text-violet-500 transition-all duration-150 bg-gray-50 hover:bg-violet-50/30">
          <ImagePlus size={18} />
          <span className="text-sm">이미지를 드래그하거나 클릭하여 업로드</span>
        </button>
      </div>

      <Button
        onClick={onGenerate}
        disabled={!value.trim()}
        className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm shadow-violet-200"
      >
        <Wand2 size={16} />
        AI 상세페이지 생성
      </Button>
    </div>
  );
}

function GeneratingStep() {
  const steps = [
    "상품 정보 분석 중...",
    "타겟 고객군 추출 중...",
    "카피라이팅 생성 중...",
    "SEO 최적화 태그 생성 중...",
  ];
  const [current] = useState(1);

  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center">
          <Sparkles size={32} className="text-violet-600 animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
      </div>

      <div className="flex flex-col gap-3 w-full">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              i < current
                ? "bg-violet-50 text-violet-700"
                : i === current
                  ? "bg-violet-100 text-violet-800 font-medium"
                  : "bg-gray-50 text-gray-400"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                i < current
                  ? "bg-violet-400"
                  : i === current
                    ? "bg-violet-600 animate-pulse"
                    : "bg-gray-300"
              }`}
            />
            <span className="text-sm">{step}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        보통 10~20초 정도 소요됩니다
      </p>
    </div>
  );
}

function ResultStep({ onReset }: { onReset: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (label: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-600" />
          <span className="text-sm font-semibold text-gray-800">
            생성 완료
          </span>
          <Badge
            variant="secondary"
            className="text-xs bg-violet-100 text-violet-700 border-0"
          >
            {GENERATED_SECTIONS.length}개 섹션
          </Badge>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RotateCcw size={13} />
          다시 생성
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {GENERATED_SECTIONS.map((section, i) => (
          <div key={section.label}>
            {i > 0 && <Separator className="mb-3 bg-gray-100" />}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                  {section.label}
                </span>
                <button
                  onClick={() => handleCopy(section.label, section.content)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {copied === section.label ? (
                    <>
                      <Check size={12} className="text-green-500" />
                      <span className="text-green-500">복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      복사
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-11 text-sm border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
          onClick={onReset}
        >
          <RotateCcw size={14} className="mr-1.5" />
          처음부터
        </Button>
        <Button className="flex-1 h-11 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm shadow-violet-200">
          전체 복사
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default function ProductDetailGenerator() {
  const [step, setStep] = useState<Step>("input");
  const [inputValue, setInputValue] = useState("");

  const handleGenerate = () => {
    setStep("generating");
    setTimeout(() => setStep("result"), 2800);
  };

  const handleReset = () => {
    setStep("input");
    setInputValue("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              AI 상세페이지 생성기
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              상품 정보를 입력하면 AI가 판매 문구를 완성해드립니다
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-1">
            {(["input", "generating", "result"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-6 bg-violet-600"
                    : i < ["input", "generating", "result"].indexOf(step)
                      ? "w-1.5 bg-violet-300"
                      : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100/80 border border-gray-100 p-6">
          {step === "input" && (
            <InputStep
              value={inputValue}
              onChange={setInputValue}
              onGenerate={handleGenerate}
            />
          )}
          {step === "generating" && <GeneratingStep />}
          {step === "result" && <ResultStep onReset={handleReset} />}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          AI가 생성한 문구는 검토 후 사용하세요
        </p>
      </div>
    </div>
  );
}

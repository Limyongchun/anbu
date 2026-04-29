import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, FileImage, Check } from "lucide-react";
import { useStore } from "@/store/projectStore";
import {
  DESIGN_STYLES,
  BACKGROUND_STYLES,
  FONT_MOODS,
  TONES,
  type MasterStyle,
} from "@/types";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#2D3748",
  "#1A202C",
  "#744210",
  "#276749",
  "#2B6CB0",
  "#702459",
  "#C05621",
  "#285E61",
  "#553C9A",
  "#2D3748",
  "#1A1A2E",
  "#FF6B6B",
];

export default function StylePage() {
  const [, navigate] = useLocation();
  const { state, dispatch, currentProject } = useStore();

  const [style, setStyle] = useState<MasterStyle>({
    designStyle: "premium-minimal",
    mainColor: "#2D3748",
    backgroundStyle: "white",
    fontMood: "clean-gothic",
    tone: "trust",
  });

  useEffect(() => {
    if (currentProject) {
      setStyle(currentProject.masterStyle);
    }
  }, [currentProject?.id]);

  if (!currentProject) {
    navigate("/");
    return null;
  }

  function set<K extends keyof MasterStyle>(key: K, value: MasterStyle[K]) {
    setStyle((s) => ({ ...s, [key]: value }));
  }

  function handleNext() {
    dispatch({
      type: "UPDATE_MASTER_STYLE",
      id: currentProject!.id,
      style,
    });
    navigate(`/project/${currentProject!.id}/editor`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4">
        <button
          onClick={() => navigate("/create")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <FileImage className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900">
            AI 상세페이지 빌더
          </span>
        </div>
        <span className="ml-2 text-sm text-gray-400">
          {currentProject.productName}
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-400">STEP 2/2</span>
            <div className="flex gap-1.5">
              <div className="w-8 h-1.5 bg-gray-900 rounded-full" />
              <div className="w-8 h-1.5 bg-gray-900 rounded-full" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">마스터 디자인 설정</h1>
          <p className="text-gray-500 mt-1 text-sm">
            모든 섹션에 일관되게 적용될 브랜드 스타일을 설정하세요
          </p>
        </div>

        <div className="space-y-6">
          <Section title="디자인 스타일">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DESIGN_STYLES.map((ds) => (
                <button
                  key={ds.value}
                  onClick={() => set("designStyle", ds.value)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all",
                    style.designStyle === ds.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400",
                  )}
                >
                  {ds.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="대표 컬러">
            <div className="flex flex-wrap gap-3 items-center">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => set("mainColor", color)}
                  style={{ backgroundColor: color }}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all border-2",
                    style.mainColor === color
                      ? "border-white ring-2 ring-gray-900 scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                >
                  {style.mainColor === color && (
                    <Check className="w-3 h-3 text-white mx-auto" />
                  )}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-gray-500">직접 입력:</span>
                <input
                  type="color"
                  value={style.mainColor}
                  onChange={(e) => set("mainColor", e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                />
                <span className="text-sm font-mono text-gray-600">
                  {style.mainColor}
                </span>
              </div>
            </div>
          </Section>

          <Section title="배경 스타일">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BACKGROUND_STYLES.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => set("backgroundStyle", bg.value)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all",
                    style.backgroundStyle === bg.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400",
                  )}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="서체 느낌">
            <div className="grid grid-cols-2 gap-3">
              {FONT_MOODS.map((fm) => (
                <button
                  key={fm.value}
                  onClick={() => set("fontMood", fm.value)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all",
                    style.fontMood === fm.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400",
                  )}
                >
                  {fm.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="전체 톤">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set("tone", t.value)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all",
                    style.tone === t.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Section>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={() => navigate("/create")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            이전
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            섹션 제작 시작하기
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

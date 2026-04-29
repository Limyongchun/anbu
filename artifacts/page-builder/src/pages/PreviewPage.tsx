import { useRef } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Download,
  FileImage,
  ImageDown,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { useProject, useStore } from "@/store/projectStore";
import { SECTION_CONFIGS, type Section } from "@/types";
import { cn, downloadImage, stitchImages, getSectionColor } from "@/lib/utils";

export default function PreviewPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { dispatch } = useStore();
  const project = useProject(params.id);
  const previewRef = useRef<HTMLDivElement>(null);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">프로젝트를 찾을 수 없습니다</p>
      </div>
    );
  }

  const p = project;
  const doneSections = p.sections.filter(
    (s) => s.status === "done" && s.generatedImageUrl,
  );
  const total = p.sections.length;
  const doneCount = doneSections.length;

  async function handleDownloadAll() {
    const urls = doneSections
      .map((s) => s.generatedImageUrl)
      .filter(Boolean) as string[];
    if (urls.length === 0) {
      alert("생성된 이미지가 없습니다. 먼저 섹션 이미지를 만들어 주세요.");
      return;
    }
    try {
      const combined = await stitchImages(urls);
      downloadImage(combined, `${p.productName}_상세페이지.png`);
    } catch {
      alert("이미지 합치기에 실패했습니다.");
    }
  }

  function handleDownloadSection(section: Section) {
    if (!section.generatedImageUrl) return;
    const config = SECTION_CONFIGS.find((c) => c.type === section.type);
    downloadImage(
      section.generatedImageUrl,
      `${p.productName}_${config?.title ?? section.type}.png`,
    );
  }

  function handleGoToEditor(sectionIndex: number) {
    dispatch({ type: "SET_CURRENT", id: p.id });
    dispatch({ type: "SET_SECTION_INDEX", index: sectionIndex });
    navigate(`/project/${p.id}/editor`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate(`/project/${p.id}/editor`)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center">
            <FileImage className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">
              {p.productName}
            </span>
            <span className="text-xs text-gray-400 ml-2">전체 미리보기</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {doneCount}/{total} 섹션 완성
          </span>
          <button
            onClick={handleDownloadAll}
            disabled={doneCount === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              doneCount > 0
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            <Download className="w-4 h-4" />
            전체 다운로드
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Full preview strip */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  전체 상세페이지
                </h2>
                <span className="text-xs text-gray-400">860px 기준</span>
              </div>
              <div ref={previewRef} className="overflow-y-auto max-h-[80vh]">
                {p.sections.map((section, idx) => {
                  const config = SECTION_CONFIGS.find(
                    (c) => c.type === section.type,
                  )!;
                  const color = getSectionColor(section.type);

                  return (
                    <div
                      key={section.id}
                      className="relative group border-b border-gray-100 last:border-b-0"
                    >
                      {section.generatedImageUrl ? (
                        <img
                          src={section.generatedImageUrl}
                          alt={config.title}
                          className="w-full block"
                        />
                      ) : (
                        <div
                          className="flex flex-col items-center justify-center py-16 px-8"
                          style={{ backgroundColor: color + "15" }}
                        >
                          {section.status === "generating" ? (
                            <>
                              <Loader2
                                className="w-6 h-6 animate-spin mb-2"
                                style={{ color }}
                              />
                              <p className="text-sm" style={{ color }}>
                                생성 중...
                              </p>
                            </>
                          ) : (
                            <>
                              <p
                                className="text-sm font-semibold mb-1"
                                style={{ color }}
                              >
                                {idx + 1}. {config.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                아직 이미지가 생성되지 않았습니다
                              </p>
                              <button
                                onClick={() => handleGoToEditor(idx)}
                                className="mt-3 text-xs underline underline-offset-2 text-gray-500 hover:text-gray-700"
                              >
                                편집하러 가기
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGoToEditor(idx)}
                            className="bg-white text-gray-900 text-xs px-3 py-1.5 rounded-lg font-medium shadow-sm hover:bg-gray-50 transition-colors"
                          >
                            편집
                          </button>
                          {section.generatedImageUrl && (
                            <button
                              onClick={() => handleDownloadSection(section)}
                              className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-sm hover:bg-gray-800 transition-colors flex items-center gap-1"
                            >
                              <ImageDown className="w-3 h-3" />
                              저장
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Section list & status */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">섹션 현황</h2>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>완성도</span>
                    <span>
                      {doneCount}/{total}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all"
                      style={{
                        width: `${total > 0 ? (doneCount / total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {p.sections.map((section, idx) => {
                  const config = SECTION_CONFIGS.find(
                    (c) => c.type === section.type,
                  )!;

                  return (
                    <div
                      key={section.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleGoToEditor(idx)}
                    >
                      <div className="flex-shrink-0">
                        {section.status === "done" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : section.status === "generating" ? (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {idx + 1}. {config.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {section.status === "done"
                            ? "완성"
                            : section.status === "generating"
                              ? "생성 중"
                              : "대기"}
                        </p>
                      </div>
                      {section.generatedImageUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSection(section);
                          }}
                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <ImageDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {doneCount > 0 && (
              <button
                onClick={handleDownloadAll}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                전체 이미지 다운로드 (PNG)
              </button>
            )}

            {doneCount < total && (
              <button
                onClick={() => navigate(`/project/${p.id}/editor`)}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                나머지 {total - doneCount}개 섹션 완성하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

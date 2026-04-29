import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Eye,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ImagePlus,
  X,
  FileImage,
  Loader2,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { useProject, useStore } from "@/store/projectStore";
import { SECTION_CONFIGS, type Section, type SectionType } from "@/types";
import { generatePrompt } from "@/lib/prompts";
import {
  cn,
  fileToDataUrl,
  generatePlaceholderDataUrl,
  getSectionColor,
} from "@/lib/utils";

const STATUS_ICON: Record<Section["status"], React.ReactNode> = {
  idle: null,
  generating: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  error: <span className="text-red-400 text-xs">!</span>,
};

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { state, dispatch } = useStore();
  const project = useProject(params.id);

  const currentIndex = state.currentSectionIndex;

  useEffect(() => {
    if (project && state.currentProjectId !== project.id) {
      dispatch({ type: "SET_CURRENT", id: project.id });
    }
  }, [project?.id]);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">프로젝트를 찾을 수 없습니다</p>
          <button
            onClick={() => navigate("/")}
            className="text-gray-900 underline text-sm"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const section = project.sections[currentIndex];

  function selectSection(index: number) {
    dispatch({ type: "SET_SECTION_INDEX", index });
  }

  function moveSection(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= project!.sections.length) return;
    dispatch({
      type: "REORDER_SECTIONS",
      projectId: project!.id,
      fromIndex,
      toIndex,
    });
    dispatch({ type: "SET_SECTION_INDEX", index: toIndex });
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => navigate("/")}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
            <FileImage className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {project.productName}
          </span>
          <span className="text-xs text-gray-400">· {project.brandName}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() =>
              navigate(`/project/${project.id}/style`)
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            스타일 수정
          </button>
          <button
            onClick={() => navigate(`/project/${project.id}/preview`)}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            전체 미리보기
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Section List */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              섹션 목록
            </p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {project.sections.map((sec, idx) => {
              const config = SECTION_CONFIGS.find((c) => c.type === sec.type);
              return (
                <div
                  key={sec.id}
                  onClick={() => selectSection(idx)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors group relative",
                    currentIndex === idx
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-50 text-gray-700",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-mono w-5 flex-shrink-0",
                      currentIndex === idx ? "text-gray-400" : "text-gray-400",
                    )}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs flex-1 truncate font-medium">
                    {config?.title ?? sec.type}
                  </span>
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {STATUS_ICON[sec.status]}
                    <div className="hidden group-hover:flex gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(idx, idx - 1);
                        }}
                        disabled={idx === 0}
                        className={cn(
                          "p-0.5 rounded",
                          currentIndex === idx
                            ? "text-gray-300 hover:text-white disabled:opacity-30"
                            : "text-gray-400 hover:text-gray-700 disabled:opacity-30",
                        )}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSection(idx, idx + 1);
                        }}
                        disabled={idx === project.sections.length - 1}
                        className={cn(
                          "p-0.5 rounded",
                          currentIndex === idx
                            ? "text-gray-300 hover:text-white disabled:opacity-30"
                            : "text-gray-400 hover:text-gray-700 disabled:opacity-30",
                        )}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center: Form */}
        <main className="flex-1 overflow-y-auto">
          {section ? (
            <SectionEditor
              key={section.id}
              section={section}
              projectId={project.id}
              project={project}
              dispatch={dispatch}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              섹션을 선택해 주세요
            </div>
          )}
        </main>

        {/* Right: Image Preview */}
        <aside className="w-72 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              이미지 미리보기
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {section && (
              <ImagePreviewPanel
                section={section}
                project={project}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() =>
            dispatch({
              type: "SET_SECTION_INDEX",
              index: Math.max(0, currentIndex - 1),
            })
          }
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          이전 섹션
        </button>

        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {project.sections.length}
        </span>

        <button
          onClick={() =>
            dispatch({
              type: "SET_SECTION_INDEX",
              index: Math.min(project.sections.length - 1, currentIndex + 1),
            })
          }
          disabled={currentIndex === project.sections.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-40 hover:bg-gray-800 transition-colors"
        >
          다음 섹션
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  projectId,
  project,
  dispatch,
}: {
  section: Section;
  projectId: string;
  project: import("@/types").Project;
  dispatch: ReturnType<typeof useStore>["dispatch"];
}) {
  const config = SECTION_CONFIGS.find((c) => c.type === section.type)!;
  const fileRef = useRef<HTMLInputElement>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  function updateInput(key: string, value: string) {
    dispatch({
      type: "UPDATE_SECTION",
      projectId,
      sectionId: section.id,
      updates: {
        userInputs: { ...section.userInputs, [key]: value },
      },
    });
  }

  function buildPrompt() {
    const prompt = generatePrompt(project, section);
    dispatch({
      type: "UPDATE_SECTION",
      projectId,
      sectionId: section.id,
      updates: { generatedPrompt: prompt },
    });
    setShowPrompt(true);
    return prompt;
  }

  async function handleGenerate() {
    const prompt = buildPrompt();
    dispatch({
      type: "UPDATE_SECTION",
      projectId,
      sectionId: section.id,
      updates: { status: "generating" },
    });

    // Simulate API call delay (replace with actual API call)
    await new Promise((r) => setTimeout(r, 1500));

    const color = getSectionColor(section.type);
    const placeholderUrl = generatePlaceholderDataUrl(
      config.title,
      color,
      860,
      1000,
    );

    dispatch({
      type: "UPDATE_SECTION",
      projectId,
      sectionId: section.id,
      updates: {
        status: "done",
        generatedImageUrl: placeholderUrl,
        generatedPrompt: prompt,
      },
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    dispatch({
      type: "UPDATE_SECTION",
      projectId,
      sectionId: section.id,
      updates: {
        uploadedImages: [...section.uploadedImages, dataUrl],
      },
    });
  }

  function removeUploadedImage(idx: number) {
    const next = section.uploadedImages.filter((_, i) => i !== idx);
    dispatch({
      type: "UPDATE_SECTION",
      projectId,
      sectionId: section.id,
      updates: { uploadedImages: next },
    });
  }

  const isGenerating = section.status === "generating";
  const isDone = section.status === "done";

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-gray-400">
            섹션 {config.num}
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{config.description}</p>
      </div>

      <div className="space-y-5">
        {config.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {field.label}
              {field.required && (
                <span className="text-red-400 ml-1">*</span>
              )}
            </label>
            {field.type === "textarea" ? (
              <textarea
                value={section.userInputs[field.key] ?? ""}
                onChange={(e) => updateInput(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 outline-none text-sm resize-none transition-colors"
              />
            ) : (
              <input
                type="text"
                value={section.userInputs[field.key] ?? ""}
                onChange={(e) => updateInput(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 outline-none text-sm transition-colors"
              />
            )}
          </div>
        ))}

        {config.supportsImageUpload && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              참고 이미지 업로드
              <span className="text-gray-400 font-normal ml-2">(선택)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {section.uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {section.uploadedImages.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 group">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => removeUploadedImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors w-full justify-center"
            >
              <ImagePlus className="w-4 h-4" />
              이미지 추가
            </button>
          </div>
        )}

        {/* Prompt preview toggle */}
        <div>
          <button
            onClick={() => {
              buildPrompt();
              setShowPrompt((v) => !v);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            {showPrompt ? "프롬프트 숨기기" : "생성될 프롬프트 미리보기"}
          </button>
          {showPrompt && section.generatedPrompt && (
            <pre className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {section.generatedPrompt}
            </pre>
          )}
        </div>

        {/* Generate button */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all",
              isGenerating
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : isDone
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  : "bg-gray-900 text-white hover:bg-gray-800",
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중...
              </>
            ) : isDone ? (
              <>
                <RotateCcw className="w-4 h-4" />
                다시 만들기
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                이미지 만들기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImagePreviewPanel({
  section,
  project,
}: {
  section: Section;
  project: import("@/types").Project;
}) {
  const config = SECTION_CONFIGS.find((c) => c.type === section.type)!;
  const color = getSectionColor(section.type);

  if (section.status === "generating") {
    return (
      <div
        className="rounded-xl overflow-hidden flex flex-col items-center justify-center"
        style={{
          backgroundColor: color,
          aspectRatio: "860/1000",
        }}
      >
        <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
        <p className="text-white text-sm opacity-70">이미지 생성 중...</p>
      </div>
    );
  }

  if (section.generatedImageUrl) {
    return (
      <div>
        <img
          src={section.generatedImageUrl}
          alt={config.title}
          className="w-full rounded-xl border border-gray-200"
        />
        <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          이미지가 생성되었습니다
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col items-center justify-center"
      style={{
        backgroundColor: color + "20",
        border: `2px dashed ${color}40`,
        aspectRatio: "860/1000",
      }}
    >
      <FileImage className="w-8 h-8 mb-2" style={{ color }} />
      <p className="text-sm font-medium text-center" style={{ color }}>
        {config.title}
      </p>
      <p className="text-xs text-gray-400 mt-1 text-center px-4">
        왼쪽 폼을 채우고<br />만들기를 눌러주세요
      </p>
    </div>
  );
}

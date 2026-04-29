import { useLocation } from "wouter";
import { Plus, FileImage, ChevronRight, Trash2 } from "lucide-react";
import { useStore } from "@/store/projectStore";
import { formatDate } from "@/lib/utils";
import type { Project } from "@/types";
import { PLATFORMS } from "@/types";

export default function HomePage() {
  const [, navigate] = useLocation();
  const { state, dispatch } = useStore();

  function handleNew() {
    navigate("/create");
  }

  function handleOpen(project: Project) {
    dispatch({ type: "SET_CURRENT", id: project.id });
    navigate(`/project/${project.id}/editor`);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (confirm("이 프로젝트를 삭제하시겠습니까?")) {
      dispatch({ type: "DELETE_PROJECT", id });
    }
  }

  const platformLabel = (val: string) =>
    PLATFORMS.find((p) => p.value === val)?.label ?? val;

  const doneCount = (p: Project) =>
    p.sections.filter((s) => s.status === "done").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <FileImage className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900">
            AI 상세페이지 빌더
          </span>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />새 상세페이지 만들기
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10">
        {state.projects.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <FileImage className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              아직 만든 상세페이지가 없어요
            </h2>
            <p className="text-gray-500 mb-8 text-sm">
              상품 정보를 입력하면 AI가 자동으로 섹션별 이미지를 생성해 드려요
            </p>
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              첫 상세페이지 만들기
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                내 상세페이지
              </h1>
              <span className="text-sm text-gray-500">
                {state.projects.length}개
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.projects.map((project) => {
                const done = doneCount(project);
                const total = project.sections.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => handleOpen(project)}
                    className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-gray-400 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileImage className="w-5 h-5 text-white" />
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                      {project.productName}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      {project.brandName} · {platformLabel(project.platform)}
                    </p>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>진행률</span>
                        <span>
                          {done}/{total} 섹션
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {formatDate(project.createdAt)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleNew}
                className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all min-h-[180px]"
              >
                <Plus className="w-8 h-8" />
                <span className="text-sm font-medium">새 상세페이지</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

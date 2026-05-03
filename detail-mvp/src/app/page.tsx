"use client";

import Link from "next/link";
import { Plus, FileImage, ChevronRight, Trash2, Sparkles } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { formatDate } from "@/lib/utils";
import { PLATFORMS } from "@/types";

export default function HomePage() {
  const { projects, deleteProject } = useProjectStore();
  const platformLabel = (val: string) => PLATFORMS.find((p) => p.value === val)?.label ?? val;
  const doneCount = (p: (typeof projects)[0]) => p.sections.filter((s) => s.status === "done").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">jayoung</span>
          <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">AI 상세페이지</span>
        </div>
        <Link href="/create" className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> 새 상세페이지 만들기
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10">
        {projects.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">AI 상세페이지를 만들어보세요</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">
              상품 정보를 입력하면 AI가 섹션별 이미지를 자동으로 생성해 드려요.<br />
              스마트스토어, 쿠팡, 자사몰에 바로 사용 가능합니다.
            </p>
            <Link href="/create" className="inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
              <Plus className="w-5 h-5" /> 첫 상세페이지 만들기
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">내 상세페이지</h1>
              <span className="text-sm text-gray-400">{projects.length}개</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const done = doneCount(project);
                const total = project.sections.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={project.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-400 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                        <FileImage className="w-5 h-5 text-white" />
                      </div>
                      <button
                        onClick={() => { if (confirm("이 프로젝트를 삭제할까요?")) deleteProject(project.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{project.productName}</h3>
                    <p className="text-sm text-gray-500 mb-4">{project.brandName} · {platformLabel(project.platform)}</p>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                        <span>진행률</span><span>{done}/{total}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{formatDate(project.createdAt)}</span>
                      <Link href={`/project/${project.id}/editor`} className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors">
                        편집하기 <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
              <Link href="/create" className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all min-h-[200px]">
                <Plus className="w-8 h-8" />
                <span className="text-sm font-medium">새 상세페이지</span>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

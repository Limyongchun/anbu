import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, FileImage } from "lucide-react";
import { useStore } from "@/store/projectStore";
import { CATEGORIES, PLATFORMS, TARGET_CUSTOMERS } from "@/types";
import { cn } from "@/lib/utils";

export default function CreateProjectPage() {
  const [, navigate] = useLocation();
  const { dispatch } = useStore();

  const [form, setForm] = useState({
    productName: "",
    brandName: "",
    category: "",
    targetCustomer: "",
    platform: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.productName.trim()) errs.productName = "상품명을 입력해 주세요";
    if (!form.brandName.trim()) errs.brandName = "브랜드명을 입력해 주세요";
    if (!form.category) errs.category = "카테고리를 선택해 주세요";
    if (!form.targetCustomer) errs.targetCustomer = "타깃 고객을 선택해 주세요";
    if (!form.platform) errs.platform = "용도를 선택해 주세요";
    return errs;
  }

  function handleNext() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    dispatch({
      type: "CREATE_PROJECT",
      project: { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...form },
    });
    // After CREATE_PROJECT, currentProjectId is set in reducer
    // Navigate to style page — we need the id, but we can get it after dispatch
    // We'll navigate to /style and EditorPage will redirect appropriately
    navigate("/style");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
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
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-400">STEP 1/2</span>
            <div className="flex gap-1.5">
              <div className="w-8 h-1.5 bg-gray-900 rounded-full" />
              <div className="w-8 h-1.5 bg-gray-200 rounded-full" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">상품 정보 입력</h1>
          <p className="text-gray-500 mt-1 text-sm">
            어떤 상품의 상세페이지를 만들까요?
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          <Field label="상품명" error={errors.productName} required>
            <input
              type="text"
              value={form.productName}
              onChange={(e) => set("productName", e.target.value)}
              placeholder="예: 프리미엄 캐시미어 니트"
              className={cn(
                "w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors",
                errors.productName
                  ? "border-red-300 focus:border-red-400"
                  : "border-gray-200 focus:border-gray-900",
              )}
            />
          </Field>

          <Field label="브랜드명" error={errors.brandName} required>
            <input
              type="text"
              value={form.brandName}
              onChange={(e) => set("brandName", e.target.value)}
              placeholder="예: 소프트무드"
              className={cn(
                "w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors",
                errors.brandName
                  ? "border-red-300 focus:border-red-400"
                  : "border-gray-200 focus:border-gray-900",
              )}
            />
          </Field>

          <Field label="카테고리" error={errors.category} required>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => set("category", cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                    form.category === cat
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Field>

          <Field label="타깃 고객" error={errors.targetCustomer} required>
            <div className="flex flex-wrap gap-2">
              {TARGET_CUSTOMERS.map((t) => (
                <button
                  key={t}
                  onClick={() => set("targetCustomer", t)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                    form.targetCustomer === t
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="상세페이지 용도" error={errors.platform} required>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => set("platform", p.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                    form.platform === p.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            다음: 디자인 스타일 설정
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

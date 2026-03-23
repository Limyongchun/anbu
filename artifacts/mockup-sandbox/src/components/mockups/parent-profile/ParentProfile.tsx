import React, { useState } from "react";

const GRAD_TOP = "#D4843A";
const GRAD_MID = "#C4692E";
const GRAD_BOT = "#A85528";
const SURFACE = "#FFFFFF";
const TEXT_PRIMARY = "#2D1F1F";
const TEXT_SECONDARY = "#6B5050";
const TEXT_TERTIARY = "#9B8080";
const BORDER = "#E8E8E8";
const DANGER = "#ff5050";

function Ion({ name, size = 18, color = "#888" }: { name: string; size?: number; color?: string }) {
  const icons: Record<string, string> = {
    "arrow-back": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M244 400L100 256l144-144M120 256h292"/></svg>`,
    "camera": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M350.54 148.68l-26.62-42.06C318.31 97.08 309.27 92 299.51 92h-87c-9.76 0-18.8 5.08-24.42 14.62l-26.62 42.06C155.8 155.6 146.27 160 136 160H104a48 48 0 00-48 48v224a48 48 0 0048 48h304a48 48 0 0048-48V208a48 48 0 00-48-48h-32c-10.29 0-19.79-4.4-25.46-11.32z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="256" cy="296" r="80" fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32"/></svg>`,
    "pencil": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M358.62 129.28L86.49 402.08 70 442l39.92-16.49 272.8-272.13-24.1-24.1zM413.07 74.84c-11.46-11.46-30.06-11.46-41.52 0l-27.37 27.37 65.62 65.62 27.37-27.37c11.46-11.46 11.46-30.06 0-41.52z" fill="${color}"/></svg>`,
    "copy-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect x="128" y="128" width="336" height="336" rx="57" ry="57" fill="none" stroke="${color}" stroke-linejoin="round" stroke-width="32"/><path d="M383.5 128l.5-24a56.16 56.16 0 00-56-56H112a64.19 64.19 0 00-64 64v216a56.16 56.16 0 0056 56h24" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "person-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z" fill="none" stroke="${color}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/></svg>`,
    "finger-print-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M390.42 75.28a10.45 10.45 0 01-5.32-1.44C340.72 50.08 302.35 40 256.35 40c-45.77 0-89.23 11.28-128.76 33.84C122 77 115.11 74.8 111.87 69a12 12 0 014.42-16.14C161.05 26.42 208.25 16 256.35 16c52 0 93 12.36 139.69 38.14a12 12 0 01-5.62 21.14z" fill="${color}"/><path d="M256 48c-79.5 0-144 61.39-144 137 0 87 96 224.87 131.25 272.49a15.77 15.77 0 0025.5 0C304 409.89 400 272.07 400 185c0-75.61-64.5-137-144-137z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "shield-checkmark-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M463.1 112.37C373.68 96.33 336.71 84.45 256 48c-80.71 36.45-117.68 48.33-207.1 64.37C32.7 369.13 141.34 432.29 256 480c114.66-47.71 223.3-110.87 207.1-367.63z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336 192L215.9 336 176 288"/></svg>`,
    "eye-off": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M432 448a15.92 15.92 0 01-11.31-4.69l-352-352a16 16 0 0122.62-22.62l352 352A16 16 0 01432 448zM248 315.85l-51.79-51.79a2 2 0 00-3.39 1.69 64.11 64.11 0 0053.49 53.49 2 2 0 001.69-3.39zM264 196.15L315.87 248a2 2 0 003.4-1.69 64.13 64.13 0 00-53.55-53.55 2 2 0 00-1.72 3.39z" fill="${color}"/><path d="M491 273.36a32.2 32.2 0 00-.1-34.76c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 256 96a275.75 275.75 0 00-54.09 5.33M432 388.45C405.4 413.51 361.8 448 256 448c-46 0-93-14.55-135.57-42.07C81.95 381 47.62 346.22 21.11 305.36a32.2 32.2 0 01.1-34.76c17.42-26.95 37.71-50.73 60.3-70.59" fill="none" stroke="${color}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/></svg>`,
    "mail-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect x="48" y="96" width="416" height="320" rx="40" ry="40" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M112 160l144 112 144-112"/></svg>`,
    "chatbubble-ellipses-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M87.48 380c1.2-4.38-1.43-10.47-3.94-14.86A42.63 42.63 0 0180 356.2C64.67 331.93 48 295.7 48 256c0-92.82 81.4-176 208-176s208 83.18 208 176-81.4 176-208 176a319.22 319.22 0 01-52.78-4.37c-2.65-.45-5.3-1.26-8.19-1.26a41.17 41.17 0 00-11.58 2.08L107 448c-4 1.4-7.48 2-9.79 2a7.44 7.44 0 01-6.16-11.44z" fill="none" stroke="${color}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/><circle cx="160" cy="256" r="16" fill="${color}"/><circle cx="256" cy="256" r="16" fill="${color}"/><circle cx="352" cy="256" r="16" fill="${color}"/></svg>`,
    "help-circle-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 80a176 176 0 10176 176A176 176 0 00256 80z" fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32"/><path d="M200 202.29s.84-17.5 19.57-32.57C230.68 160.77 244 158 256 158s28 4.78 36.86 14.08c9.69 10.16 13.14 24.42 13.14 34.18 0 24.37-18.39 37.36-38 46.36-22.56 10.35-32 18.2-32 38.38" fill="none" stroke="${color}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="28"/><circle cx="256" cy="370" r="8" fill="${color}"/></svg>`,
    "information-circle-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M248 64C146.39 64 64 146.39 64 248s82.39 184 184 184 184-82.39 184-184S349.61 64 248 64z" fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M220 220h32v116"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M208 340h88"/><circle cx="248" cy="172" r="4" fill="none" stroke="${color}" stroke-width="24"/></svg>`,
    "document-text-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M416 221.25V416a48 48 0 01-48 48H144a48 48 0 01-48-48V96a48 48 0 0148-48h98.75a32 32 0 0122.62 9.37l141.26 141.26a32 32 0 019.37 22.62z" fill="none" stroke="${color}" stroke-linejoin="round" stroke-width="32"/><path d="M256 56v120a32 32 0 0032 32h120M176 288h160M176 368h160" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "star-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M480 208H308L256 48l-52 160H32l148 114-58 178 134-104 134 104-58-178z" fill="none" stroke="${color}" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "log-out-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M304 336v40a40 40 0 01-40 40H104a40 40 0 01-40-40V136a40 40 0 0140-40h152c22.09 0 48 17.91 48 40v40M368 336l80-80-80-80M176 256h256" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "chevron-forward": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M184 112l144 144-144 144"/></svg>`,
    "chevron-down": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 184l144 144 144-144"/></svg>`,
    "chevron-up": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 328l144-144 144 144"/></svg>`,
    "globe-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 48C141.13 48 48 141.13 48 256s93.13 208 208 208 208-93.13 208-208S370.87 48 256 48z" fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32"/><path d="M256 48c-58.07 0-112.67 93.13-112.67 208S197.93 464 256 464s112.67-93.13 112.67-208S314.07 48 256 48z" fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32"/><path d="M117.33 117.33c38.24 27.15 86.16 43.34 138.67 43.34s100.43-16.19 138.67-43.34M394.67 394.67c-38.24-27.15-86.16-43.34-138.67-43.34s-100.43 16.19-138.67 43.34" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32" d="M256 48v416M464 256H48"/></svg>`,
  };
  const svg = icons[name];
  if (!svg) return <span style={{ width: size, height: size, display: "inline-block" }} />;
  return <span dangerouslySetInnerHTML={{ __html: svg }} style={{ display: "inline-flex", alignItems: "center" }} />;
}

function SectionHeader({ title }: { title: string }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_TERTIARY, margin: "18px 0 8px", letterSpacing: 0.5 }}>{title}</div>;
}

function InfoRow({ icon, label, value, danger, hasArrow = true }: { icon: string; label: string; value?: string; danger?: boolean; hasArrow?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "13px 16px", gap: 12, cursor: "pointer" }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: danger ? "rgba(255,80,80,0.1)" : "#F5F5F5",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Ion name={icon} size={18} color={danger ? DANGER : "#888"} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: danger ? DANGER : TEXT_PRIMARY }}>{label}</div>
        {value && <div style={{ fontSize: 12, color: TEXT_TERTIARY, marginTop: 1 }}>{value}</div>}
      </div>
      {hasArrow && <Ion name="chevron-forward" size={16} color={danger ? DANGER : "rgba(0,0,0,0.2)"} />}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: "#F0F0F0", margin: "0 16px" }} />;
}

const FAMILY_CODE = "A1B2C3";

export function ParentProfile() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [privacyOn, setPrivacyOn] = useState(false);

  const faqs = [
    { q: "부모님 앱은 어떻게 사용하나요?", a: "부모님 앱은 자동으로 사진 슬라이드쇼를 재생합니다. 화면을 터치하면 하트를 보낼 수 있습니다." },
    { q: "위치 정보는 안전한가요?", a: "위치 정보는 가족 구성원 간에만 공유되며, 외부에 공개되지 않습니다." },
    { q: "알림은 어떻게 관리하나요?", a: "설정에서 알림을 켜거나 끌 수 있습니다." },
  ];

  return (
    <div style={{
      width: 393, minHeight: 852,
      background: `linear-gradient(180deg, ${GRAD_TOP} 0%, ${GRAD_MID} 12%, ${GRAD_BOT} 22%, #F5F2ED 35%)`,
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: "relative",
    }}>
      {/* Header */}
      <div style={{ padding: "54px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: "rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <Ion name="arrow-back" size={20} color="#fff" />
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>마이페이지</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Content */}
      <div style={{ padding: "0 18px 40px" }}>
        {/* Profile Card */}
        <div style={{
          backgroundColor: SURFACE, borderRadius: 16, padding: 18,
          display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          marginBottom: 4,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: "#F0EDE8",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px dashed #ccc",
          }}>
            <Ion name="camera" size={26} color="#888" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY }}>김부모</div>
            <div style={{
              display: "inline-flex", padding: "3px 10px", borderRadius: 6,
              backgroundColor: "#6c63ff", marginTop: 4,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>부모님</span>
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8,
            backgroundColor: "#F5F5F5", cursor: "pointer",
          }}>
            <Ion name="pencil" size={15} color="#888" />
            <span style={{ fontSize: 12, fontWeight: 500, color: "#888" }}>수정</span>
          </div>
        </div>

        {/* Family Code */}
        <SectionHeader title="가족 연결" />
        <div style={{ backgroundColor: SURFACE, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10 }}>
              {FAMILY_CODE.split("").map((ch, i) => (
                <div key={i} style={{
                  width: 42, height: 48, borderRadius: 10,
                  backgroundColor: "#F5F5F5", border: "1px solid #E8E8E8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#D4843A", letterSpacing: 1 }}>{ch}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: TEXT_TERTIARY, marginBottom: 10 }}>
              이 코드를 자녀에게 공유해 주세요
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 16px", backgroundColor: "#F5F5F5", borderRadius: 10,
              cursor: "pointer", margin: "0 auto", width: "fit-content",
            }}>
              <Ion name="copy-outline" size={14} color="#888" />
              <span style={{ fontSize: 13, fontWeight: 500, color: "#888" }}>코드 복사</span>
            </div>
          </div>
        </div>

        {/* Privacy Mode */}
        <SectionHeader title="프라이버시 모드" />
        <div style={{ backgroundColor: SURFACE, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: "#F5F5F5",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ion name="eye-off" size={18} color="#888" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>프라이버시 모드</div>
              <div style={{ fontSize: 12, color: TEXT_TERTIARY, marginTop: 2 }}>자녀 지도에서 내 위치를 숨깁니다</div>
            </div>
            <div
              onClick={() => setPrivacyOn(!privacyOn)}
              style={{
                width: 48, height: 28, borderRadius: 14,
                backgroundColor: privacyOn ? "#888" : "#e2e8f0",
                position: "relative", cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: "#fff",
                position: "absolute", top: 2,
                left: privacyOn ? 22 : 2,
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>
        </div>

        {/* Account Info */}
        <SectionHeader title="계정 정보" />
        <div style={{ backgroundColor: SURFACE, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <InfoRow icon="person-outline" label="이름" value="김부모" />
          <Divider />
          <InfoRow icon="finger-print-outline" label="기기 식별번호" value="A1B2C3D4" hasArrow={false} />
          <Divider />
          <InfoRow icon="shield-checkmark-outline" label="비밀번호" value="PIN 설정됨" />
        </div>

        {/* Language */}
        <SectionHeader title="언어" />
        <div style={{ backgroundColor: SURFACE, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "13px 16px", gap: 12, cursor: "pointer" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: "#F5F5F5",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ion name="globe-outline" size={18} color="#888" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>한국어</div>
            </div>
            <div style={{
              padding: "3px 10px", borderRadius: 6,
              backgroundColor: "#F0EDE8",
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY }}>KO</span>
            </div>
            <Ion name="chevron-forward" size={16} color="rgba(0,0,0,0.2)" />
          </div>
        </div>

        {/* Support */}
        <SectionHeader title="고객센터" />
        <div style={{ backgroundColor: SURFACE, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <InfoRow icon="mail-outline" label="이메일 문의" value="support@dugo.app" />
          <Divider />
          <InfoRow icon="chatbubble-ellipses-outline" label="앱 사용 가이드" value="기능 안내" />
        </div>

        {/* FAQ */}
        <SectionHeader title="자주 묻는 질문" />
        <div style={{ backgroundColor: SURFACE, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {faqs.map((faq, i) => (
            <div key={i}>
              {i > 0 && <Divider />}
              <div
                style={{ display: "flex", alignItems: "center", padding: "13px 16px", gap: 10, cursor: "pointer" }}
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              >
                <Ion name="help-circle-outline" size={17} color="#888" />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>{faq.q}</span>
                <Ion name={faqOpen === i ? "chevron-up" : "chevron-down"} size={15} color="rgba(0,0,0,0.25)" />
              </div>
              {faqOpen === i && (
                <div style={{ padding: "0 16px 14px 42px" }}>
                  <div style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: "20px", backgroundColor: "#FAFAFA", borderRadius: 10, padding: 12 }}>
                    {faq.a}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* App Info */}
        <SectionHeader title="앱 정보" />
        <div style={{ backgroundColor: SURFACE, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <InfoRow icon="information-circle-outline" label="버전" value="1.0.0" hasArrow={false} />
          <Divider />
          <InfoRow icon="document-text-outline" label="개인정보 처리방침" />
          <Divider />
          <InfoRow icon="star-outline" label="앱 평가하기" />
        </div>

        {/* Disconnect */}
        <div style={{ backgroundColor: SURFACE, borderRadius: 14, overflow: "hidden", marginTop: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <InfoRow icon="log-out-outline" label="연결 해제" danger />
        </div>

        {/* Bottom Note */}
        <div style={{ textAlign: "center", color: TEXT_TERTIARY, fontSize: 12, marginTop: 24, paddingBottom: 20 }}>
          ANBU — With Love, For Parents
        </div>
      </div>
    </div>
  );
}
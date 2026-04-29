import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function stitchImages(
  imageUrls: string[],
  width = 860,
): Promise<string> {
  const images = await Promise.all(
    imageUrls.map(
      (url) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        }),
    ),
  );

  const scale = width / (images[0]?.naturalWidth ?? width);
  const totalHeight = images.reduce(
    (sum, img) => sum + img.naturalHeight * scale,
    0,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d")!;

  let y = 0;
  for (const img of images) {
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, 0, y, width, h);
    y += h;
  }

  return canvas.toDataURL("image/png");
}

export function generatePlaceholderDataUrl(
  label: string,
  color: string,
  width = 860,
  height = 1000,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(0, height - 4, width, 4);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `bold ${Math.round(width * 0.04)}px "Noto Sans KR", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, width / 2, height / 2 - 20);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `${Math.round(width * 0.025)}px "Noto Sans KR", sans-serif`;
  ctx.fillText("이미지 생성 대기 중", width / 2, height / 2 + 30);

  return canvas.toDataURL("image/png");
}

const SECTION_COLORS: Record<string, string> = {
  hero: "#1a1a2e",
  problem: "#16213e",
  benefits: "#0f3460",
  lifestyle: "#533483",
  detail: "#2b2d42",
  comparison: "#1b4332",
  trust: "#1d3557",
  components: "#3d405b",
  howto: "#264653",
  cta: "#2d3436",
};

export function getSectionColor(type: string): string {
  return SECTION_COLORS[type] ?? "#333";
}

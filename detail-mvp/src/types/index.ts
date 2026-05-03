export const PLATFORMS = [
  { value: "smartstore", label: "스마트스토어" },
  { value: "coupang", label: "쿠팡" },
  { value: "own", label: "자사몰" },
];

export interface Section {
  id: string;
  title: string;
  status: "idle" | "generating" | "done" | "error";
  imageUrl?: string;
}

export interface Project {
  id: string;
  productName: string;
  brandName: string;
  platform: string;
  sections: Section[];
  createdAt: string;
}

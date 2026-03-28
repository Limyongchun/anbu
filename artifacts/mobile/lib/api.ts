const BASE = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "/api";

export function getApiBase() { return BASE; }

let _previewMode = false;
export function setPreviewMode(on: boolean) { _previewMode = on; }
export function isPreviewMode() { return _previewMode; }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (_previewMode) return [] as unknown as T;
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface FamilyMember {
  id: number;
  familyCode: string;
  deviceId: string;
  memberName: string;
  role: string;
  photoData?: string | null;
  joinedAt: string;
}

export interface FamilyGroup {
  code: string;
  members: FamilyMember[];
  createdAt: string;
}

export interface LocationData {
  id: number;
  familyCode: string;
  deviceId: string;
  memberName: string;
  role?: string;
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  battery?: number;
  heading?: number | null;
  speed?: number | null;
  isSharing: boolean;
  privacyMode?: boolean;
  photoData?: string | null;
  updatedAt: string;
}

export interface FamilyMessage {
  id: number;
  familyCode: string;
  deviceId?: string | null;
  fromName: string;
  fromRole: string;
  text: string;
  photoData?: string | null;
  hearts: number;
  createdAt: string;
}

export interface AccountFamily {
  familyCode: string;
  memberName: string;
  role: string;
  childRole: string | null;
  deviceId: string;
}

export const api = {
  sendOtp: (phone: string): Promise<{ success: boolean; devCode?: string }> =>
    request("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string): Promise<{
    success: boolean;
    accountId: number | null;
    phone: string;
    existingFamilies: AccountFamily[];
  }> =>
    request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    }),

  authApple: (data: {
    identityToken?: string;
    user: string;
    fullName?: { givenName?: string; familyName?: string } | null;
    email?: string | null;
  }): Promise<{
    success: boolean;
    accountId: number;
    displayName?: string | null;
    email?: string | null;
    existingFamilies: AccountFamily[];
  }> =>
    request("/auth/apple", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  authGoogle: (data: {
    idToken?: string;
    accessToken?: string;
    email?: string | null;
    name?: string | null;
  }): Promise<{
    success: boolean;
    accountId: number;
    displayName?: string | null;
    email?: string | null;
    existingFamilies: AccountFamily[];
  }> =>
    request("/auth/google", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAccountFamilies: (accountId: number): Promise<{ accountId: number; families: AccountFamily[] }> =>
    request(`/account/${accountId}/families`),

  createFamily: (deviceId: string, memberName: string, role: string, accountId?: number | null): Promise<FamilyGroup> =>
    request("/family/create", {
      method: "POST",
      body: JSON.stringify({ deviceId, memberName, role, accountId }),
    }),

  joinFamily: (code: string, deviceId: string, memberName: string, role: string, accountId?: number | null): Promise<FamilyMember> =>
    request("/family/join", {
      method: "POST",
      body: JSON.stringify({ code, deviceId, memberName, role, accountId }),
    }),

  getFamily: (code: string): Promise<FamilyGroup> =>
    request(`/family/${code}`),

  updateLocation: (
    code: string,
    data: {
      deviceId: string;
      memberName: string;
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
      battery?: number;
      heading?: number;
      speed?: number;
      isSharing: boolean;
    }
  ): Promise<LocationData> =>
    request(`/family/${code}/location`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getAllLocations: (code: string): Promise<LocationData[]> =>
    request(`/family/${code}/locations`),

  setPrivacyMode: (code: string, deviceId: string, privacyMode: boolean): Promise<{ success: boolean; privacyMode: boolean }> =>
    request(`/family/${code}/member/${deviceId}/privacy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacyMode }),
    }),

  getMessages: (code: string): Promise<FamilyMessage[]> =>
    request(`/family/${code}/messages`),

  sendMessage: (
    code: string,
    deviceId: string,
    fromName: string,
    fromRole: string,
    text: string,
    photoData?: string | null
  ): Promise<FamilyMessage> =>
    request(`/family/${code}/messages`, {
      method: "POST",
      body: JSON.stringify({ deviceId, fromName, fromRole, text, photoData }),
    }),

  heartMessage: (code: string, messageId: number): Promise<FamilyMessage> =>
    request(`/family/${code}/messages/${messageId}/heart`, { method: "POST" }),

  deleteMessage: (code: string, messageId: number, deviceId: string): Promise<{ success: boolean }> =>
    request(`/family/${code}/messages/${messageId}?deviceId=${encodeURIComponent(deviceId)}`, { method: "DELETE" }),

  leaveFamily: (code: string, deviceId: string): Promise<{ success: boolean }> =>
    request(`/family/${code}/leave`, {
      method: "POST",
      body: JSON.stringify({ deviceId }),
    }),

  removeFamilyMember: (code: string, memberDeviceId: string, requestorDeviceId: string): Promise<{ success: boolean }> =>
    request(`/family/${code}/member/${encodeURIComponent(memberDeviceId)}`, {
      method: "DELETE",
      body: JSON.stringify({ requestorDeviceId }),
    }),

  updateMemberPhoto: (code: string, deviceId: string, photoData: string): Promise<{ success: boolean }> =>
    request(`/family/${code}/member/${encodeURIComponent(deviceId)}/photo`, {
      method: "PATCH",
      body: JSON.stringify({ photoData }),
    }),

  logParentActivity: (
    code: string,
    deviceId: string,
    parentName: string,
    activityType: string,
    detail?: string
  ): Promise<ParentActivityLog> =>
    request(`/family/${code}/activity`, {
      method: "POST",
      body: JSON.stringify({ deviceId, parentName, activityType, detail }),
    }),

  getParentActivities: (code: string, limit = 30): Promise<ParentActivityLog[]> =>
    request(`/family/${code}/activities?limit=${limit}`),

  getParentSchedule: (code: string, deviceId: string): Promise<ScheduleResponse> =>
    request(`/family/${code}/schedule/${deviceId}`),

  updateParentSchedule: (code: string, deviceId: string, schedule: ScheduleResponse) =>
    request(`/family/${code}/schedule/${deviceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    }),

  logStatusChange: (code: string, data: { deviceId: string; parentName: string; previousStatus: string; newStatus: string; place?: string; reason?: string }) =>
    request(`/family/${code}/status-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getStatusLogs: (code: string, limit = 50): Promise<StatusChangeLogEntry[]> =>
    request(`/family/${code}/status-logs?limit=${limit}`),

  submitInquiry: (data: { userId?: string; userName: string; userEmail: string; title: string; content: string }) =>
    request("/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

export interface ParentActivityLog {
  id: number;
  familyCode: string;
  deviceId: string;
  parentName: string;
  activityType: string;
  detail?: string | null;
  createdAt: string;
}

export interface ScheduleResponse {
  wakeHour: number;
  wakeMinute: number;
  sleepHour: number;
  sleepMinute: number;
}

export interface StatusChangeLogEntry {
  id: number;
  familyCode: string;
  deviceId: string;
  parentName: string;
  previousStatus: string;
  newStatus: string;
  place?: string | null;
  reason?: string | null;
  createdAt: string;
}


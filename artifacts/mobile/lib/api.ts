const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
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
  isSharing: boolean;
  privacyMode?: boolean;
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

export const api = {
  createFamily: (deviceId: string, memberName: string, role: string): Promise<FamilyGroup> =>
    request("/family/create", {
      method: "POST",
      body: JSON.stringify({ deviceId, memberName, role }),
    }),

  joinFamily: (code: string, deviceId: string, memberName: string, role: string): Promise<FamilyMember> =>
    request("/family/join", {
      method: "POST",
      body: JSON.stringify({ code, deviceId, memberName, role }),
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


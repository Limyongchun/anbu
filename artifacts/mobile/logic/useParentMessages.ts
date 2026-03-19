import { useCallback, useEffect, useRef, useState } from "react";
import type { FamilyMessage } from "@/lib/api";
import { api } from "@/lib/api";

interface UseParentMessagesOptions {
  allFamilyCodes: string[];
}

export function useParentMessages({ allFamilyCodes }: UseParentMessagesOptions) {
  const [msgs, setMsgs] = useState<FamilyMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const currentMsgIdRef = useRef<number | null>(null);
  const pendingMsgsRef = useRef<FamilyMessage[] | null>(null);
  const setCurIdxRef = useRef<((idx: number) => void) | null>(null);
  const isTransitioningRef = useRef<(() => boolean) | null>(null);

  const applyNewMsgs = useCallback((newMsgs: FamilyMessage[]) => {
    const watchId = currentMsgIdRef.current;
    setMsgs(() => {
      if (watchId !== null && newMsgs.length > 0) {
        const newIndex = newMsgs.findIndex((m) => m.id === watchId);
        if (newIndex >= 0 && setCurIdxRef.current) {
          setTimeout(() => setCurIdxRef.current?.(newIndex), 0);
        }
      }
      return newMsgs;
    });
    pendingMsgsRef.current = null;
  }, []);

  const loadMsgs = useCallback(async () => {
    if (allFamilyCodes.length === 0) return;
    try {
      const results = await Promise.all(
        allFamilyCodes.map((code) => api.getMessages(code).catch(() => [] as FamilyMessage[])),
      );
      const merged = results
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (isTransitioningRef.current?.()) {
        pendingMsgsRef.current = merged;
      } else {
        applyNewMsgs(merged);
      }
    } catch {}
  }, [allFamilyCodes, applyNewMsgs]);

  useEffect(() => {
    if (allFamilyCodes.length === 0) return;
    setLoadingMsgs(true);
    loadMsgs().finally(() => setLoadingMsgs(false));
    const iv = setInterval(loadMsgs, 10000);
    return () => clearInterval(iv);
  }, [allFamilyCodes, loadMsgs]);

  const trackCurrentMsgId = useCallback((slide: any) => {
    if (slide?.kind === "msg") {
      currentMsgIdRef.current = slide.msg.id;
    }
  }, []);

  const heartMessage = useCallback(
    async (familyCode: string | null, msgId: number) => {
      if (!familyCode) return;
      try {
        const updated = await api.heartMessage(familyCode, msgId);
        setMsgs((p) => p.map((m) => (m.id === updated.id ? updated : m)));
      } catch {
        setMsgs((p) =>
          p.map((m) => (m.id === msgId ? { ...m, hearts: m.hearts + 1 } : m)),
        );
      }
    },
    [],
  );

  const bindCurIdxSetter = useCallback((setter: (idx: number) => void) => {
    setCurIdxRef.current = setter;
  }, []);

  const bindIsTransitioning = useCallback((fn: () => boolean) => {
    isTransitioningRef.current = fn;
  }, []);

  const flushPending = useCallback(() => {
    if (pendingMsgsRef.current) applyNewMsgs(pendingMsgsRef.current);
  }, [applyNewMsgs]);

  return {
    msgs,
    loadingMsgs,
    trackCurrentMsgId,
    heartMessage,
    bindCurIdxSetter,
    bindIsTransitioning,
    flushPending,
  };
}

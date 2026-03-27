import React, { createContext, useContext, useState } from "react";

interface GuestModeContextValue {
  isGuestMode: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const GuestModeContext = createContext<GuestModeContextValue>({
  isGuestMode: true,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
});

export function GuestModeProvider({ children }: { children: React.ReactNode }) {
  const [isGuestMode, setIsGuestMode] = useState(false);

  return (
    <GuestModeContext.Provider
      value={{
        isGuestMode,
        enterGuestMode: () => setIsGuestMode(true),
        exitGuestMode: () => setIsGuestMode(false),
      }}
    >
      {children}
    </GuestModeContext.Provider>
  );
}

export function useGuestMode() {
  return useContext(GuestModeContext);
}

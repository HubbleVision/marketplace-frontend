import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

interface OverlayStateContextValue {
  isDialogOpen: boolean;
  isSheetOpen: boolean;
  isOverlayActive: boolean;
  setDialogOpen: (id: string, open: boolean) => void;
  setSheetOpen: (id: string, open: boolean) => void;
}

const OverlayStateContext = createContext<OverlayStateContextValue | undefined>(
  undefined
);

export function OverlayProvider({ children }: PropsWithChildren) {
  const dialogIdsRef = useRef(new Set<string>());
  const sheetIdsRef = useRef(new Set<string>());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const setDialogOpen = useCallback(
    (id: string, open: boolean) => {
      const dialogIds = dialogIdsRef.current;
      if (open) {
        if (!dialogIds.has(id)) {
          dialogIds.add(id);
          setIsDialogOpen(true);
        }
        return;
      }

      if (dialogIds.delete(id) && dialogIds.size === 0) {
        setIsDialogOpen(false);
      }
    },
    [setIsDialogOpen]
  );

  const setSheetOpen = useCallback(
    (id: string, open: boolean) => {
      const sheetIds = sheetIdsRef.current;
      if (open) {
        if (!sheetIds.has(id)) {
          sheetIds.add(id);
          setIsSheetOpen(true);
        }
        return;
      }

      if (sheetIds.delete(id) && sheetIds.size === 0) {
        setIsSheetOpen(false);
      }
    },
    [setIsSheetOpen]
  );

  const value = useMemo(
    () => ({
      isDialogOpen,
      isSheetOpen,
      isOverlayActive: isDialogOpen || isSheetOpen,
      setDialogOpen,
      setSheetOpen,
    }),
    [isDialogOpen, isSheetOpen, setDialogOpen, setSheetOpen]
  );

  return (
    <OverlayStateContext.Provider value={value}>
      {children}
    </OverlayStateContext.Provider>
  );
}

export function useOverlayState() {
  const context = useContext(OverlayStateContext);
  if (context === undefined) {
    throw new Error("useOverlayState must be used within OverlayProvider");
  }
  return context;
}


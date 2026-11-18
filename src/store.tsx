import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createInitialState } from "./domain/fixtures";
import { loadWorkspace, saveWorkspace, STORAGE_KEY } from "./domain/migration";
import type { AppState } from "./domain/types";

interface AppContextValue {
  state: AppState;
  update(recipe: (draft: AppState) => void, message?: string): void;
  notify(message: string): void;
  reset(): void;
}
const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadWorkspace());
  const stateRef = useRef(state);
  stateRef.current = state;
  const notify = useCallback((message: string) => {
    window.dispatchEvent(
      new CustomEvent("tripwire:toast", { detail: message }),
    );
  }, []);
  const storageErrorShown = useRef(false);
  useEffect(() => {
    try {
      saveWorkspace(window.localStorage, state);
    } catch (error) {
      if (!storageErrorShown.current) {
        notify(
          error instanceof Error
            ? error.message
            : "Changes could not be saved in this browser.",
        );
        storageErrorShown.current = true;
      }
    }
  }, [state, notify]);
  const update = useCallback(
    (recipe: (draft: AppState) => void, message?: string) => {
      // Recipes execute once, synchronously, so validation errors can be handled by the action.
      const next = structuredClone(stateRef.current);
      recipe(next);
      stateRef.current = next;
      setState(next);
      if (message) notify(message);
    },
    [notify],
  );
  const reset = useCallback(() => {
    const next = createInitialState();
    stateRef.current = next;
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      storageErrorShown.current = false;
      notify("Demo workspace reset.");
    } catch {
      notify("Workspace reset in this tab; browser storage is unavailable.");
    }
  }, [notify]);
  const value = useMemo(
    () => ({ state, update, notify, reset }),
    [state, update, notify, reset],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider.");
  return value;
}

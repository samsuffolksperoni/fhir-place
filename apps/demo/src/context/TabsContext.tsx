import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type TabKind = "GET" | "POST" | "PUT" | "DELETE" | "CFG";

export interface Tab {
  id: string;
  kind: TabKind;
  label: string;
  path: string;
  dirty: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
}

type Action =
  | { type: "OPEN"; tab: Tab }
  | { type: "CLOSE"; id: string }
  | { type: "ACTIVATE"; id: string }
  | { type: "SET_DIRTY"; id: string; dirty: boolean }
  | { type: "REORDER"; fromIndex: number; toIndex: number };

const STORAGE_KEY = "fhir-place:tabs";

function loadState(): TabsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TabsState;
      if (Array.isArray(parsed.tabs)) return parsed;
    }
  } catch {}
  return { tabs: [], activeTabId: null };
}

function saveState(state: TabsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function reducer(state: TabsState, action: Action): TabsState {
  switch (action.type) {
    case "OPEN": {
      const existing = state.tabs.find((t) => t.path === action.tab.path);
      if (existing) {
        return { ...state, activeTabId: existing.id };
      }
      return {
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
      };
    }
    case "CLOSE": {
      const idx = state.tabs.findIndex((t) => t.id === action.id);
      const next = state.tabs.filter((t) => t.id !== action.id);
      let activeTabId = state.activeTabId;
      if (activeTabId === action.id) {
        const prev = next[idx - 1];
        const fallback = next[idx] ?? next[idx - 1];
        activeTabId = (prev ?? fallback)?.id ?? null;
      }
      return { tabs: next, activeTabId };
    }
    case "ACTIVATE":
      return { ...state, activeTabId: action.id };
    case "SET_DIRTY": {
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.id ? { ...t, dirty: action.dirty } : t,
        ),
      };
    }
    case "REORDER": {
      const tabs = [...state.tabs];
      const moved = tabs.splice(action.fromIndex, 1)[0];
      if (!moved) return state;
      tabs.splice(action.toIndex, 0, moved);
      return { ...state, tabs };
    }
    default:
      return state;
  }
}

interface TabsCtx {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Omit<Tab, "id">) => void;
  closeTab: (id: string) => void;
  activateTab: (id: string) => void;
  setDirty: (id: string, dirty: boolean) => void;
  syncFromPath: (path: string) => void;
}

const TabsContext = createContext<TabsCtx>({
  tabs: [],
  activeTabId: null,
  openTab: () => {},
  closeTab: () => {},
  activateTab: () => {},
  setDirty: () => {},
  syncFromPath: () => {},
});

function pathToTab(path: string): Omit<Tab, "id"> | null {
  // /fhir-ui/settings → CFG Servers
  if (path === "/fhir-ui/settings") {
    return { kind: "CFG", label: "Servers", path, dirty: false };
  }
  // /fhir-ui/:resourceType/:id/edit → PUT id
  const editMatch = path.match(/^\/fhir-ui\/([^/]+)\/([^/]+)\/edit$/);
  if (editMatch?.[2]) {
    return { kind: "PUT", label: editMatch[2], path, dirty: false };
  }
  // /fhir-ui/:resourceType/new → POST resourceType (new)
  const newMatch = path.match(/^\/fhir-ui\/([^/]+)\/new$/);
  if (newMatch?.[1]) {
    return { kind: "POST", label: `${newMatch[1]} (new)`, path, dirty: true };
  }
  // /fhir-ui/:resourceType/:id → GET id
  const detailMatch = path.match(/^\/fhir-ui\/([^/]+)\/([^/]+)$/);
  if (detailMatch?.[2]) {
    return { kind: "GET", label: detailMatch[2], path, dirty: false };
  }
  // /fhir-ui/:resourceType → GET resourceType
  const listMatch = path.match(/^\/fhir-ui\/([^/]+)$/);
  if (listMatch?.[1]) {
    return { kind: "GET", label: listMatch[1], path, dirty: false };
  }
  return null;
}

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => saveState(state), [state]);

  const openTab = useCallback((tab: Omit<Tab, "id">) => {
    dispatch({
      type: "OPEN",
      tab: { ...tab, id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
    });
  }, []);

  const closeTab = useCallback((id: string) => dispatch({ type: "CLOSE", id }), []);
  const activateTab = useCallback((id: string) => dispatch({ type: "ACTIVATE", id }), []);
  const setDirty = useCallback(
    (id: string, dirty: boolean) => dispatch({ type: "SET_DIRTY", id, dirty }),
    [],
  );

  const syncFromPath = useCallback(
    (path: string) => {
      const tabSpec = pathToTab(path);
      if (!tabSpec) return;
      const existing = state.tabs.find((t) => t.path === path);
      if (existing) {
        dispatch({ type: "ACTIVATE", id: existing.id });
      } else {
        dispatch({
          type: "OPEN",
          tab: {
            ...tabSpec,
            id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        });
      }
    },
    [state.tabs],
  );

  return (
    <TabsContext.Provider
      value={{
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        openTab,
        closeTab,
        activateTab,
        setDirty,
        syncFromPath,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
}

export const useTabs = () => useContext(TabsContext);

/** Syncs tab state from route changes. Drop this anywhere inside <Router>. */
export function RouteTabSync() {
  const location = useLocation();
  const { syncFromPath } = useTabs();
  useEffect(() => {
    syncFromPath(location.pathname);
  }, [location.pathname, syncFromPath]);
  return null;
}

/** Navigates to a tab's path when the tab is clicked. */
export function TabNavigator() {
  const { tabs, activeTabId } = useTabs();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const active = tabs.find((t) => t.id === activeTabId);
    if (active && active.path !== location.pathname) {
      navigate(active.path);
    }
  }, [activeTabId, tabs, navigate, location.pathname]);

  return null;
}

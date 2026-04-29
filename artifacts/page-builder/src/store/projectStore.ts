import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  createElement,
} from "react";
import type { Project, Section, MasterStyle, SectionType } from "@/types";
import { SECTION_CONFIGS } from "@/types";

const STORAGE_KEY = "page-builder-projects";

interface State {
  projects: Project[];
  currentProjectId: string | null;
  currentSectionIndex: number;
}

type Action =
  | { type: "LOAD"; projects: Project[] }
  | {
      type: "CREATE_PROJECT";
      project: Omit<Project, "masterStyle" | "sections" | "createdAt">;
    }
  | { type: "SET_CURRENT"; id: string }
  | { type: "SET_SECTION_INDEX"; index: number }
  | { type: "UPDATE_MASTER_STYLE"; id: string; style: MasterStyle }
  | {
      type: "ADD_SECTION";
      projectId: string;
      sectionType: SectionType;
    }
  | {
      type: "UPDATE_SECTION";
      projectId: string;
      sectionId: string;
      updates: Partial<Section>;
    }
  | {
      type: "REMOVE_SECTION";
      projectId: string;
      sectionId: string;
    }
  | {
      type: "REORDER_SECTIONS";
      projectId: string;
      fromIndex: number;
      toIndex: number;
    }
  | { type: "DELETE_PROJECT"; id: string };

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultSections(): Section[] {
  return SECTION_CONFIGS.map((config) => ({
    id: generateId(),
    type: config.type,
    userInputs: {},
    uploadedImages: [],
    generatedPrompt: "",
    generatedImageUrl: null,
    status: "idle" as const,
  }));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD":
      return { ...state, projects: action.projects };

    case "CREATE_PROJECT": {
      const newProject: Project = {
        ...action.project,
        masterStyle: {
          designStyle: "premium-minimal",
          mainColor: "#2D3748",
          backgroundStyle: "white",
          fontMood: "clean-gothic",
          tone: "trust",
        },
        sections: createDefaultSections(),
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        projects: [...state.projects, newProject],
        currentProjectId: newProject.id,
        currentSectionIndex: 0,
      };
    }

    case "SET_CURRENT":
      return { ...state, currentProjectId: action.id, currentSectionIndex: 0 };

    case "SET_SECTION_INDEX":
      return { ...state, currentSectionIndex: action.index };

    case "UPDATE_MASTER_STYLE":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? { ...p, masterStyle: action.style } : p,
        ),
      };

    case "ADD_SECTION": {
      const config = SECTION_CONFIGS.find((c) => c.type === action.sectionType);
      if (!config) return state;
      const newSection: Section = {
        id: generateId(),
        type: action.sectionType,
        userInputs: {},
        uploadedImages: [],
        generatedPrompt: "",
        generatedImageUrl: null,
        status: "idle",
      };
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId
            ? { ...p, sections: [...p.sections, newSection] }
            : p,
        ),
      };
    }

    case "UPDATE_SECTION":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId
            ? {
                ...p,
                sections: p.sections.map((s) =>
                  s.id === action.sectionId ? { ...s, ...action.updates } : s,
                ),
              }
            : p,
        ),
      };

    case "REMOVE_SECTION":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId
            ? {
                ...p,
                sections: p.sections.filter((s) => s.id !== action.sectionId),
              }
            : p,
        ),
      };

    case "REORDER_SECTIONS": {
      return {
        ...state,
        projects: state.projects.map((p) => {
          if (p.id !== action.projectId) return p;
          const sections = [...p.sections];
          const [removed] = sections.splice(action.fromIndex, 1);
          sections.splice(action.toIndex, 0, removed);
          return { ...p, sections };
        }),
      };
    }

    case "DELETE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        currentProjectId:
          state.currentProjectId === action.id
            ? null
            : state.currentProjectId,
      };

    default:
      return state;
  }
}

interface StoreContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  currentProject: Project | null;
  currentSection: Section | null;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function ProjectStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    projects: [],
    currentProjectId: null,
    currentSectionIndex: 0,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const projects = JSON.parse(raw) as Project[];
        dispatch({ type: "LOAD", projects });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
    } catch {
      // ignore
    }
  }, [state.projects]);

  const currentProject =
    state.projects.find((p) => p.id === state.currentProjectId) ?? null;

  const currentSection =
    currentProject?.sections[state.currentSectionIndex] ?? null;

  return createElement(
    StoreContext.Provider,
    { value: { state, dispatch, currentProject, currentSection } },
    children,
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within ProjectStoreProvider");
  return ctx;
}

export function useProject(id: string): Project | null {
  const { state } = useStore();
  return state.projects.find((p) => p.id === id) ?? null;
}

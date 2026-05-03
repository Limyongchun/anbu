import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "@/types";

interface ProjectStore {
  projects: Project[];
  addProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      addProject: (project) =>
        set((state) => ({ projects: [project, ...state.projects] })),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
    }),
    { name: "project-store" }
  )
);

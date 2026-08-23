"use client";

import { useState } from "react";
import { Plus, FolderOpen, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ProjectCardLarge } from "@/components/project-card-large";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTasks, useGoals, useProjects, useAgents } from "@/hooks/use-data";
import { Tip } from "@/components/ui/tip";
import type { Project, ProjectStatus } from "@/lib/types";
import { useActiveRunsContext as useActiveRuns } from "@/providers/active-runs-provider";
import { ProjectCardSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/error-state";

export default function ProjectsPage() {
  const { projects, loading, create: createProject, update: updateProject, remove: deleteProject, error: projectsError, refetch: refetchProjects } = useProjects();
  const { tasks } = useTasks();
  const { goals } = useGoals();
  const { agents } = useAgents();
  const { isProjectRunning, isProjectRunActive, runProject, stopProject } = useActiveRuns();

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const handleCreateProject = async (data: { name: string; description: string; color: string; tags: string; teamMembers?: string[] }) => {
    await createProject({
      id: `proj_${Date.now()}`,
      name: data.name,
      description: data.description,
      status: "active",
      color: data.color,
      teamMembers: data.teamMembers ?? [],
      tags: data.tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    });
  };

  const handleEditProject = async (data: {
    name: string;
    description: string;
    status: ProjectStatus;
    color: string;
    teamMembers: string[];
    tags: string[];
  }) => {
    if (!editingProject) return;
    await updateProject(editingProject.id, data);
    setEditingProject(null);
  };

  const handleArchiveProject = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    await updateProject(id, { status: project.status === "archived" ? "active" : "archived" });
  };

  const handleDeleteProject = async () => {
    if (!deletingProjectId) return;
    await deleteProject(deletingProjectId);
    setDeletingProjectId(null);
  };

  const archivedCount = projects.filter((p) => p.status === "archived").length;
  const visibleProjects = showArchived ? projects : projects.filter((p) => p.status !== "archived");

  if (loading) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Ventures" }]} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav items={[{ label: "Ventures" }]} />
        <ErrorState message={projectsError} onRetry={refetchProjects} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: "Ventures" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Ventures</h1>
          {archivedCount > 0 && (
            <Tip content="Toggle archived ventures">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showArchived ? "Hide" : "Show"} archived ({archivedCount})
              </Button>
            </Tip>
          )}
        </div>
        <Tip content="Create a new venture">
          <Button size="sm" onClick={() => setShowCreateProject(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Venture
          </Button>
        </Tip>
      </div>

      {visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No ventures yet"
          description="Ventures help you organize tasks and track progress across your businesses and products."
          actionLabel="Create a venture"
          onAction={() => setShowCreateProject(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCardLarge
              key={project.id}
              project={project}
              tasks={tasks}
              goals={goals}
              isRunning={isProjectRunning(project.id)}
              isProjectRunActive={isProjectRunActive(project.id)}
              onRun={runProject}
              onStop={stopProject}
              onEdit={(id) => {
                const p = projects.find((proj) => proj.id === id);
                if (p) setEditingProject(p);
              }}
              onArchive={handleArchiveProject}
              onDelete={setDeletingProjectId}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSubmit={handleCreateProject}
      />

      {editingProject && (
        <EditProjectDialog
          open={!!editingProject}
          onOpenChange={(open) => { if (!open) setEditingProject(null); }}
          project={editingProject}
          agents={agents}
          onSubmit={handleEditProject}
        />
      )}

      <ConfirmDialog
        open={!!deletingProjectId}
        onOpenChange={(open) => { if (!open) setDeletingProjectId(null); }}
        title="Delete venture"
        description="This will permanently delete this venture and unlink all associated tasks. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, StarIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Button } from "@tsu-stack/ui/components/button";

import { HeaderActions } from "@/shared/ui/header-actions";
import { ListItem } from "@/shared/ui/list-item";

import {
  ItemInfoPanel,
  ItemsEmpty,
  ItemsNavProvider,
  ListSkeleton,
  PageHeader,
  PageLayout,
  isAnyOpened,
  useItemsNavigation
} from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useResumeStore } from "@/pages/dashboard/resumes/_lib/resume.slice";

export function ResumesPage() {
  const { openedItem, isItemOpen, setOpenedItem, setIsItemOpen, openItem } = useResumeStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const resumesQuery = useQuery(orpcQueryClient.resume.list.queryOptions());
  const visibleResumes = useMemo(() => resumesQuery.data ?? [], [resumesQuery.data]);

  const invalidateQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: orpcQueryClient.resume.list.queryKey()
    });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/resume/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Failed to delete resume");
      return res.json() as Promise<{ success: boolean }>;
    },
    onSuccess: async () => {
      await invalidateQueries();
      toast.success("Resume deleted.");
    },
    onError: () => {
      toast.error("Failed to delete resume.");
    }
  });

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/resume/generate", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate resume");
      await invalidateQueries();
      toast.success("Resume generated!");
    } catch {
      toast.error("Failed to generate resume.");
    } finally {
      setIsGenerating(false);
    }
  }

  const containerRef = useRef<HTMLUListElement | null>(null);

  const { handleNext, handlePrev } = useItemsNavigation({
    items: visibleResumes,
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    containerRef
  });

  const isAnyOpen = isAnyOpened(isItemOpen);

  useEffect(() => {
    if (!resumesQuery.isLoading && visibleResumes.length === 0 && openedItem) {
      setOpenedItem(null);
      setIsItemOpen(null);
    }
  }, [resumesQuery.isLoading, visibleResumes.length, openedItem, setOpenedItem, setIsItemOpen]);

  const emptyState = (
    <ItemsEmpty
      title="No resumes yet"
      description="Generate your first resume to get started."
      action={
        <Button onClick={handleGenerate} loading={isGenerating}>
          Generate New Resume
        </Button>
      }
    />
  );

  function renderList() {
    if (resumesQuery.isLoading) return <ListSkeleton />;
    if (visibleResumes.length === 0) return emptyState;

    return (
      <ul ref={containerRef} className="flex flex-col gap-2">
        {visibleResumes.map((resume) => (
          <ListItem
            key={resume.id}
            selected={isItemOpen?.[resume.id] ?? false}
            onSelect={() => openItem(resume.id, resume)}
            onView={() => window.open(`/api/resume/download/?id=${resume.id}&view=1`, "_blank")}
            onDelete={() => deleteMutation.mutate(resume.id)}
            isDeleting={deleteMutation.isPending}
            deleteTitle="Delete this resume?"
            deleteDescription="This will permanently delete this resume PDF."
            title={resume.filename}
            meta={
              <p className="flex items-center gap-1">
                <FileTextIcon size={14} />
                <span>{resume.author}</span>
                {resume.default && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600">
                    <StarIcon size={12} />
                    Default
                  </span>
                )}
              </p>
            }
          />
        ))}
      </ul>
    );
  }

  return (
    <ItemsNavProvider value={{ handleNext, handlePrev }}>
      <PageLayout>
        <PageHeader
          title="Resumes"
          description="Generate and manage your resume PDFs."
          actions={
            <HeaderActions
              add={{
                onAdd: handleGenerate,
                label: "Generate New Resume",
                isLoading: isGenerating
              }}
            />
          }
        />

        {renderList()}

        <ItemsInfoPanel open={isAnyOpen} item={openedItem}>
          {(item) => {
            if (!item) return null;
            return (
              <ItemInfoPanel
                title={item.filename}
                description={`Author: ${item.author}${item.default ? " • Default" : ""}`}
                createdAt={item.createdAt}
                className="p-0"
              >
                <embed
                  src={`/api/resume/download/?id=${item.id}&view=1`}
                  type="application/pdf"
                  className="min-h-150 w-full overflow-hidden rounded-lg"
                />
              </ItemInfoPanel>
            );
          }}
        </ItemsInfoPanel>
      </PageLayout>
    </ItemsNavProvider>
  );
}

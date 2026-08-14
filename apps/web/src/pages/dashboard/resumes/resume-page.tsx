"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { DownloadIcon, FileTextIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ResumeAuthor } from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";

import {
  areAllVisibleSelected,
  isBatchSelectActive,
  isIdSelected,
  selectedIdsFromState
} from "@/shared/lib/batch-selection";
import { toastAiError } from "@/shared/lib/toast-ai-error";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
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

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";
import { useResumeStore } from "@/pages/dashboard/resumes/_lib/resume.slice";

const resumesRouteApi = getRouteApi("/(root-layout)/__protected/dashboard/resumes/");

function ResumeTypeBadges({ author, isDefault }: { author: ResumeAuthor; isDefault: boolean }) {
  return (
    <>
      <Badge variant="secondary" size="sm">
        {author}
      </Badge>
      {isDefault ? <Badge size="sm">Default</Badge> : null}
    </>
  );
}

export function ResumesPage() {
  const {
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    openItem,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection
  } = useResumeStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { resumeId: deepLinkResumeId } = resumesRouteApi.useSearch();

  const resumesQuery = useQuery(orpcQueryClient.resume.list.queryOptions());
  const visibleResumes = useMemo(() => resumesQuery.data ?? [], [resumesQuery.data]);

  // Open side panel when arriving with ?resumeId= from applications (or elsewhere).
  useEffect(() => {
    if (!deepLinkResumeId || resumesQuery.isLoading) return;
    const resume = visibleResumes.find((r) => r.id === deepLinkResumeId);
    if (!resume) return;
    setOpenedItem(resume);
    setIsItemOpen({ [resume.id]: true });
    void navigate({
      to: "/dashboard/resumes",
      search: {},
      replace: true
    });
  }, [
    deepLinkResumeId,
    visibleResumes,
    resumesQuery.isLoading,
    setOpenedItem,
    setIsItemOpen,
    navigate
  ]);

  const invalidateQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: orpcQueryClient.resume.list.queryKey()
    });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (input: { ids: string[] }) => {
      const res = await orpcClient.resume.delete({ ids: input.ids });
      return res;
    },
    onSuccess: async () => {
      await invalidateQueries();
    }
  });

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await orpcClient.resume.generate();
      await invalidateQueries();
      toast.success("Resume generated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate resume.";
      toastAiError(message, { feature: "resume", severity: "hard" });
    }
    setIsGenerating(false);
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

  const [batchAction, setBatchAction] = useState<"delete" | null>(null);
  const selectedIdList = selectedIdsFromState(selectedIds);
  const selectedCount = selectedIdList.length;
  const resumeIds = useMemo(() => visibleResumes.map((r) => r.id), [visibleResumes]);
  const allVisibleSelected = areAllVisibleSelected(selectedIds, resumeIds);
  const batchSelectActive = isBatchSelectActive(selectedIds);
  const isDeleting = batchAction === "delete";

  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  async function handleBatchDelete() {
    setBatchAction("delete");
    const ids = selectedIdList;

    try {
      await deleteMutation.mutateAsync({ ids });
      toast.success(`Deleted ${ids.length} resume(s).`);
      clearSelection();
      setBatchDeleteDialogOpen(false);
    } catch {
      toast.error("Deletion failed.");
    }
    setBatchAction(null);
  }

  useEffect(() => {
    if (!resumesQuery.isLoading && visibleResumes.length === 0) {
      if (openedItem) {
        setOpenedItem(null);
        setIsItemOpen(null);
      }
      if (selectedIds) clearSelection();
    }
  }, [
    resumesQuery.isLoading,
    visibleResumes.length,
    openedItem,
    setOpenedItem,
    setIsItemOpen,
    selectedIds,
    clearSelection
  ]);

  const emptyState = (
    <ItemsEmpty
      icon={<FileTextIcon aria-hidden />}
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
            isBatchSelected={isIdSelected(selectedIds, resume.id)}
            batchSelectActive={batchSelectActive}
            onToggleSelect={() => toggleSelect(resume.id)}
            onView={() => window.open(`/api/resume/download/?id=${resume.id}&view=1`, "_blank")}
            onDelete={() => {
              deleteMutation.mutate(
                { ids: [resume.id] },
                { onSuccess: () => toast.success("Resume deleted.") }
              );
            }}
            isDeleting={deleteMutation.isPending}
            deleteTitle="Delete this resume?"
            deleteDescription="This will permanently delete this resume PDF."
            title={resume.filename}
            titleEnd={<ResumeTypeBadges author={resume.author} isDefault={resume.default} />}
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

        <BatchSelectionBar
          selectedCount={selectedCount}
          totalCount={resumeIds.length}
          allVisibleSelected={allVisibleSelected}
          isDeleting={isDeleting}
          onDeleteSelected={() => setBatchDeleteDialogOpen(true)}
          onSelectAll={() => selectAll(resumeIds)}
          onClearSelection={clearSelection}
        />

        {renderList()}

        <ItemsInspectHost
          open={isAnyOpen}
          item={openedItem}
          title="Resume"
          onOpenChange={(next) => {
            if (!next) {
              setOpenedItem(null);
              setIsItemOpen(null);
            }
          }}
        >
          {(item) => {
            if (!item) return null;
            return (
              <ItemInfoPanel
                eyebrow={<FileTextIcon strokeWidth={1.75} />}
                title={item.filename}
                description={
                  <span className="flex flex-wrap items-center gap-1.5">
                    <ResumeTypeBadges author={item.author} isDefault={item.default} />
                  </span>
                }
                actions={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    render={
                      <a
                        href={`/api/resume/download/?id=${item.id}`}
                        download
                        aria-label={`Download ${item.filename}`}
                      />
                    }
                  >
                    <DownloadIcon strokeWidth={2} />
                  </Button>
                }
                updatedAt={item.updatedAt}
                createdAt={item.createdAt}
              >
                <embed
                  src={`/api/resume/download/?id=${item.id}&view=1`}
                  type="application/pdf"
                  className="min-h-150 w-full overflow-hidden rounded-xl border border-border/50 bg-muted/20"
                  title={item.filename}
                />
              </ItemInfoPanel>
            );
          }}
        </ItemsInspectHost>

        <AlertDialog
          open={batchDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open && isDeleting) return;
            setBatchDeleteDialogOpen(open);
          }}
        >
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} resume(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected resume PDFs.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                loading={isDeleting}
                onClick={() => {
                  void handleBatchDelete();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </PageLayout>
    </ItemsNavProvider>
  );
}

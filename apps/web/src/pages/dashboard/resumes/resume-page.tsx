"use client";

import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Building2Icon, FileTextIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
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
import { Button } from "@tsu-stack/ui/components/button";
import { type FilterValue } from "@tsu-stack/ui/components/filters";
import { TruncatedText } from "@tsu-stack/ui/components/truncated-text";

import {
  areAllVisibleSelected,
  isBatchSelectActive,
  selectedIdsFromState
} from "@/shared/lib/batch-selection";
import { omitSearchKey, scheduleAfterLayoutClose } from "@/shared/lib/list-inspect-search";
import { expandDashboardSidePanel } from "@/shared/lib/side-panel-control";
import { toastAiError } from "@/shared/lib/toast-ai-error";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
import { HeaderActions } from "@/shared/ui/header-actions";
import { ITEM_AVATAR_EYEBROW_CLASSNAME, ItemAvatar } from "@/shared/ui/item-avatar";
import { JobIdentityMark } from "@/shared/ui/job-card-marks";

import {
  ItemInfoPanel,
  ItemsEmpty,
  ItemsGrid,
  ItemsNavProvider,
  ListSearchBar,
  PageHeader,
  PageLayout,
  createEmptyableField,
  filterValuesFromRsql,
  isAnyOpened,
  isListNarrowed,
  isListQueryBadRequest,
  rsqlFromFilterValues,
  useItemsGridColumnCount,
  useItemsNavigation,
  withListSearch,
  type ListSearch
} from "@/widgets/items-page";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";
import {
  primaryResumeJob,
  resumeAvatarSeed,
  resumeCardTitle
} from "@/pages/dashboard/resumes/_lib/resume-identity";
import { useResumeStore } from "@/pages/dashboard/resumes/_lib/resume.slice";
import { useListResumesQuery } from "@/pages/dashboard/resumes/api/list-resumes.query";
import { ResumeActionGroup } from "@/pages/dashboard/resumes/ui/resume-action-group";
import { ResumeItem, ResumeTypeBadges } from "@/pages/dashboard/resumes/ui/resume-item";

const resumesRouteApi = getRouteApi("/(root-layout)/__protected/dashboard/resumes/");

const RESUMES_SORT_OPTIONS = [
  { value: "updatedAt", label: "Updated" },
  { value: "createdAt", label: "Created" }
] as const;

const RESUME_FILTER_FIELDS = [createEmptyableField("tiedToJob", "Tied to a job")];

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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = resumesRouteApi.useSearch();
  const deepLinkResumeId = search.resumeId;
  const listQuery = useMemo(() => {
    return {
      q: search.q,
      filter: search.filter,
      sortBy: search.sortBy,
      sortDir: search.sortDir
    };
  }, [search.q, search.filter, search.sortBy, search.sortDir]);
  const resumesQuery = useListResumesQuery(listQuery);
  const visibleResumes = useMemo(() => resumesQuery.data ?? [], [resumesQuery.data]);
  const narrowed = isListNarrowed({ q: search.q, filter: search.filter, page: "resumes" });

  const patchListSearch = useCallback(
    (patch: Partial<Pick<ListSearch, "q" | "filter" | "sortBy" | "sortDir">>) => {
      void navigate({
        to: "/dashboard/resumes",
        search: (prev) => withListSearch(prev, patch),
        replace: true
      });
    },
    [navigate]
  );

  const clearListSearch = useCallback(() => {
    patchListSearch({ q: undefined, filter: undefined });
  }, [patchListSearch]);

  const filterValues = useMemo(
    () => filterValuesFromRsql(search.filter, "resumes"),
    [search.filter]
  );

  // Open side panel when arriving with ?resumeId= from applications (or elsewhere).
  useEffect(() => {
    if (!deepLinkResumeId || resumesQuery.isLoading) return;
    const resume = visibleResumes.find((r) => r.id === deepLinkResumeId);
    if (!resume) return;
    return scheduleAfterLayoutClose(() => {
      expandDashboardSidePanel();
      setOpenedItem(resume);
      setIsItemOpen({ [resume.id]: true });
      void navigate({
        to: "/dashboard/resumes",
        search: (prev) => omitSearchKey(prev, "resumeId"),
        replace: true
      });
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

  const generateMutation = useMutation(
    orpcQueryClient.resume.generate.mutationOptions({
      onSuccess: async () => {
        await invalidateQueries();
        toast.success("Resume generated");
      },
      onError: (error) => {
        if (isDefinedError(error)) {
          switch (error.code) {
            case "PDF_ENGINE_UNAVAILABLE":
              toast.error(
                error.message ?? "PDF engine is unavailable (rendercv or typst missing on PATH)."
              );
              return;
            case "PDF_RENDER_FAILED":
              toast.error(error.message ?? "Failed to render resume PDF.");
              return;
          }
        }

        toastAiError(error.message || "Failed to generate resume.", {
          feature: "resume",
          severity: "hard"
        });
      }
    })
  );

  const isGenerating = generateMutation.isPending;

  function handleGenerate() {
    generateMutation.mutate(undefined);
  }

  const gridRef = useRef<HTMLDivElement>(null);
  const gridColumnCount = useItemsGridColumnCount();

  const itemsNav = useItemsNavigation({
    items: visibleResumes,
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    layout: "grid",
    columnCount: gridColumnCount,
    containerRef: gridRef
  });

  const isAnyOpen = isAnyOpened(isItemOpen);
  const inspectItem = useMemo(() => {
    if (!openedItem) return null;
    return visibleResumes.find((resume) => resume.id === openedItem.id) ?? openedItem;
  }, [openedItem, visibleResumes]);

  const [batchAction, setBatchAction] = useState<"delete" | null>(null);
  const selectedIdList = selectedIdsFromState(selectedIds);
  const selectedCount = selectedIdList.length;
  const resumeIds = useMemo(() => visibleResumes.map((r) => r.id), [visibleResumes]);
  const allVisibleSelected = areAllVisibleSelected(selectedIds, resumeIds);
  const batchSelectActive = isBatchSelectActive(selectedIds);
  const isDeleting = batchAction === "delete";

  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const deleteTarget = visibleResumes.find((resume) => resume.id === deleteResumeId) ?? null;

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
    if (!resumesQuery.isError || !isListQueryBadRequest(resumesQuery.error)) return;
    toast.error(
      resumesQuery.error instanceof Error
        ? resumesQuery.error.message
        : "Invalid filters. They were cleared."
    );
    if (search.filter || search.sortBy || search.sortDir) {
      patchListSearch({ filter: undefined, sortBy: undefined, sortDir: undefined });
    }
  }, [
    resumesQuery.isError,
    resumesQuery.error,
    search.filter,
    search.sortBy,
    search.sortDir,
    patchListSearch
  ]);

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

  const emptyState = narrowed ? (
    <ItemsEmpty
      icon={<FileTextIcon aria-hidden />}
      title="No resumes match"
      description="Try a different search or clear filters to see all resumes."
      action={
        <Button type="button" variant="outline" onClick={clearListSearch}>
          Clear filters
        </Button>
      }
    />
  ) : (
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

  return (
    <ItemsNavProvider value={{ ...itemsNav, containerRef: gridRef }}>
      <PageLayout>
        <PageHeader
          title="Resumes"
          description="PDFs tailored to jobs you apply to, plus a general resume."
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

        <ListSearchBar
          variant="catalog"
          fields={RESUME_FILTER_FIELDS}
          value={filterValues as FilterValue[]}
          onValueChange={(value) => {
            patchListSearch({ filter: rsqlFromFilterValues(value, "resumes") });
          }}
          q={search.q}
          onQChange={(q) => {
            patchListSearch({ q });
          }}
          sortBy={search.sortBy}
          sortDir={search.sortDir}
          sortOptions={RESUMES_SORT_OPTIONS}
          onSortChange={(next) => {
            patchListSearch({ sortBy: next.sortBy, sortDir: next.sortDir });
          }}
          labels={{
            searchPlaceholder: "Search resumes",
            searchAriaLabel: "Search resumes"
          }}
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

        <ItemsGrid
          items={visibleResumes}
          isLoading={resumesQuery.isLoading}
          emptyState={emptyState}
          containerRef={gridRef}
          renderItem={(resume) => (
            <ResumeItem
              resume={resume}
              isChecked={Boolean(selectedIds?.[resume.id])}
              batchSelectActive={batchSelectActive}
              isOpen={Boolean(isItemOpen?.[resume.id])}
              onOpen={openItem}
              onToggleSelect={toggleSelect}
              onDelete={(id) => {
                deleteMutation.mutate(
                  { ids: [id] },
                  {
                    onSuccess: () => {
                      toast.success("Resume deleted.");
                      if (openedItem?.id === id) {
                        setOpenedItem(null);
                        setIsItemOpen(null);
                      }
                    }
                  }
                );
              }}
              isDeleting={
                deleteMutation.isPending &&
                Boolean(deleteMutation.variables?.ids.includes(resume.id))
              }
            />
          )}
        />

        <ItemsInspectHost
          open={isAnyOpen}
          item={inspectItem}
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
            const job = primaryResumeJob(item);
            const title = resumeCardTitle(item);
            return (
              <ItemInfoPanel
                eyebrow={
                  job ? (
                    <JobIdentityMark
                      companyName={job.companyName}
                      logoUrl={job.companyLogoUrl}
                      size={48}
                      selected
                      className="size-12"
                    />
                  ) : (
                    <ItemAvatar
                      name={resumeAvatarSeed(item)}
                      size={48}
                      selected
                      className="size-12"
                      aria-label={title}
                    />
                  )
                }
                eyebrowClassName={ITEM_AVATAR_EYEBROW_CLASSNAME}
                title={title}
                description={
                  <div className="space-y-2.5">
                    {job ? (
                      <p className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                          <Building2Icon
                            className="size-3.5 shrink-0 text-muted-foreground"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <TruncatedText>{job.companyName}</TruncatedText>
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not tied to a tracked job.</p>
                    )}
                    <span className="flex flex-wrap items-center gap-1.5">
                      <ResumeTypeBadges author={item.author} isDefault={item.default} />
                    </span>
                    <p className="truncate text-xs text-muted-foreground" title={item.filename}>
                      {item.filename}
                    </p>
                  </div>
                }
                actions={
                  <ResumeActionGroup
                    resume={item}
                    onDelete={() => setDeleteResumeId(item.id)}
                    isDeleting={
                      deleteMutation.isPending &&
                      Boolean(deleteMutation.variables?.ids.includes(item.id))
                    }
                  />
                }
                updatedAt={item.updatedAt}
                createdAt={item.createdAt}
                navLayout="grid"
              >
                <embed
                  src={`/api/resume/download/?id=${item.id}&view=1`}
                  type="application/pdf"
                  className="min-h-150 w-full overflow-hidden rounded-xl border border-border/50 bg-muted/20"
                  title={title}
                />
              </ItemInfoPanel>
            );
          }}
        </ItemsInspectHost>

        <AlertDialog
          open={deleteResumeId != null}
          onOpenChange={(open) => {
            if (!open && deleteMutation.isPending) return;
            if (!open) setDeleteResumeId(null);
          }}
        >
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete{deleteTarget ? ` “${resumeCardTitle(deleteTarget)}”` : " this resume"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this resume PDF.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                loading={deleteMutation.isPending}
                onClick={() => {
                  if (!deleteResumeId) return;
                  const id = deleteResumeId;
                  deleteMutation.mutate(
                    { ids: [id] },
                    {
                      onSuccess: () => {
                        toast.success("Resume deleted.");
                        setDeleteResumeId(null);
                        if (openedItem?.id === id) {
                          setOpenedItem(null);
                          setIsItemOpen(null);
                        }
                      }
                    }
                  );
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>

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

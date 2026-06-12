export function parseRepoRouteSplat({
  branchNames,
  defaultBranch,
  splat
}: {
  branchNames: string[];
  defaultBranch: string;
  splat?: string;
}) {
  if (!splat) {
    return {
      path: "",
      ref: defaultBranch
    };
  }

  const normalizedSplat = splat.replace(/^\/+|\/+$/g, "");
  if (!normalizedSplat) {
    return {
      path: "",
      ref: defaultBranch
    };
  }

  const sortedBranchNames = Array.from(branchNames);
  sortedBranchNames.sort((left: string, right: string) => right.length - left.length);

  const matchingBranch = sortedBranchNames.find(
    (branchName: string) =>
      normalizedSplat === branchName || normalizedSplat.startsWith(`${branchName}/`)
  );

  if (!matchingBranch) {
    const [firstSegment, ...pathSegments] = normalizedSplat.split("/");

    return {
      path: pathSegments.join("/"),
      ref: firstSegment || defaultBranch
    };
  }

  return {
    path: normalizedSplat.slice(matchingBranch.length).replace(/^\/+/, ""),
    ref: matchingBranch
  };
}

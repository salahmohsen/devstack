export function formatRelativeTime(dateString: string | null) {
  if (!dateString) {
    return "Unknown";
  }

  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));

  if (diffDays >= 365) {
    return `${Math.round(diffDays / 365)}y ago`;
  }
  if (diffDays >= 30) {
    return `${Math.round(diffDays / 30)}mo ago`;
  }
  if (diffDays >= 7) {
    return `${Math.round(diffDays / 7)}w ago`;
  }

  return `${diffDays}d ago`;
}

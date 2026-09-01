export function formatElapsedTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours) return `${hours}h ${minutes}min ${remainingSeconds}s`;
  if (minutes) return `${minutes}min ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export function estimateRemainingTime(startedAt: number, completed: number, total: number, now = Date.now()): number | null {
  if (completed < 2 || now - startedAt < 2000 || total <= completed) return null;
  return ((now - startedAt) / completed) * (total - completed);
}

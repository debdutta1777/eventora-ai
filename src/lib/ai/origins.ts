/** Exact origins only. APP_ORIGINS can replace these defaults for another deployment. */
export function plannerOrigins(configured?: string): string[] {
  return (
    configured ??
    "https://eventora-ai-phi.vercel.app,http://terminal.local:4173,http://localhost:5173,http://localhost:4173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

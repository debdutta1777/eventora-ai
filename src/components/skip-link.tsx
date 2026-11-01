/** Native fragment navigation moves keyboard focus to the page's main landmark. */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground shadow-lg focus:not-sr-only"
    >
      Skip to main content
    </a>
  );
}

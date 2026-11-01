import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/pages/dashboard-page";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Eventora AI" },
      {
        name: "description",
        content: "Every event you are planning, with budgets and progress at a glance.",
      },
      { property: "og:title", content: "Dashboard — Eventora AI" },
      {
        property: "og:description",
        content: "Every event you are planning, with budgets and progress at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

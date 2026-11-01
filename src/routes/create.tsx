import { createFileRoute } from "@tanstack/react-router";
import { CreateEvent } from "@/components/pages/create-event-page";

export const Route = createFileRoute("/create")({
  component: CreateEvent,
  head: () => ({
    meta: [
      { title: "Create event — Eventora AI" },
      {
        name: "description",
        content: "Answer a short brief and get a complete plan: budget, tasks, vendors and ideas.",
      },
      { property: "og:title", content: "Create event — Eventora AI" },
      {
        property: "og:description",
        content: "Answer a short brief and get a complete plan: budget, tasks, vendors and ideas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

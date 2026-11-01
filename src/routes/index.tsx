import { createFileRoute } from "@tanstack/react-router";
import { Index } from "@/components/pages/landing-page";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Eventora AI — Plan beautiful events" },
      {
        name: "description",
        content:
          "Eventora AI turns a short brief into a full plan: budget allocations, tasks, vendor checklists and ideas for weddings, birthdays and community events.",
      },
      { property: "og:title", content: "Eventora AI — Plan beautiful events" },
      {
        property: "og:description",
        content: "Turn a short brief into a complete event plan: budget, tasks, vendors and ideas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

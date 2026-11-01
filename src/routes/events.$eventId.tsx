import { createFileRoute } from "@tanstack/react-router";
import { EventWorkspace } from "@/components/pages/event-workspace-page";

export const Route = createFileRoute("/events/$eventId")({
  component: function EventRoute() {
    return <EventWorkspace eventId={Route.useParams().eventId} />;
  },
  head: () => ({
    meta: [
      { title: "Event workspace — Eventora AI" },
      {
        name: "description",
        content: "Budget, tasks, vendors and ideas for this event — all in one workspace.",
      },
      { property: "og:title", content: "Event workspace — Eventora AI" },
      {
        property: "og:description",
        content: "Budget, tasks, vendors and ideas for this event — all in one workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

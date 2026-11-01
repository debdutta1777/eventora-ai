import { VendorStatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
  type EventRecord,
  type VendorStatus,
} from "@/lib/types";
import { useEvents } from "@/state/events-context";

export function VendorsTab({ event }: { event: EventRecord }) {
  const { setVendorStatus, toggleVendorDone } = useEvents();

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        A checklist of what to arrange — move each item from “needed” to “confirmed”. The notes
        remind you what to check; no businesses are invented here.
      </p>
      {event.vendorGroups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">{group.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="min-w-48 flex-1">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={(checked) =>
                        toggleVendorDone(event.id, item.id, checked === true)
                      }
                      aria-label={`Mark ${item.title} as done`}
                    />
                    <span
                      className={
                        item.done
                          ? "text-sm font-medium text-muted-foreground line-through"
                          : "text-sm font-medium text-foreground"
                      }
                    >
                      {item.title}
                    </span>
                  </label>
                  <p className="mt-1 pl-6 text-xs text-muted-foreground">{item.note}</p>
                </div>
                <div className="flex items-center gap-3">
                  <VendorStatusBadge status={item.status} />
                  <Select
                    value={item.status}
                    onValueChange={(v) => setVendorStatus(event.id, item.id, v as VendorStatus)}
                  >
                    <SelectTrigger className="w-36" aria-label={`Status for ${item.title}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDOR_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {VENDOR_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


import {
  CheckCircle2,
  Clock3,
  XCircle,
  BrainCircuit,
  Activity,
} from "lucide-react";

import type { RecentActivity } from "@/features/dashboard/types";

interface RecentActivityProps {
  activities: RecentActivity[];
}

const eventLabels: Record<string, string> = {
  goal_received: "Agent goal received",
  tool_selected: "AI tool selected",
  tool_executed: "Tool executed",
  opportunities_identified: "Retention opportunities identified",
  action_plan_created: "Action plan generated",
  ai_reasoning_started: "AI reasoning started",
  ai_reasoning_completed: "AI reasoning completed",
  awaiting_human_approval: "Waiting for owner approval",
  action_approved: "Action approved by owner",
  action_rejected: "Action rejected by owner",
  simulated_message_sent: "Message simulated successfully",
};

function getEventIcon(eventType: string) {
  if (eventType === "simulated_message_sent") {
    return CheckCircle2;
  }

  if (eventType === "action_rejected") {
    return XCircle;
  }

  if (eventType.includes("ai_reasoning")) {
    return BrainCircuit;
  }

  if (eventType.includes("approval")) {
    return Clock3;
  }

  return Activity;
}

export function RecentActivityTimeline({
  activities,
}: RecentActivityProps) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Recent Activity
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Latest AI agent and approval events
        </p>
      </div>

      {activities.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No recent activity found.
        </p>
      ) : (
        <ol className="mt-6 space-y-5">
          {activities.map((activity) => {
            const Icon = getEventIcon(activity.event_type);

            return (
              <li
                key={activity.id}
                className="flex items-start gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {eventLabels[activity.event_type] ??
                      activity.event_type.replaceAll("_", " ")}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>
                      {new Date(activity.created_at).toLocaleString(
                        "en-IN",
                        {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Kolkata",
                        }
                      )}
                    </span>

                    {activity.tool_name && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5">
                        {activity.tool_name}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

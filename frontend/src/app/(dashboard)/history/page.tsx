
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircle,
    Bot,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock3,
    History,
    RefreshCw,
    Search,
} from "lucide-react";

import { APP_CONFIG } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAgentHistory } from "@/features/agent/hooks";
import { WorkerReplanningStatus } from "@/components/agent/worker-replanning-status";
import {
    getApprovedActions,
    getExecutionHistory,
} from "@/features/approvals/api";

import type { AgentHistoryEvent } from "@/features/agent/api";

type HistoryTab = "agent" | "approved" | "executed";

type HistoryRecord = Record<string, unknown>;

const PAGE_SIZE = 20;

function formatDate(value: unknown): string {
    if (typeof value !== "string" || !value) {
        return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
    }).format(date);
}

function formatLabel(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getText(
    record: HistoryRecord,
    keys: string[]
): string | null {
    for (const key of keys) {
        const value = record[key];

        if (
            typeof value === "string" &&
            value.trim().length > 0
        ) {
            return value;
        }

        if (typeof value === "number") {
            return String(value);
        }
    }

    return null;
}

function statusStyle(status: string): string {
    const value = status.toLowerCase();

    if (
        ["completed", "success", "approved", "sent"].includes(
            value
        )
    ) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (
        ["failed", "error", "critical", "rejected"].includes(
            value
        )
    ) {
        return "border-red-200 bg-red-50 text-red-700";
    }

    if (
        ["pending", "warning", "warn"].includes(value)
    ) {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(
                status
            )}`}
        >
            {formatLabel(status)}
        </span>
    );
}

function JsonDetails({ value }: { value: unknown }) {
    return (
        <pre className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {JSON.stringify(value ?? {}, null, 2)}
        </pre>
    );
}

function AgentEventCard({
    event,
}: {
    event: AgentHistoryEvent;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={event.severity} />

                        <span className="text-xs text-slate-400">
                            Event #{event.id}
                        </span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-slate-900">
                        {formatLabel(event.event_type)}
                    </h3>

                    <p className="mt-2 text-xs text-slate-500">
                        {formatDate(event.created_at)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        {event.tool_name && (
                            <span>Tool: {event.tool_name}</span>
                        )}

                        {event.model_name && (
                            <span>Model: {event.model_name}</span>
                        )}

                        {event.latency_ms !== null && (
                            <span>
                                Latency: {event.latency_ms} ms
                            </span>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                    {expanded ? "Hide Details" : "View Details"}

                    {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>
            </div>

            {expanded && (
                <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                    <div className="grid gap-4 text-xs sm:grid-cols-2">
                        <div>
                            <p className="text-slate-400">Run ID</p>
                            <p className="mt-1 break-all font-mono text-slate-700">
                                {event.run_id}
                            </p>
                        </div>

                        <div>
                            <p className="text-slate-400">Action ID</p>
                            <p className="mt-1 break-all font-mono text-slate-700">
                                {event.action_id ?? "Not applicable"}
                            </p>
                        </div>
                    </div>

                    <JsonDetails value={event.details} />
                </div>
            )}
        </article>
    );
}

function ActionCard({
    action,
    kind,
}: {
    action: HistoryRecord;
    kind: "approved" | "executed";
}) {
    const [expanded, setExpanded] = useState(false);

    const actionId =
        getText(action, ["id", "action_id"]) ??
        "Unknown";

    const actionType =
        getText(action, ["action_type", "type", "tool_name"]) ??
        "Retention Action";

    const status =
        getText(action, ["status", "action_status"]) ??
        (kind === "approved" ? "Approved" : "Completed");

    const date =
        getText(action, [
            "executed_at",
            "completed_at",
            "approved_at",
            "updated_at",
            "created_at",
        ]) ?? "";

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={status} />

                        <span className="text-xs text-slate-400">
                            {kind === "approved"
                                ? "Approved Action"
                                : "Execution Record"}
                        </span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-slate-900">
                        {formatLabel(actionType)}
                    </h3>

                    <p className="mt-2 text-xs text-slate-500">
                        {formatDate(date)}
                    </p>

                    <p className="mt-2 break-all text-xs text-slate-400">
                        Action ID: {actionId}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                    {expanded ? "Hide Details" : "View Details"}

                    {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>
            </div>

            {expanded && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="mb-3 text-xs font-semibold text-slate-600">
                        Stored Action Details
                    </p>

                    <JsonDetails value={action} />
                </div>
            )}
        </article>
    );
}

const tabs: {
    id: HistoryTab;
    label: string;
    icon: typeof History;
}[] = [
        {
            id: "agent",
            label: "AI Agent Logs",
            icon: Bot,
        },
        {
            id: "approved",
            label: "Approved Actions",
            icon: CheckCircle2,
        },
        {
            id: "executed",
            label: "Execution History",
            icon: History,
        },
    ];

function WorkerEvidencePanel({
    events,
}: {
    events: AgentHistoryEvent[];
}) {
    const [expanded, setExpanded] = useState(false);

    const getDetails = (event: AgentHistoryEvent) => {
        const value = event.details;

        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            return value as Record<string, unknown>;
        }

        return {} as Record<string, unknown>;
    };

    const evidence = events.map((event) => ({
        event,
        details: getDetails(event),
    }));

    // Match the existing logged event names.
    const modelEvents = evidence.filter(
        ({ event, details }) =>
            event.event_type === "ai_reasoning_completed" ||
            details.strategySource === "deterministic_fallback"
    );

    const fallbackEvents = modelEvents.filter(
        ({ details }) =>
            details.strategySource === "deterministic_fallback"
    );

    const toolEvents = evidence.filter(
        ({ event, details }) =>
            event.event_type === "tool_executed" ||
            (Boolean(event.tool_name) &&
                details.durationMs !== undefined)
    );

    const approvalEvents = evidence.filter(
        ({ event }) =>
            ["action_approved", "action_rejected"].includes(
                event.event_type
            )
    );

    const resumeEvents = evidence.filter(
        ({ event }) =>
            event.event_type === "agent_run_resumed"
    );

    const evaluationEvents = evidence.filter(
        ({ event }) =>
            event.event_type === "goal_evaluated"
    );

    const cards = [
        {
            label: "Model Fallbacks",
            value: fallbackEvents.length,
            color: "text-amber-700",
        },
        {
            label: "Tool Events",
            value: toolEvents.length,
            color: "text-blue-700",
        },
        {
            label: "Human Decisions",
            value: approvalEvents.length,
            color: "text-indigo-700",
        },
        {
            label: "Resume Events",
            value: resumeEvents.length,
            color: "text-emerald-700",
        },
    ];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-blue-600" />

                        <h2 className="text-lg font-bold text-slate-900">
                            AI Worker Execution Evidence
                        </h2>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                        Model decisions, tool activity, human
                        handoffs and evaluation traces.
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Current Log Page
                </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        className="rounded-xl bg-slate-50 p-4"
                    >
                        <p className="text-xs text-slate-500">
                            {card.label}
                        </p>

                        <p
                            className={`mt-2 text-2xl font-bold ${card.color}`}
                        >
                            {card.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                    Model Decisions: {modelEvents.length}
                </span>

                <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    Goal Evaluations: {evaluationEvents.length}
                </span>
            </div>

            {fallbackEvents.length > 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-700" />

                        <h3 className="text-sm font-semibold text-amber-900">
                            AI Fallback Evidence
                        </h3>
                    </div>

                    {fallbackEvents.slice(0, 3).map(
                        ({ event, details }) => (
                            <div
                                key={event.id}
                                className="mt-3 border-t border-amber-200 pt-3"
                            >
                                <p className="break-all font-mono text-xs text-amber-800">
                                    Run: {event.run_id}
                                </p>

                                <p className="mt-2 text-xs text-amber-900">
                                    Strategy: Deterministic Fallback
                                </p>

                                <p className="mt-1 break-words text-xs text-amber-800">
                                    Reason:{" "}
                                    {typeof details.fallbackReason === "string"
                                        ? details.fallbackReason
                                        : "Model unavailable or output rejected"}
                                </p>
                            </div>
                        )
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
                {expanded ? "Hide Evidence" : "View Evidence"}

                {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                ) : (
                    <ChevronDown className="h-4 w-4" />
                )}
            </button>

            {expanded && (
                <div className="mt-4 space-y-3">
                    {evidence.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            No execution events found on this page.
                        </p>
                    ) : (
                        evidence.map(({ event, details }) => (
                            <div
                                key={event.id}
                                className="rounded-xl border border-slate-200 p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {formatLabel(event.event_type)}
                                    </p>

                                    <StatusBadge status={event.severity} />
                                </div>

                                <p className="mt-2 text-xs text-slate-500">
                                    {formatDate(event.created_at)}
                                </p>

                                <p className="mt-2 break-all font-mono text-xs text-slate-500">
                                    Run: {event.run_id}
                                </p>

                                {event.tool_name && (
                                    <p className="mt-2 text-xs text-slate-700">
                                        Tool: {event.tool_name}
                                    </p>
                                )}

                                {event.model_name && (
                                    <p className="mt-1 text-xs text-slate-700">
                                        Model: {event.model_name}
                                    </p>
                                )}

                                {typeof details.strategySource === "string" && (
                                    <p className="mt-1 text-xs text-slate-700">
                                        Strategy: {details.strategySource}
                                    </p>
                                )}

                                <details className="mt-3">
                                    <summary className="cursor-pointer text-xs font-semibold text-blue-700">
                                        View Raw Trace
                                    </summary>

                                    <div className="mt-3">
                                        <JsonDetails value={details} />
                                    </div>
                                </details>
                            </div>
                        ))
                    )}
                </div>
            )}

            <p className="mt-5 text-xs leading-5 text-slate-500">
                Evidence is derived from persisted execution logs
                on the currently loaded page, not the complete
                business history. Missing events do not imply
                that an action never occurred. Simulated message
                execution is not proof of actual business growth.
            </p>
        </section>
    );
}

export default function HistoryPage() {
    const [activeTab, setActiveTab] =
        useState<HistoryTab>("agent");

    const [agentPage, setAgentPage] = useState(1);

    const [localPage, setLocalPage] = useState(1);

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] =
        useState("all");

    const agentQuery = useAgentHistory(
        APP_CONFIG.businessId,
        agentPage,
        PAGE_SIZE
    );

    const approvedQuery = useQuery({
        queryKey: [
            "history",
            "approved",
            APP_CONFIG.businessId,
        ],
        queryFn: () =>
            getApprovedActions(APP_CONFIG.businessId),
        enabled: activeTab === "approved",
        staleTime: 30_000,
    });

    const executedQuery = useQuery({
        queryKey: [
            "history",
            "executed",
            APP_CONFIG.businessId,
        ],
        queryFn: () =>
            getExecutionHistory(APP_CONFIG.businessId),
        enabled: activeTab === "executed",
        staleTime: 30_000,
    });

    const activeQuery =
        activeTab === "agent"
            ? agentQuery
            : activeTab === "approved"
                ? approvedQuery
                : executedQuery;

    const agentEvents = agentQuery.data?.data ?? [];

    const actions =
        activeTab === "approved"
            ? approvedQuery.data?.data ?? []
            : activeTab === "executed"
                ? executedQuery.data?.data ?? []
                : [];

    const normalizedActions: HistoryRecord[] =
        actions.map(
            (action) => action as unknown as HistoryRecord
        );

    const searchValue = search.trim().toLowerCase();

    const filteredAgentEvents = agentEvents.filter(
        (event) => {
            const searchable = [
                event.event_type,
                event.severity,
                event.tool_name ?? "",
                event.model_name ?? "",
                event.run_id,
                event.action_id ?? "",
            ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !searchValue ||
                searchable.includes(searchValue);

            const matchesStatus =
                statusFilter === "all" ||
                event.severity.toLowerCase() ===
                statusFilter;

            return matchesSearch && matchesStatus;
        }
    );

    const filteredActions = normalizedActions.filter(
        (action) => {
            const status =
                getText(action, [
                    "status",
                    "action_status",
                ]) ?? "";

            const matchesStatus =
                statusFilter === "all" ||
                status.toLowerCase() === statusFilter;

            const searchable = [
                getText(action, [
                    "id",
                    "action_id",
                ]) ?? "",
                getText(action, [
                    "action_type",
                    "type",
                ]) ?? "",
                status,
                getText(action, [
                    "customer_id",
                ]) ?? "",
            ]
                .join(" ")
                .toLowerCase();

            return (
                matchesStatus &&
                (!searchValue ||
                    searchable.includes(searchValue))
            );
        }
    );

    const agentTotalPages = Math.max(
        1,
        agentQuery.data?.pagination.totalPages ?? 1
    );

    const actionTotalPages = Math.max(
        1,
        Math.ceil(
            filteredActions.length / PAGE_SIZE
        )
    );

    const totalPages =
        activeTab === "agent"
            ? agentTotalPages
            : actionTotalPages;

    const currentPage =
        activeTab === "agent"
            ? agentPage
            : localPage;

    const displayedActions = filteredActions.slice(
        (localPage - 1) * PAGE_SIZE,
        localPage * PAGE_SIZE
    );

    const visibleCount =
        activeTab === "agent"
            ? filteredAgentEvents.length
            : filteredActions.length;

    const totalCount =
        activeTab === "agent"
            ? agentQuery.data?.pagination.total ?? 0
            : activeTab === "approved"
                ? approvedQuery.data?.total ?? 0
                : executedQuery.data?.total ?? 0;

    function changeTab(tab: HistoryTab) {
        setActiveTab(tab);
        setSearch("");
        setStatusFilter("all");
        setLocalPage(1);
    }

    function updateSearch(value: string) {
        setSearch(value);
        setLocalPage(1);
    }

    function updateStatus(value: string) {
        setStatusFilter(value);
        setLocalPage(1);
    }

    function changePage(next: number) {
        if (next < 1 || next > totalPages) {
            return;
        }

        if (activeTab === "agent") {
            setAgentPage(next);
        } else {
            setLocalPage(next);
        }
    }

    return (
        <section className="min-w-0 space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                        <History className="h-4 w-4" />
                        Activity Tracking
                    </div>

                    <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                        Activity History
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Review AI Agent events, approved retention
                        actions, and simulated execution records.
                    </p>
                </div>

                <button
                    type="button"
                    disabled={activeQuery.isFetching}
                    onClick={() => void activeQuery.refetch()}
                    className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw
                        className={`h-4 w-4 ${activeQuery.isFetching
                                ? "animate-spin"
                                : ""
                            }`}
                    />
                    Refresh
                </button>
            </div>
            {/* Persisted Autonomous Worker Status */}
            {activeTab === "agent" && (
                <WorkerReplanningStatus
                    businessId={APP_CONFIG.businessId}
                />
            )}
            {/* AI Worker execution evidence */}
            {activeTab === "agent" && (
                <WorkerEvidencePanel events={agentEvents} />
            )}
            {/* Tab Navigation */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <div
                    role="tablist"
                    aria-label="History categories"
                    className="flex min-w-max gap-2"
                >
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const selected = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => changeTab(tab.id)}
                                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${selected
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">
                        Total Records
                    </p>

                    <p className="mt-3 text-3xl font-bold text-slate-900">
                        {activeQuery.isPending
                            ? "—"
                            : totalCount.toLocaleString("en-IN")}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">
                        Current Page
                    </p>

                    <p className="mt-3 text-3xl font-bold text-slate-900">
                        {currentPage} / {totalPages}
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            updateSearch(event.target.value)
                        }
                        placeholder="Search history records..."
                        aria-label="Search history"
                        className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(event) =>
                        updateStatus(event.target.value)
                    }
                    aria-label="Filter status or severity"
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700"
                >
                    <option value="all">
                        All Statuses
                    </option>

                    {activeTab === "agent" ? (
                        <>
                            <option value="info">Info</option>
                            <option value="success">Success</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                            <option value="critical">Critical</option>
                        </>
                    ) : (
                        <>
                            <option value="approved">Approved</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </>
                    )}
                </select>
            </div>

            <p className="text-xs text-slate-500">
                {activeTab === "agent"
                    ? "Search and severity filters apply to the currently loaded server page."
                    : "Search and status filters apply to the records returned by this API."}
            </p>

            {/* Loading State */}
            {activeQuery.isPending && (
                <div
                    role="status"
                    className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
                >
                    Loading activity history...
                </div>
            )}

            {/* Error State */}
            {activeQuery.isError && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 p-5"
                >
                    <div className="flex items-center gap-2 font-semibold text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        Unable to Load History
                    </div>

                    <p className="mt-2 text-sm text-red-600">
                        {getApiErrorMessage(activeQuery.error)}
                    </p>

                    <button
                        type="button"
                        onClick={() => void activeQuery.refetch()}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Records */}
            {!activeQuery.isPending &&
                !activeQuery.isError && (
                    <div className="space-y-4">
                        {activeTab === "agent"
                            ? filteredAgentEvents.map((event) => (
                                <AgentEventCard
                                    key={event.id}
                                    event={event}
                                />
                            ))
                            : displayedActions.map((action, index) => (
                                <ActionCard
                                    key={
                                        getText(action, [
                                            "id",
                                            "action_id",
                                        ]) ?? index
                                    }
                                    action={action}
                                    kind={
                                        activeTab === "approved"
                                            ? "approved"
                                            : "executed"
                                    }
                                />
                            ))}

                        {visibleCount === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                                <History className="mx-auto h-10 w-10 text-slate-300" />

                                <h2 className="mt-4 font-semibold text-slate-900">
                                    No Records Found
                                </h2>

                                <p className="mt-2 text-sm text-slate-500">
                                    No records match the current
                                    selection.
                                </p>
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
                            <p className="text-xs text-slate-500">
                                Page {currentPage} of {totalPages}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        changePage(currentPage - 1)
                                    }
                                    disabled={
                                        currentPage <= 1 ||
                                        activeQuery.isFetching
                                    }
                                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        changePage(currentPage + 1)
                                    }
                                    disabled={
                                        currentPage >= totalPages ||
                                        activeQuery.isFetching
                                    }
                                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* Transparency Note */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs leading-6 text-blue-800">
                    AI Agent logs are server-paginated.
                    Approved and executed actions use the
                    existing approval APIs. Customer message
                    execution remains simulation-only in this
                    demo. Rejected approval decisions are not
                    included in these three API datasets.
                </p>
            </div>
        </section>
    );
}

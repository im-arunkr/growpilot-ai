
"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  TriangleAlert,
  Users,
  UserCheck,
  UserRoundX,
  X,
} from "lucide-react";

import { useCustomerRetention } from "@/features/customers/hooks";
import type {
  RetentionCustomer,
  RetentionStatus,
} from "@/features/customers/types";
import { APP_CONFIG } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api/client";

type StatusFilter = "all" | RetentionStatus;
type SortKey =
  | "inactiveDays"
  | "customerName"
  | "totalTransactions"
  | "totalRevenue";

const PAGE_SIZE = 10;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

const statusStyles: Record<RetentionStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  declining: "bg-amber-50 text-amber-700",
  inactive: "bg-red-50 text-red-700",
  no_activity: "bg-slate-100 text-slate-600",
};

function formatStatus(status: RetentionStatus) {
  return status === "no_activity"
    ? "No Activity"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(date: string | null) {
  if (!date) return "Never";

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? "Unknown"
    : dateFormatter.format(parsed);
}

function StatusBadge({ status }: { status: RetentionStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status]
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function CustomerMobileCard({
  customer,
}: {
  customer: RetentionCustomer;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold text-slate-900">
            {customer.customerName}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {customer.customerReference}
          </p>
        </div>

        <StatusBadge status={customer.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-500">Inactive Days</p>
          <p className="mt-1 font-semibold text-slate-900">
            {customer.inactiveDays ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Transactions</p>
          <p className="mt-1 font-semibold text-slate-900">
            {customer.totalTransactions}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Service Fee Revenue</p>
          <p className="mt-1 break-words font-semibold text-slate-900">
            {currencyFormatter.format(customer.totalRevenue)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Last Transaction</p>
          <p className="mt-1 font-medium text-slate-900">
            {formatDate(customer.lastTransactionDate)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        {customer.needsAttention ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            <TriangleAlert className="h-4 w-4" />
            Needs Attention
          </span>
        ) : (
          <span className="text-xs text-emerald-700">
            No attention required
          </span>
        )}

        <span className="text-xs text-slate-500">
          Marketing consent: {customer.marketingConsent ? "Yes" : "No"}
        </span>
      </div>
    </article>
  );
}

export default function CustomersPage() {
  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    refetch,
  } = useCustomerRetention(APP_CONFIG.businessId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [sortKey, setSortKey] =
    useState<SortKey>("inactiveDays");
  const [sortDescending, setSortDescending] = useState(true);
  const [page, setPage] = useState(1);

  const customers = data?.data?.customers ?? [];
  const summary = data?.data?.summary;

  const filteredCustomers = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return customers
      .filter((customer) => {
        const matchesSearch =
          !searchTerm ||
          customer.customerName
            .toLowerCase()
            .includes(searchTerm) ||
          customer.customerReference
            .toLowerCase()
            .includes(searchTerm);

        const matchesStatus =
          statusFilter === "all" ||
          customer.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let result = 0;

        if (sortKey === "customerName") {
          result = a.customerName.localeCompare(
            b.customerName
          );
        } else {
          result =
            (a[sortKey] ?? -1) -
            (b[sortKey] ?? -1);
        }

        return sortDescending ? -result : result;
      });
  }, [customers, search, statusFilter, sortKey, sortDescending]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function updateStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const filters: {
    label: string;
    value: StatusFilter;
    count: number;
  }[] = [
    {
      label: "All",
      value: "all",
      count: summary?.totalCustomers ?? customers.length,
    },
    {
      label: "Active",
      value: "active",
      count: summary?.active ?? 0,
    },
    {
      label: "Declining",
      value: "declining",
      count: summary?.declining ?? 0,
    },
    {
      label: "Inactive",
      value: "inactive",
      count: summary?.inactive ?? 0,
    },
    {
      label: "No Activity",
      value: "no_activity",
      count: summary?.noActivity ?? 0,
    },
  ];

  return (
    <section className="min-w-0 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Customer Analytics
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor customer activity, retention and re-engagement opportunities.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isFetching ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {isPending && (
        <div
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
        >
          Loading customer analytics...
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <p className="font-semibold text-red-700">
            Unable to load customers
          </p>

          <p className="mt-2 text-sm text-red-600">
            {getApiErrorMessage(error)}
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Unexpected or incomplete response */}
      {!isPending && !isError && data?.data &&
        (!summary || !data.data.retentionRules) && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Customer analytics response is incomplete. Refresh the page or try again.
          </div>
        )}

      {/* Customer Analytics */}
      {data?.data && summary && data.data.retentionRules && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Total Customers",
                value: summary?.totalCustomers ?? 0,
                icon: Users,
                color: "text-blue-600",
              },
              {
                label: "Active",
                value: summary?.active ?? 0,
                icon: UserCheck,
                color: "text-emerald-600",
              },
              {
                label: "At-Risk",
                value: summary?.atRisk ?? 0,
                icon: TriangleAlert,
                color: "text-amber-600",
              },
              {
                label: "Inactive",
                value: summary?.inactive ?? 0,
                icon: UserRoundX,
                color: "text-red-600",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500 sm:text-sm">
                      {item.label}
                    </p>
                    <Icon
                      className={`h-5 w-5 shrink-0 ${item.color}`}
                    />
                  </div>

                  <p className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Search + Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    updateSearch(event.target.value)
                  }
                  placeholder="Search by name or customer ID..."
                  aria-label="Search customers"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => updateSearch("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      updateStatusFilter(filter.value)
                    }
                    aria-pressed={
                      statusFilter === filter.value
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
                      statusFilter === filter.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">
                Showing {filteredCustomers.length} of{" "}
                {customers.length} customers
              </p>

              <div className="flex items-center gap-2">
                <ArrowDownUp className="h-4 w-4 text-slate-400" />

                <select
                  value={`${sortKey}:${sortDescending ? "desc" : "asc"}`}
                  onChange={(event) => {
                    const [key, order] =
                      event.target.value.split(":");

                    setSortKey(key as SortKey);
                    setSortDescending(order === "desc");
                    setPage(1);
                  }}
                  aria-label="Sort customers"
                  className="h-10 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="inactiveDays:desc">
                    Most Inactive
                  </option>
                  <option value="inactiveDays:asc">
                    Least Inactive
                  </option>
                  <option value="customerName:asc">
                    Name A–Z
                  </option>
                  <option value="customerName:desc">
                    Name Z–A
                  </option>
                  <option value="totalTransactions:desc">
                    Most Transactions
                  </option>
                  <option value="totalRevenue:desc">
                    Highest Fee Revenue
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Desktop / Tablet Table */}
          {paginatedCustomers.length > 0 && <div className="hidden min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="table-container">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Customer
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Inactive Days
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Transactions
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Fee Revenue
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Last Transaction
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Attention
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedCustomers.map((customer) => (
                    <tr
                      key={customer.customerId}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {customer.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {customer.customerReference}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={customer.status}
                        />
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {customer.inactiveDays ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {customer.totalTransactions}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {currencyFormatter.format(
                          customer.totalRevenue
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(
                          customer.lastTransactionDate
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {customer.needsAttention ? (
                          <span className="text-xs font-medium text-amber-700">
                            Required
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* Mobile Customer Cards */}
          {paginatedCustomers.length > 0 && <div className="space-y-3 md:hidden">
            {paginatedCustomers.map((customer) => (
              <CustomerMobileCard
                key={customer.customerId}
                customer={customer}
              />
            ))}
          </div>}

          {filteredCustomers.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {customers.length === 0
                ? "No customers available yet."
                : "No customers match your filters."}
            </div>
          )}

          {/* Pagination */}
          {filteredCustomers.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setPage((previous) =>
                      Math.max(1, previous - 1)
                    )
                  }
                  aria-label="Previous page"
                  className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((previous) =>
                      Math.min(totalPages, previous + 1)
                    )
                  }
                  aria-label="Next page"
                  className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Retention Rules */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-800">
            <strong>Retention Classification:</strong>{" "}
            Active: 0–{data.data.retentionRules.ACTIVE_DAYS} days;
            Declining:{" "}
            {data.data.retentionRules.ACTIVE_DAYS + 1}–
            {data.data.retentionRules.DECLINING_DAYS} days;
            Inactive: more than{" "}
            {data.data.retentionRules.DECLINING_DAYS} days
            without a completed transaction.
          </div>
        </>
      )}
    </section>
  );
}

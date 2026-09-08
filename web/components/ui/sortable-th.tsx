"use client";
import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";
export type SortState = { key: string | null; dir: SortDir };

// The same comparison logic useSortable uses below, exposed as a plain
// function for pages that render several independently-sortable tables in
// a loop (one per vendor, one per shop, ...) — calling useSortable() once
// per loop iteration would violate the Rules of Hooks, so those pages keep
// one bit of { [groupKey]: SortState } state at the top level and call this
// directly during render instead.
export function sortRows<T>(data: T[], getValue: (row: T, key: string) => unknown, state: SortState): T[] {
    if (!state.key) return data;
    const { key, dir } = state;
    const withIndex = data.map((row, i) => ({ row, i }));
    withIndex.sort((a, b) => {
        const av = getValue(a.row, key);
        const bv = getValue(b.row, key);
        const aNull = av == null || av === "";
        const bNull = bv == null || bv === "";
        if (aNull && bNull) return a.i - b.i;
        if (aNull) return 1;
        if (bNull) return -1;

        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
        else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
        if (cmp === 0) cmp = a.i - b.i;
        return dir === "asc" ? cmp : -cmp;
    });
    return withIndex.map(x => x.row);
}

// Toggles a { [groupKey]: SortState } map's entry for one column, following
// the same "same key flips direction, new key resets to asc" rule as
// useSortable's requestSort.
export function toggleSortState(prev: SortState | undefined, key: string): SortState {
    if (prev?.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    return { key, dir: "asc" };
}

// One shared sorting primitive for every admin data-table — click a header,
// sort by that column; click again, flip direction. Type-aware (numbers
// compare numerically, Dates chronologically, everything else via
// localeCompare with numeric-aware collation so "Item 9" sorts before
// "Item 10"), and nulls/undefined always sort to the end regardless of
// direction rather than jumping to the front on descending sort, which
// reads as broken.
export function useSortable<T>(
    data: T[],
    getValue: (row: T, key: string) => unknown,
    defaultKey: string | null = null,
    defaultDir: SortDir = "asc"
) {
    const [sortKey, setSortKey] = useState<string | null>(defaultKey);
    const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

    function requestSort(key: string) {
        if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    }

    const sorted = useMemo(() => {
        if (!sortKey) return data;
        const withIndex = data.map((row, i) => ({ row, i }));
        withIndex.sort((a, b) => {
            const av = getValue(a.row, sortKey);
            const bv = getValue(b.row, sortKey);
            const aNull = av == null || av === "";
            const bNull = bv == null || bv === "";
            if (aNull && bNull) return a.i - b.i; // stable for equal/empty values
            if (aNull) return 1; // empty values always sort last
            if (bNull) return -1;

            let cmp: number;
            if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
            else if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
            else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
            if (cmp === 0) cmp = a.i - b.i; // stable tiebreak
            return sortDir === "asc" ? cmp : -cmp;
        });
        return withIndex.map(x => x.row);
    }, [data, sortKey, sortDir, getValue]);

    return { sorted, sortKey, sortDir, requestSort };
}

// Drop-in replacement for a plain <th> in any data-table — pass the same
// children you'd put in the <th>, plus the column's own key and the sort
// state/handler from useSortable above.
export function SortableTh({
    children, sortKey: colKey, currentKey, dir, onSort, className, align, title
}: {
    children: React.ReactNode; sortKey: string; currentKey: string | null; dir: SortDir;
    onSort: (key: string) => void; className?: string; align?: "left" | "right" | "center"; title?: string;
}) {
    const active = currentKey === colKey;
    return (
        <th className={className}>
            <button type="button" onClick={() => onSort(colKey)} title={title ?? `Sort by ${typeof children === "string" ? children : "this column"}`}
                className={`inline-flex items-center gap-1 select-none hover:text-graphite-100 transition-colors ${active ? "text-graphite-100" : ""} ${align === "right" ? "flex-row-reverse" : ""}`}>
                {children}
                <span className="inline-flex flex-col leading-[0] shrink-0">
                    <svg className={`w-2 h-2 ${active && dir === "asc" ? "text-signal-cyan" : "text-graphite-600"}`} viewBox="0 0 12 12" fill="currentColor"><path d="M6 2.5l4 5H2l4-5z" /></svg>
                    <svg className={`w-2 h-2 mt-0.5 ${active && dir === "desc" ? "text-signal-cyan" : "text-graphite-600"}`} viewBox="0 0 12 12" fill="currentColor"><path d="M6 9.5l-4-5h8l-4 5z" /></svg>
                </span>
            </button>
        </th>
    );
}

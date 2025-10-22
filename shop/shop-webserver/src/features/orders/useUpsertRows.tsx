import { useCallback, useRef, useState } from "react";

export type BaseRow = {
    orderId?: string | number | null;
    correlationId?: string | null;
    pending?: boolean;
    updatedAt?: number;
};

type IndexMaps = {
    byOrderId: Map<string, number>;
    byCorrId: Map<string, number>;
};

function reindexInto<T extends BaseRow>(list: T[], maps: IndexMaps) {
    maps.byOrderId.clear();
    maps.byCorrId.clear();
    list.forEach((r, i) => {
        if (!r) return;
        if (r.orderId != null) maps.byOrderId.set(String(r.orderId), i);
        if (r.correlationId) maps.byCorrId.set(r.correlationId, i);
    });
}

function upsertInto<T extends BaseRow>(
    list: T[],
    maps: IndexMaps,
    input: T,
    { pending = false, reuseIndex = null as number | null } = {}
) {
    if (!input) return list;
    const now = Date.now();
    const item: T = { ...input, pending, updatedAt: now };

    let idx = -1;
    if (reuseIndex !== null) idx = reuseIndex;
    else if (item.correlationId && maps.byCorrId.has(item.correlationId)) idx = maps.byCorrId.get(item.correlationId)!;
    else if (item.orderId != null && maps.byOrderId.has(String(item.orderId))) idx = maps.byOrderId.get(String(item.orderId))!;

    const next = [...list];
    if (idx >= 0) {
        const merged = { ...(next[idx] ?? {}), ...item, pending } as T;
        next[idx] = merged;
        const [rec] = next.splice(idx, 1);
        next.unshift(rec);
    } else {
        next.unshift(item);
    }

    reindexInto(next, maps);
    return next;
}

export function useUpsertRows<T extends BaseRow>() {
    const [rows, setRows] = useState<T[]>([]);
    const byOrderIdRef = useRef<Map<string, number>>(new Map());
    const byCorrIdRef = useRef<Map<string, number>>(new Map());
    const maps: IndexMaps = { byOrderId: byOrderIdRef.current, byCorrId: byCorrIdRef.current };

    const upsert = useCallback(
        (input: T, opts?: { pending?: boolean; reuseIndex?: number | null }) => {
            setRows((prev) => upsertInto(prev, maps, input, opts));
        },
        [] // maps refs are stable
    );

    const upsertMany = useCallback(
        (items: T[], opts?: { pending?: boolean }) => {
            setRows((prev) => {
                let list = prev;
                for (const it of items) {
                    if (!it) continue;
                    list = upsertInto(list, maps, it, { pending: opts?.pending ?? false });
                }
                return list;
            });
        },
        []
    );

    // Apply a server projection/snapshot/update array.
    // CorrelationId wins; we mark incoming as not pending.
    const applyProjection = useCallback((incoming: T[]) => {
        if (!incoming?.length) return;
        setRows((prev) => {
            let list = prev;
            for (const o of incoming) {
                if (!o) continue;
                const idxByCorr = o.correlationId ? maps.byCorrId.get(o.correlationId) : undefined;
                const idxByOrder = o.orderId != null ? maps.byOrderId.get(String(o.orderId)) : undefined;
                const reuseIndex: number | null =
                    typeof idxByCorr === "number" ? idxByCorr :
                        typeof idxByOrder === "number" ? idxByOrder : null;

                list = upsertInto(list, maps, { ...o, pending: false } as T, { pending: false, reuseIndex });
            }
            return list;
        });
    }, []);

    return {
        rows,
        setRows,            // exposed just in case you need manual resets
        upsert,
        upsertMany,
        applyProjection,
    };
}

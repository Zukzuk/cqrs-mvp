import { useCallback, useState } from "react";
import { BaseRow } from "./OrdersPage";

const keyOf = (r: BaseRow) =>
    (r?.correlationId && `c:${r.correlationId}`) ??
    (r?.orderId != null && `o:${String(r.orderId)}`) ??
    null;

const normalize = <T extends BaseRow>(r: T): T =>
    ({ ...r, status: (r as any).status ?? "CREATED" }) as T;

export function useRows<T extends BaseRow>() {
    const [rows, setRows] = useState<T[]>([]);

    // Replace list from server snapshot/projection
    const replaceSnapshot = useCallback((incoming: T[] = []) => {
        const seen = new Set<string>();
        const next: T[] = [];
        for (const raw of incoming) {
            if (!raw) continue;
            const row = normalize(raw);
            const k = keyOf(row);
            if (!k || seen.has(k)) continue;
            seen.add(k);
            next.push({ ...row, pending: false } as T);
        }
        setRows(next);
    }, []);

    // Upsert a single item (e.g., command pending / success / fail)
    const upsert = useCallback((item: T, opts?: { pending?: boolean }) => {
        if (!item) return;
        const now = Date.now();
        const row = normalize({ ...item, updatedAt: now, pending: !!opts?.pending } as T);
        const k = keyOf(row);
        setRows(prev => {
            if (!k) return [row, ...prev.filter(Boolean)];
            return [row, ...prev.filter(r => keyOf(r) !== k)];
        });
    }, []);

    const reset = useCallback(() => setRows([]), []);

    return { rows, replaceSnapshot, upsert, reset, setRows };
}

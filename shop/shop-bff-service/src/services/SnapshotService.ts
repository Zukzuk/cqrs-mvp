import type { Namespace } from "socket.io";

export type SnapshotResource = {
  name: string;
  request: (ns: Namespace, userId: string) => void; // e.g., ns.emit("request_orders_snapshot", { userId })
};

export class SnapshotService {
  constructor(private ns: Namespace, private resources: SnapshotResource[]) {}

  private connected = new Map<string, number>(); // userId -> refcount
  private queued = new Set<string>();            // userIds waiting for snapshot
  private projectionUp = false;

  // ---- Web client lifecycle ----
  onWebClientConnect(userId: string) {
    this.connected.set(userId, (this.connected.get(userId) ?? 0) + 1);
    // client is up -> immediately intend to request
    this.queueUser(userId);
    this.flushIfPossible();
  }

  onWebClientDisconnect(userId: string) {
    const n = this.connected.get(userId) ?? 0;
    if (n <= 1) this.connected.delete(userId);
    else this.connected.set(userId, n - 1);
  }

  onClientRequest(userId: string) {
    this.queueUser(userId);
    this.flushIfPossible();
  }

  // ---- Projection lifecycle ----
  onProjectionConnect() {
    this.projectionUp = true;
    // when projection is available, request for ALL connected + queued users
    const hydrate = new Set<string>(this.connected.keys());
    for (const u of this.queued) hydrate.add(u);
    this.queued.clear();
    this.requestForMany(hydrate);
  }

  onProjectionDisconnect() {
    this.projectionUp = false;
    // keep state; future connects will flush queued + connected again
  }

  // ---- Internals ----
  private queueUser(userId: string) {
    this.queued.add(userId);
  }

  private flushIfPossible() {
    if (!this.projectionUp || this.queued.size === 0) return;
    const toFlush = Array.from(this.queued);
    this.queued.clear();
    this.requestForMany(toFlush);
  }

  private requestForMany(userIds: Iterable<string>) {
    for (const uid of userIds) {
      for (const res of this.resources) res.request(this.ns, uid);
    }
  }
}

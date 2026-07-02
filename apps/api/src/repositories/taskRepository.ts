import type { Firestore } from "firebase-admin/firestore";
import type { TaskRecord, TaskStatus } from "@scheduler/shared";

const COLLECTION = "tasks";

export class TaskRepository {
  constructor(private readonly db: Firestore) {}

  async create(record: TaskRecord): Promise<void> {
    await this.db.collection(COLLECTION).doc(record.id).set(record);
  }

  async getById(id: string): Promise<TaskRecord | null> {
    const snap = await this.db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return snap.data() as TaskRecord;
  }

  async list(filters: {
    status?: TaskStatus;
    assignedWorkerId?: string;
    from?: number;
    to?: number;
    limit?: number;
  }): Promise<TaskRecord[]> {
    // Use at most one equality filter in Firestore (no composite index needed);
    // apply the remaining filters and sorting in memory.
    let q: FirebaseFirestore.Query = this.db.collection(COLLECTION);
    if (filters.status) q = q.where("status", "==", filters.status);
    else if (filters.assignedWorkerId) {
      q = q.where("assignedWorkerId", "==", filters.assignedWorkerId);
    }
    const snap = await q.limit(1000).get();

    let items = snap.docs.map((d) => d.data() as TaskRecord);
    if (filters.status && filters.assignedWorkerId) {
      items = items.filter((t) => t.assignedWorkerId === filters.assignedWorkerId);
    }
    if (filters.from) items = items.filter((t) => t.dueAt != null && t.dueAt >= filters.from!);
    if (filters.to) items = items.filter((t) => t.dueAt != null && t.dueAt <= filters.to!);

    items.sort((a, b) => (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER));
    return items.slice(0, filters.limit ?? 200);
  }

  async update(id: string, patch: Partial<TaskRecord>): Promise<void> {
    await this.db
      .collection(COLLECTION)
      .doc(id)
      .update({ ...patch, updatedAt: Date.now() });
  }

  async delete(id: string): Promise<void> {
    await this.db.collection(COLLECTION).doc(id).delete();
  }
}

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
    let q = this.db.collection(COLLECTION).orderBy("dueAt", "asc") as FirebaseFirestore.Query;
    if (filters.status) q = q.where("status", "==", filters.status);
    if (filters.assignedWorkerId) q = q.where("assignedWorkerId", "==", filters.assignedWorkerId);
    if (filters.from) q = q.where("dueAt", ">=", filters.from);
    if (filters.to) q = q.where("dueAt", "<=", filters.to);
    const snap = await q.limit(filters.limit ?? 200).get();
    return snap.docs.map((d) => d.data() as TaskRecord);
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

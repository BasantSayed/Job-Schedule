import type { Firestore } from "firebase-admin/firestore";

export type NotificationRecord = {
  id: string;
  recipientUid: string;
  type: "TASK_ASSIGNED" | "STATUS_CHANGED";
  taskId: string;
  taskTitle: string;
  message: string;
  read: boolean;
  createdAt: number;
};

const COLLECTION = "notifications";

export class NotificationRepository {
  constructor(private readonly db: Firestore) {}

  async create(record: NotificationRecord): Promise<void> {
    await this.db.collection(COLLECTION).doc(record.id).set(record);
  }

  async markRead(id: string): Promise<void> {
    await this.db.collection(COLLECTION).doc(id).update({ read: true });
  }

  async listForUser(uid: string, limit = 50): Promise<NotificationRecord[]> {
    // Filter only by recipientUid (no composite index needed), sort in memory.
    const snap = await this.db
      .collection(COLLECTION)
      .where("recipientUid", "==", uid)
      .limit(500)
      .get();
    return snap.docs
      .map((d) => d.data() as NotificationRecord)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

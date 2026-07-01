import type { Firestore } from "firebase-admin/firestore";
import type { WorkerRecord } from "@scheduler/shared";

const COLLECTION = "workers";

export class WorkerRepository {
  constructor(private readonly db: Firestore) {}

  async upsert(record: WorkerRecord): Promise<void> {
    await this.db
      .collection(COLLECTION)
      .doc(record.id)
      .set(record, { merge: true });
  }

  async getById(id: string): Promise<WorkerRecord | null> {
    const snapshot = await this.db.collection(COLLECTION).doc(id).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as WorkerRecord;
  }

  async list(limit: number): Promise<WorkerRecord[]> {
    const snapshot = await this.db
      .collection(COLLECTION)
      .orderBy("lastHeartbeatAt", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => doc.data() as WorkerRecord);
  }
}

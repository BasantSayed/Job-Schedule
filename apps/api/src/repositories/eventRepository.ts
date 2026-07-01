import type { Firestore } from "firebase-admin/firestore";
import type { JobEventRecord } from "@scheduler/shared";

const COLLECTION = "jobEvents";

export class EventRepository {
  constructor(private readonly db: Firestore) {}

  async add(event: JobEventRecord): Promise<void> {
    await this.db.collection(COLLECTION).doc(event.id).set(event);
  }

  async listByJobId(jobId: string, limit = 100): Promise<JobEventRecord[]> {
    const snapshot = await this.db
      .collection(COLLECTION)
      .where("jobId", "==", jobId)
      .orderBy("timestamp", "asc")
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => doc.data() as JobEventRecord);
  }
}

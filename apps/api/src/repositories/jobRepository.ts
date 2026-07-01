import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { JobRecord } from "@scheduler/shared";

const COLLECTION = "jobs";

export class JobRepository {
  constructor(private readonly db: Firestore) {}

  async create(record: JobRecord): Promise<void> {
    await this.db.collection(COLLECTION).doc(record.id).set(record);
  }

  async getById(id: string): Promise<JobRecord | null> {
    const snapshot = await this.db.collection(COLLECTION).doc(id).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as JobRecord;
  }

  async findByIdempotencyKey(key: string): Promise<JobRecord | null> {
    const snapshot = await this.db
      .collection(COLLECTION)
      .where("idempotencyKey", "==", key)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as JobRecord;
  }

  async list(limit: number, status?: string): Promise<JobRecord[]> {
    let query = this.db.collection(COLLECTION).orderBy("createdAt", "desc").limit(limit);
    if (status) {
      query = query.where("status", "==", status) as typeof query;
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as JobRecord);
  }

  async updateById(
    id: string,
    patch: Partial<JobRecord> & { updatedAt?: number }
  ): Promise<void> {
    await this.db
      .collection(COLLECTION)
      .doc(id)
      .update({ ...patch, updatedAt: patch.updatedAt ?? Date.now() });
  }

  async claimNextAvailable(workerId: string, leaseUntil: number): Promise<JobRecord | null> {
    const snapshot = await this.db
      .collection(COLLECTION)
      .where("status", "==", "PENDING")
      .where("runAfter", "<=", Date.now())
      .orderBy("runAfter", "asc")
      .orderBy("priority", "desc")
      .orderBy("createdAt", "asc")
      .limit(10)
      .get();

    if (snapshot.empty) return null;

    for (const candidate of snapshot.docs) {
      const claimed = await this.db.runTransaction(async (tx): Promise<JobRecord | null> => {
        const current = await tx.get(candidate.ref);
        if (!current.exists) return null;
        const data = current.data() as JobRecord;
        if (data.status !== "PENDING" || data.cancelRequested) {
          return null;
        }
        tx.update(candidate.ref, {
          status: "LEASED",
          leaseOwner: workerId,
          leaseUntil,
          updatedAt: Date.now()
        });
        return { ...data, status: "LEASED", leaseOwner: workerId, leaseUntil } as JobRecord;
      });
      if (claimed) return claimed;
    }

    return null;
  }

  async getExpiredLeases(now: number, limit = 50): Promise<JobRecord[]> {
    const snapshot = await this.db
      .collection(COLLECTION)
      .where("status", "in", ["LEASED", "RUNNING"])
      .where("leaseUntil", "<=", now)
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => doc.data() as JobRecord);
  }

  async bumpRunningJobs(workerId: string, increment: number): Promise<void> {
    await this.db.collection("workers").doc(workerId).update({
      runningJobs: FieldValue.increment(increment),
      updatedAt: Date.now()
    });
  }
}

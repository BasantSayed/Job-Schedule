import type { Firestore } from "firebase-admin/firestore";

export type UserRecord = {
  uid: string;
  email: string;
  displayName: string;
  createdAt: number;
};

const COLLECTION = "users";

export class UserRepository {
  constructor(private readonly db: Firestore) {}

  async upsert(record: UserRecord): Promise<void> {
    await this.db.collection(COLLECTION).doc(record.uid).set(record, { merge: true });
  }

  async list(): Promise<UserRecord[]> {
    const snap = await this.db.collection(COLLECTION).orderBy("displayName", "asc").get();
    return snap.docs.map((d) => d.data() as UserRecord);
  }

  async getByUid(uid: string): Promise<UserRecord | null> {
    const snap = await this.db.collection(COLLECTION).doc(uid).get();
    if (!snap.exists) return null;
    return snap.data() as UserRecord;
  }
}

import { Injectable, inject } from "@angular/core";
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  UpdateData,
} from "@angular/fire/firestore";
import { Observable } from "rxjs";
import { ExamSession, SessionStatus } from "../models";

export type SessionCreate = Omit<
  ExamSession,
  "id" | "studentIds" | "createdAt"
>;

@Injectable({ providedIn: "root" })
export class SessionService {
  private fs = inject(Firestore);

  private col(compId: string) {
    return collection(this.fs, `competitions/${compId}/sessions`);
  }

  getAll(compId: string): Observable<ExamSession[]> {
    return collectionData(query(this.col(compId), orderBy("date", "asc")), {
      idField: "id",
    }) as Observable<ExamSession[]>;
  }

  getForSheikh(compId: string, sheikhId: string): Observable<ExamSession[]> {
    return collectionData(
      query(
        this.col(compId),
        where("sheikhId", "==", sheikhId),
        orderBy("date", "asc"),
      ),
      { idField: "id" },
    ) as Observable<ExamSession[]>;
  }

  async create(
    compId: string,
    data: SessionCreate,
    createdBy: string,
  ): Promise<string> {
    const ref = await addDoc(this.col(compId), {
      ...data,
      studentIds: [],
      createdBy,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  async update(
    compId: string,
    sessionId: string,
    data: Partial<ExamSession>,
  ): Promise<void> {
    await updateDoc(
      doc(this.fs, `competitions/${compId}/sessions/${sessionId}`),
      data as UpdateData<ExamSession>,
    );
  }

  async updateStatus(
    compId: string,
    sessionId: string,
    status: SessionStatus,
  ): Promise<void> {
    await updateDoc(
      doc(this.fs, `competitions/${compId}/sessions/${sessionId}`),
      { status },
    );
  }

  /**
   * Assigns a single student to a session.
   * Writes BOTH sides of the relationship:
   *  - session.studentIds  (arrayUnion)
   *  - student.sessionId   (so sheikh queue queries find it)
   *  - student.status      → 'scheduled' (was stuck at 'pending' otherwise)
   * Uses a batch so the two documents never go out of sync.
   */
  async assignStudent(
    compId: string,
    sessionId: string,
    studentId: string,
  ): Promise<void> {
    const batch = writeBatch(this.fs);
    batch.update(doc(this.fs, `competitions/${compId}/sessions/${sessionId}`), {
      studentIds: arrayUnion(studentId),
    });
    batch.update(doc(this.fs, `competitions/${compId}/students/${studentId}`), {
      sessionId,
      status: "scheduled",
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  /** Bulk version — used by the session "manage students" screen. */
  async assignMany(
    compId: string,
    sessionId: string,
    studentIds: string[],
  ): Promise<void> {
    if (studentIds.length === 0) return;
    const batch = writeBatch(this.fs);
    batch.update(doc(this.fs, `competitions/${compId}/sessions/${sessionId}`), {
      studentIds: arrayUnion(...studentIds),
    });
    for (const studentId of studentIds) {
      batch.update(doc(this.fs, `competitions/${compId}/students/${studentId}`), {
        sessionId,
        status: "scheduled",
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  /**
   * Removes a student from a session and clears their sessionId
   * so they fall back into the unassigned pool instead of being
   * orphaned (assigned on the student side, absent on the session side).
   */
  async removeStudent(
    compId: string,
    sessionId: string,
    studentId: string,
  ): Promise<void> {
    const batch = writeBatch(this.fs);
    batch.update(doc(this.fs, `competitions/${compId}/sessions/${sessionId}`), {
      studentIds: arrayRemove(studentId),
    });
    batch.update(doc(this.fs, `competitions/${compId}/students/${studentId}`), {
      sessionId: null,
      status: "pending",
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  async delete(compId: string, sessionId: string): Promise<void> {
    await deleteDoc(
      doc(this.fs, `competitions/${compId}/sessions/${sessionId}`),
    );
  }
}

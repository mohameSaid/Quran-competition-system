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

  async assignStudent(
    compId: string,
    sessionId: string,
    studentId: string,
  ): Promise<void> {
    await updateDoc(
      doc(this.fs, `competitions/${compId}/sessions/${sessionId}`),
      { studentIds: arrayUnion(studentId) },
    );
  }

  async removeStudent(
    compId: string,
    sessionId: string,
    studentId: string,
  ): Promise<void> {
    await updateDoc(
      doc(this.fs, `competitions/${compId}/sessions/${sessionId}`),
      { studentIds: arrayRemove(studentId) },
    );
  }

  async delete(compId: string, sessionId: string): Promise<void> {
    await deleteDoc(
      doc(this.fs, `competitions/${compId}/sessions/${sessionId}`),
    );
  }
}

import { Injectable, inject, signal } from "@angular/core";
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  UpdateData,
} from "@angular/fire/firestore";
import { Observable, tap } from "rxjs";
import { Competition } from "../models";

@Injectable({ providedIn: "root" })
export class CompetitionService {
  private fs = inject(Firestore);
  private col = collection(this.fs, "competitions");

  /** Signal holding the currently active competition */
  readonly active = signal<Competition | null>(null);

  getAll(): Observable<Competition[]> {
    return collectionData(query(this.col, orderBy("createdAt", "desc")), {
      idField: "id",
    }) as Observable<Competition[]>;
  }

  getById(id: string): Observable<Competition | undefined> {
    return (
      docData(doc(this.fs, `competitions/${id}`), {
        idField: "id",
      }) as Observable<Competition>
    ).pipe(tap((c) => this.active.set(c ?? null)));
  }

  async create(data: Omit<Competition, "id" | "createdAt">): Promise<string> {
    const ref = await addDoc(this.col, {
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  async update(id: string, data: Partial<Competition>): Promise<void> {
    await updateDoc(
      doc(this.fs, `competitions/${id}`),
      data as UpdateData<Competition>,
    );
  }

  async toggleRegistration(id: string, open: boolean): Promise<void> {
    await updateDoc(doc(this.fs, `competitions/${id}`), {
      registrationOpen: open,
    });
  }

  async publishResults(id: string): Promise<void> {
    await updateDoc(doc(this.fs, `competitions/${id}`), {
      resultsPublished: true,
    });
  }
}

import { Injectable, inject } from "@angular/core";
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  UpdateData,
} from "@angular/fire/firestore";
import { Observable } from "rxjs";
import { Sheikh, CompetitionCategory } from "../models";
import { AuditService } from "./audit.service";

@Injectable({ providedIn: "root" })
export class SheikhService {
  private fs = inject(Firestore);
  private audit = inject(AuditService);
  private col = collection(this.fs, "sheikhs");

  /** All sheikhs — real-time stream */
  getAll(): Observable<Sheikh[]> {
    return collectionData(query(this.col, orderBy("name", "asc")), {
      idField: "id",
    }) as Observable<Sheikh[]>;
  }

  /** Only active sheikhs (for dropdowns) */
  getActive(): Observable<Sheikh[]> {
    return collectionData(
      query(this.col, where("isActive", "==", true), orderBy("name", "asc")),
      { idField: "id" },
    ) as Observable<Sheikh[]>;
  }

  getById(id: string): Observable<Sheikh | undefined> {
    return docData(doc(this.fs, `sheikhs/${id}`), {
      idField: "id",
    }) as Observable<Sheikh | undefined>;
  }

  async add(
    data: Omit<Sheikh, "id" | "totalEvaluated" | "createdAt">,
  ): Promise<string> {
    const ref = await addDoc(this.col, {
      ...data,
      totalEvaluated: 0,
      createdAt: serverTimestamp(),
    });
    this.audit.log("sheikh.create", ref.id, "sheikh", { name: data.name });
    return ref.id;
  }

  async update(
    id: string,
    data: Partial<Omit<Sheikh, "id" | "createdAt">>,
  ): Promise<void> {
    const ref = doc(this.fs, `sheikhs/${id}`);

    await updateDoc(ref, data as UpdateData<Sheikh>);

    this.audit.log("sheikh.update", id, "sheikh", data);
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(this.fs, `sheikhs/${id}`), { isActive });
    this.audit.log("sheikh.toggleActive", id, "sheikh", { isActive });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.fs, `sheikhs/${id}`));
    this.audit.log("sheikh.delete", id, "sheikh");
  }

  async incrementEvaluated(id: string): Promise<void> {
    await updateDoc(doc(this.fs, `sheikhs/${id}`), {
      totalEvaluated: increment(1),
    });
  }
}

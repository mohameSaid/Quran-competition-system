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
import { AuthAdminService } from "./auth-admin.service";

@Injectable({ providedIn: "root" })
export class SheikhService {
  private fs = inject(Firestore);
  private authAdmin = inject(AuthAdminService);
  private col = collection(this.fs, "sheikhs");

  getAll(): Observable<Sheikh[]> {
    return collectionData(query(this.col, orderBy("name", "asc")), {
      idField: "id",
    }) as Observable<Sheikh[]>;
  }

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
    return ref.id;
  }

  /** Create sheikh profile + Firebase Auth login (admin stays signed in) */
  async addWithAuth(
    data: Omit<Sheikh, "id" | "totalEvaluated" | "createdAt" | "email" | "authUid">,
    email: string,
    password: string,
  ): Promise<{ sheikhId: string; authUid: string }> {
    const ref = await addDoc(this.col, {
      ...data,
      email,
      totalEvaluated: 0,
      createdAt: serverTimestamp(),
    });
    const authUid = await this.authAdmin.createSheikhUser(
      email,
      password,
      data.name,
      ref.id,
    );
    await updateDoc(doc(this.fs, `sheikhs/${ref.id}`), { authUid });
    return { sheikhId: ref.id, authUid };
  }

  async update(
    id: string,
    data: Partial<Omit<Sheikh, "id" | "createdAt">>,
  ): Promise<void> {
    await updateDoc(
      doc(this.fs, `sheikhs/${id}`),
      data as UpdateData<Sheikh>,
    );
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(this.fs, `sheikhs/${id}`), { isActive });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.fs, `sheikhs/${id}`));
  }

  async incrementEvaluated(id: string): Promise<void> {
    await updateDoc(doc(this.fs, `sheikhs/${id}`), {
      totalEvaluated: increment(1),
    });
  }
}

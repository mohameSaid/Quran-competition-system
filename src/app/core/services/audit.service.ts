import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, addDoc, serverTimestamp,
  query, orderBy, limit, collectionData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuditLog } from '../models';
import { Auth } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private fs   = inject(Firestore);
  private auth = inject(Auth);
  private col  = collection(this.fs, 'auditLogs');

  /** Fire-and-forget — never throws, never breaks caller */
  log(action: string, targetId?: string, targetType?: string, meta?: Record<string, unknown>): void {
    const user = this.auth.currentUser;
    addDoc(this.col, {
      action,
      userId:     user?.uid    ?? 'system',
      userEmail:  user?.email  ?? 'system',
      targetId:   targetId  ?? null,
      targetType: targetType ?? null,
      meta:       meta       ?? null,
      timestamp:  serverTimestamp(),
    }).catch(e => console.warn('[AuditService]', e));
  }

  getRecent(n = 50): Observable<AuditLog[]> {
    return collectionData(
      query(this.col, orderBy('timestamp', 'desc'), limit(n)),
      { idField: 'id' }
    ) as Observable<AuditLog[]>;
  }
}

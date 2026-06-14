import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, query, where, orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Memorizer } from '../models';

@Injectable({ providedIn: 'root' })
export class MemorizerService {
  private fs  = inject(Firestore);
  private col = collection(this.fs, 'memorizers');

  getActive(): Observable<Memorizer[]> {
    return collectionData(
      query(this.col, where('isActive', '==', true), orderBy('name', 'asc')),
      { idField: 'id' },
    ) as Observable<Memorizer[]>;
  }
}

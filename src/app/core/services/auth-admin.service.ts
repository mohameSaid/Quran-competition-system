import { Injectable, inject } from '@angular/core';
import { initializeApp, deleteApp } from '@angular/fire/app';
import { getAuth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthAdminService {
  private fs = inject(Firestore);

  /** Creates Auth user via secondary app so admin session stays signed in */
  async createSheikhUser(
    email: string,
    password: string,
    displayName: string,
    sheikhId: string,
  ): Promise<string> {
    const appName = `sheikh-create-${Date.now()}`;
    const secondaryApp = initializeApp(environment.firebase, appName);
    try {
      const auth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(this.fs, `users/${cred.user.uid}`), {
        uid: cred.user.uid,
        email,
        displayName,
        role: 'sheikh',
        sheikhId,
        createdAt: serverTimestamp(),
      });
      return cred.user.uid;
    } finally {
      await deleteApp(secondaryApp);
    }
  }
}

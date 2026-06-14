import { Injectable, inject, signal, computed } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AppUser, UserRole } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth      = inject(Auth);
  private fs        = inject(Firestore);
  private router    = inject(Router);

  readonly currentUser  = signal<AppUser | null>(null);
  readonly isLoading    = signal(true);
  readonly isAdmin      = computed(() => this.currentUser()?.role === 'admin');
  readonly isSheikh     = computed(() => this.currentUser()?.role === 'sheikh');
  readonly isAuth       = computed(() => this.currentUser() !== null);

  constructor() {
    onAuthStateChanged(this.auth, async fbUser => {
      this.currentUser.set(fbUser ? await this.loadProfile(fbUser) : null);
      this.isLoading.set(false);
    });
  }

  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const user = await this.loadProfile(cred.user);
    this.currentUser.set(user);
    const map: Record<UserRole, string> = { admin: '/admin/dashboard', sheikh: '/sheikh/queue', public: '/' };
    this.router.navigate([map[user.role]]);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private async loadProfile(fbUser: User): Promise<AppUser> {
    const ref  = doc(this.fs, `users/${fbUser.uid}`);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as AppUser;
    const newUser: AppUser = {
      uid: fbUser.uid, email: fbUser.email ?? '',
      displayName: fbUser.displayName ?? 'مستخدم', role: 'public', createdAt: new Date(),
    };
    await setDoc(ref, { ...newUser, createdAt: serverTimestamp() });
    return newUser;
  }
}

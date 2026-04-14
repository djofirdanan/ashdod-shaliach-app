import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase';
import type { AdminUser } from '../types';

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<{ user: AdminUser; token: string }> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken();
  localStorage.setItem('admin_token', token);

  const user: AdminUser = {
    id: credential.user.uid,
    name: credential.user.displayName || email.split('@')[0],
    email: credential.user.email!,
    role: 'admin',
    avatar: credential.user.photoURL || undefined,
    createdAt: credential.user.metadata.creationTime || new Date().toISOString(),
  };

  return { user, token };
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  localStorage.removeItem('admin_token');
};

export const getCurrentFirebaseUser = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const refreshToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken(true);
  localStorage.setItem('admin_token', token);
  return token;
};

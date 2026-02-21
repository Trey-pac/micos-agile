import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirebaseApp } from './app';

let _auth;
export function getFirebaseAuth() {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

let _googleProvider;
export function getGoogleProvider() {
  if (!_googleProvider) _googleProvider = new GoogleAuthProvider();
  return _googleProvider;
}

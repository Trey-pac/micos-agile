import { getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from './app';

let _db;
export function getDb() {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

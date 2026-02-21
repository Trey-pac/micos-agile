import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getFirebaseApp } from './app';

let _messaging;
export async function getMessagingInstance() {
  if (_messaging) return _messaging;
  const supported = await isSupported();
  if (!supported) return null;
  _messaging = getMessaging(getFirebaseApp());
  return _messaging;
}

export { getToken, onMessage };

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getStorage } = require('firebase-admin/storage');
const { logger } = require('firebase-functions');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();
const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'tutorhunt-ded38';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
const bucket = getStorage().bucket(storageBucket);
const NOTIFICATION_CHANNEL_ID = 'tutor-buddy-updates';
const SESSION_REMINDER_WINDOW_MS = 15 * 60 * 1000;
const SESSION_REMINDER_LEAD_MS = 60 * 60 * 1000;
const RECENT_AUTH_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_PREFERENCES = {
  sessionReminders: true,
  proUpdates: true,
  productUpdates: true,
};

function stringValue(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return 0;
}

function preferenceKeyFor(type) {
  if (type === 'pro_update') return 'proUpdates';
  if (type === 'upcoming_session') return 'sessionReminders';
  return 'productUpdates';
}

async function preferencesFor(uid) {
  const snapshot = await db.doc(`notificationPreferences/${uid}`).get();
  if (!snapshot.exists) return { ...DEFAULT_PREFERENCES };
  const data = snapshot.data() || {};
  return {
    sessionReminders: typeof data.sessionReminders === 'boolean' ? data.sessionReminders : true,
    proUpdates: typeof data.proUpdates === 'boolean' ? data.proUpdates : true,
    productUpdates: typeof data.productUpdates === 'boolean' ? data.productUpdates : true,
  };
}

function notificationIdPart(value) {
  const millis = timestampMillis(value);
  return millis > 0 ? String(millis) : 'initial';
}

function notificationRef(uid, id) {
  return db.doc(`notifications/${uid}/items/${id}`);
}

async function createNotification({
  uid,
  id,
  type,
  title,
  body,
  route,
  data = {},
}) {
  if (!uid) return false;

  const preferences = await preferencesFor(uid);
  if (preferences[preferenceKeyFor(type)] === false) return false;

  const ref = notificationRef(uid, id);
  try {
    await ref.create({
      uid,
      type,
      title,
      body,
      route: route || null,
      data,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
    });
  } catch (error) {
    // Deterministic IDs make retries safe. A duplicate means the inbox item
    // and its push have already been created for this event.
    if (error?.code === 6 || error?.code === 'already-exists') return false;
    throw error;
  }

  await sendPushToUser(uid, { title, body, data: { ...data, route: route || '' } });
  return true;
}

function expoToken(token) {
  return typeof token === 'string' && token.startsWith('Expo') ? token : null;
}

function isInvalidTokenError(error) {
  return error?.code === 'messaging/registration-token-not-registered'
    || error?.code === 'messaging/invalid-registration-token';
}

async function sendExpoPushMessages(messages) {
  if (messages.length === 0) return;

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push service returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const tickets = Array.isArray(payload?.data) ? payload.data : [];
  tickets.forEach((ticket) => {
    if (ticket?.status === 'error') logger.warn('Expo push ticket failed', ticket);
  });
}

async function sendPushToUser(uid, { title, body, data }) {
  const snapshot = await db.collection(`notificationDevices/${uid}/items`).get();
  const expoMessages = [];

  await Promise.all(snapshot.docs.map(async (device) => {
    const record = device.data();
    const token = stringValue(record.token);
    if (!token) return;

    const expo = record.tokenType === 'expo' ? expoToken(token) : null;
    if (expo) {
      expoMessages.push({
        to: expo,
        title,
        body,
        data,
        channelId: NOTIFICATION_CHANNEL_ID,
        sound: 'default',
      });
      return;
    }

    // Native Android FCM tokens can be sent directly through Admin SDK. The
    // iOS native token is APNs-specific and will be handled through Expo once
    // an EAS project ID is configured on the client.
    if (record.tokenType !== 'native' || record.platform !== 'android') return;

    try {
      await messaging.send({
        token,
        notification: { title, body },
        data,
        android: {
          notification: { channelId: NOTIFICATION_CHANNEL_ID },
        },
      });
    } catch (error) {
      if (isInvalidTokenError(error)) {
        await device.ref.delete();
        return;
      }
      logger.warn('Native push delivery failed', { uid, deviceId: device.id, error });
    }
  }));

  try {
    await sendExpoPushMessages(expoMessages);
  } catch (error) {
    logger.warn('Expo push delivery failed', { uid, error });
  }
}

function activeSessionStatus(data) {
  return stringValue(data?.status) === 'scheduled';
}

exports.notifyUserOnProChange = onDocumentUpdated('entitlements/{uid}', async (event) => {
  const before = event.data?.before.data() || {};
  const after = event.data?.after.data() || {};
  const beforePlan = stringValue(before.plan, 'free');
  const afterPlan = stringValue(after.plan, 'free');
  const beforeUntil = timestampMillis(before.proUntil);
  const afterUntil = timestampMillis(after.proUntil);
  if (beforePlan === afterPlan && beforeUntil === afterUntil) return;

  const becamePro = afterPlan === 'pro' && (afterUntil === 0 || afterUntil > Date.now());
  const title = becamePro ? 'Tutor Buddy Pro is active' : 'Tutor Buddy Pro has ended';
  const body = becamePro
    ? 'Your Pro features are now available.'
    : 'Your account is now on the Free plan.';
  const eventTime = after.updatedAt || event.data.after.updateTime;

  await createNotification({
    uid: event.params.uid,
    id: `pro-update-${event.params.uid}-${notificationIdPart(eventTime)}`,
    type: 'pro_update',
    title,
    body,
    route: '/upgrade',
    data: { plan: becamePro ? 'pro' : 'free' },
  });
});

async function deleteMatchingDocuments(collectionName, field, value) {
  const snapshot = await db.collection(collectionName).where(field, '==', value).get();
  await Promise.all(snapshot.docs.map((item) => db.recursiveDelete(item.ref)));
}

/**
 * Deletes the currently authenticated tutor's account and private data.
 *
 * This intentionally runs with Admin SDK privileges so Firestore rules cannot
 * leave nested records behind. It never accepts a target UID from the client.
 */
exports.deleteMyAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in again before deleting your account.');
  }

  if (request.auth.token.admin === true) {
    throw new HttpsError('failed-precondition', 'Admin accounts must be removed through the protected admin procedure.');
  }

  const authTime = Number(request.auth.token.auth_time) * 1000;
  if (!Number.isFinite(authTime) || Date.now() - authTime > RECENT_AUTH_WINDOW_MS) {
    throw new HttpsError('failed-precondition', 'For your security, sign out and sign in again before deleting your account.');
  }

  const uid = request.auth.uid;
  const ownedRoots = [
    `users/${uid}`,
    `entitlements/${uid}`,
    `notifications/${uid}`,
    `notificationDevices/${uid}`,
    `notificationPreferences/${uid}`,
  ];

  await Promise.all(ownedRoots.map((path) => db.recursiveDelete(db.doc(path))));
  await deleteMatchingDocuments('reports', 'reporterUid', uid);
  await deleteMatchingDocuments('verificationRequests', 'uid', uid);
  await bucket.deleteFiles({ prefix: `users/${uid}/` });
  await getAuth().deleteUser(uid);

  return { deleted: true };
});

exports.sendUpcomingSessionReminders = onSchedule(
  { schedule: 'every 15 minutes', timeZone: 'Asia/Manila' },
  async () => {
    const now = Date.now();
    const start = Timestamp.fromMillis(now + SESSION_REMINDER_LEAD_MS - SESSION_REMINDER_WINDOW_MS);
    const end = Timestamp.fromMillis(now + SESSION_REMINDER_LEAD_MS + SESSION_REMINDER_WINDOW_MS);
    const sessions = await db.collectionGroup('sessions')
      .where('status', '==', 'scheduled')
      .where('startsAt', '>=', start)
      .where('startsAt', '<=', end)
      .get();

    await Promise.all(sessions.docs.map(async (sessionSnapshot) => {
      const session = sessionSnapshot.data() || {};
      const tutorUid = sessionSnapshot.ref.parent.parent?.id;
      if (!tutorUid || !activeSessionStatus(session)) return;

      const startsAt = session.startsAt;
      const startsAtMillis = timestampMillis(startsAt);
      if (!startsAtMillis) return;
      const sessionTitle = stringValue(session.subject, 'Your tutoring session');
      const displayTime = new Date(startsAtMillis).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      await createNotification({
        uid: tutorUid,
        id: `session-reminder-${sessionSnapshot.id}-${startsAtMillis}`,
        type: 'upcoming_session',
        title: 'Upcoming tutoring session',
        body: `${sessionTitle} starts at ${displayTime}.`,
        route: `/session-detail?id=${sessionSnapshot.id}`,
        data: { sessionId: sessionSnapshot.id },
      });
    }));
  },
);

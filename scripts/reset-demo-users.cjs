/*
 * Removes the current non-admin demo accounts and their user-owned data.
 *
 * This script deliberately requires --execute. Without it, it only reports
 * what would be removed. It uses a service-account key supplied through
 * GOOGLE_APPLICATION_CREDENTIALS; never commit that key to the repository.
 * Legacy marketplace collections are included only so an administrator can
 * clean old demo data safely; the active app no longer reads or writes them.
 *
 * Usage (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\service-account.json'
 *   node scripts/reset-demo-users.cjs
 *   node scripts/reset-demo-users.cjs --execute
 */

const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const PROJECT_ID = 'tutorhunt-ded38';
const ADMIN_UID = 'ZmrcGsAYqLe7Jkc8QXnGL5aQv182';
const EXPECTED_DEMO_UIDS = new Set([
  '7hXr2k4CDWXZN32DltINnCyNd002',
  'Be6z3rwvjKSJwp1hxhVRPXa6llJ2',
  'hDTYLdw0ZVfsSTkhc6sKM6GQ00k1',
]);

const execute = process.argv.includes('--execute');
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to the Firebase service-account JSON path.');
}

const serviceAccount = require(credentialsPath);
initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.firebasestorage.app` });

const auth = getAuth();
const db = getFirestore();
const bucket = getStorage().bucket();

async function listAuthUsers() {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

async function countSubcollection(path) {
  const snapshot = await db.collection(path).get();
  return snapshot.size;
}

async function collectTargets() {
  const users = await listAuthUsers();
  const admin = users.find((user) => user.uid === ADMIN_UID);
  if (!admin || admin.customClaims?.admin !== true) {
    throw new Error('The protected admin account could not be verified; refusing to continue.');
  }

  const actualNonAdminUsers = users.filter((user) => user.uid !== ADMIN_UID);
  const actualIds = new Set(actualNonAdminUsers.map((user) => user.uid));
  if (actualNonAdminUsers.length !== EXPECTED_DEMO_UIDS.size || actualNonAdminUsers.some((user) => !EXPECTED_DEMO_UIDS.has(user.uid))) {
    throw new Error(`Refusing to remove an unexpected account set. Found ${actualNonAdminUsers.length} non-admin account(s).`);
  }
  if (actualIds.size !== EXPECTED_DEMO_UIDS.size) {
    throw new Error('Refusing to continue because the target account IDs are not unique.');
  }

  const parentPosts = [];
  for (const uid of EXPECTED_DEMO_UIDS) {
    const snapshot = await db.collection('parentPosts').where('parentUid', '==', uid).get();
    parentPosts.push(...snapshot.docs);
  }

  const storageFiles = [];
  for (const uid of EXPECTED_DEMO_UIDS) {
    const [files] = await bucket.getFiles({ prefix: `users/${uid}/` });
    storageFiles.push(...files);
  }

  const counts = {
    authUsers: actualNonAdminUsers.length,
    userDocuments: actualNonAdminUsers.length,
    entitlements: 0,
    tutorProfiles: 0,
    notificationPreferences: 0,
    notifications: 0,
    notificationDevices: 0,
    parentPosts: parentPosts.length,
    storageFiles: storageFiles.length,
  };

  for (const uid of EXPECTED_DEMO_UIDS) {
    const [entitlement, profile, preferences] = await Promise.all([
      db.doc(`entitlements/${uid}`).get(),
      db.doc(`tutorProfiles/${uid}`).get(),
      db.doc(`notificationPreferences/${uid}`).get(),
    ]);
    if (entitlement.exists) counts.entitlements += 1;
    if (profile.exists) counts.tutorProfiles += 1;
    if (preferences.exists) counts.notificationPreferences += 1;
    counts.notifications += await countSubcollection(`notifications/${uid}/items`);
    counts.notificationDevices += await countSubcollection(`notificationDevices/${uid}/items`);
  }

  return { users: actualNonAdminUsers, parentPosts, storageFiles, counts };
}

async function deleteTargetData(targets) {
  for (const uid of EXPECTED_DEMO_UIDS) {
    await db.recursiveDelete(db.doc(`users/${uid}`));
    await db.recursiveDelete(db.doc(`notifications/${uid}`));
    await db.recursiveDelete(db.doc(`notificationDevices/${uid}`));
    await db.recursiveDelete(db.doc(`entitlements/${uid}`));
    await db.recursiveDelete(db.doc(`notificationPreferences/${uid}`));
    await db.recursiveDelete(db.doc(`tutorProfiles/${uid}`));
  }

  for (const post of targets.parentPosts) {
    await db.recursiveDelete(post.ref);
  }

  for (const file of targets.storageFiles) {
    await file.delete();
  }

  for (const uid of EXPECTED_DEMO_UIDS) {
    await auth.deleteUser(uid);
  }
}

async function main() {
  const targets = await collectTargets();
  console.log(JSON.stringify({
    project: PROJECT_ID,
    protectedAdminUid: ADMIN_UID,
    mode: execute ? 'execute' : 'dry-run',
    targetUids: targets.users.map((user) => user.uid),
    counts: targets.counts,
  }, null, 2));

  if (!execute) {
    console.log('Dry run only. Re-run with --execute to remove exactly these non-admin accounts and records.');
    return;
  }

  await deleteTargetData(targets);
  console.log('Cleanup complete. The protected admin account and project configuration were preserved.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

/**
 * Security rules tests. Blueprint section 31 and Phase 1.
 *
 * These run against the Firebase Firestore emulator, not production.
 *
 *   1. npx firebase-tools emulators:start --only firestore --project demo-tutor-hunt
 *   2. RULES_TEST=1 npm run test:rules
 *
 * The suite is gated behind RULES_TEST so a normal `npm test` does not fail on
 * a machine with no emulator running. It is deliberately not silently skipped
 * without a message, so nobody assumes the rules are covered when they are not.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-tutor-hunt';
const HOST = '127.0.0.1';
const PORT = 8080;

const skip =
  process.env.RULES_TEST === '1'
    ? false
    : 'Set RULES_TEST=1 and start the Firestore emulator to run these.';

let env: RulesTestEnvironment | null = null;

async function setup(): Promise<RulesTestEnvironment> {
  if (env) return env;
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      host: HOST,
      port: PORT,
    },
  });
  return env;
}

function asUser(uid: string) {
  const e = env!;
  return e.authenticatedContext(uid).firestore();
}

function asAdmin(uid: string) {
  const e = env!;
  return e.authenticatedContext(uid, { admin: true }).firestore();
}

function asAnonymous() {
  const e = env!;
  return e.unauthenticatedContext().firestore();
}

async function seedUser(uid: string, over: Record<string, unknown> = {}) {
  const e = await setup();
  await e.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      uid,
      email: `${uid}@example.com`,
      displayName: uid,
      role: 'tutor',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...over,
    });
  });
}

test('rules: an owner can read and update their own profile', { skip }, async () => {
  await setup();
  await seedUser('alice');
  const db = asUser('alice');

  await assertSucceeds(getDoc(doc(db, 'users', 'alice')));
  await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), { displayName: 'Alice T.' }));
});

test('rules: a user cannot read another user document', { skip }, async () => {
  await setup();
  await seedUser('alice');
  await seedUser('bob');

  await assertFails(getDoc(doc(asUser('bob'), 'users', 'alice')));
});

test('rules: role cannot be changed by the client', { skip }, async () => {
  await setup();
  await seedUser('alice');

  await assertFails(updateDoc(doc(asUser('alice'), 'users', 'alice'), { role: 'parent' }));
});

test('rules: accountStatus cannot be changed by the client', { skip }, async () => {
  await setup();
  await seedUser('alice');

  await assertFails(
    updateDoc(doc(asUser('alice'), 'users', 'alice'), { accountStatus: 'suspended' }),
  );
});

test('rules: private subcollections are owner-only', { skip }, async () => {
  await setup();
  await seedUser('alice');
  await seedUser('bob');

  await assertSucceeds(
    setDoc(doc(asUser('alice'), 'users', 'alice', 'students', 's1'), { nickname: 'Ana' }),
  );
  await assertFails(getDoc(doc(asUser('bob'), 'users', 'alice', 'students', 's1')));
});

test('rules: a suspended account cannot write but can still read', { skip }, async () => {
  await setup();
  await seedUser('alice', { accountStatus: 'suspended' });

  const db = asUser('alice');
  await assertSucceeds(getDoc(doc(db, 'users', 'alice')));
  await assertFails(
    setDoc(doc(db, 'users', 'alice', 'students', 's1'), { nickname: 'Ana' }),
  );
});

test('rules: an entitlement can only be created as Free', { skip }, async () => {
  await setup();
  await seedUser('alice');

  await assertFails(
    setDoc(doc(asUser('alice'), 'entitlements', 'alice'), {
      uid: 'alice',
      plan: 'pro',
      proUntil: null,
      trialEndsAt: null,
      usageMonth: '2026-10',
      pdfStatementsThisMonth: 0,
    }),
  );

  await assertSucceeds(
    setDoc(doc(asUser('alice'), 'entitlements', 'alice'), {
      uid: 'alice',
      plan: 'free',
      proUntil: null,
      trialEndsAt: null,
      usageMonth: '2026-10',
      pdfStatementsThisMonth: 0,
    }),
  );
});

test('rules: a client cannot escalate itself to Pro', { skip }, async () => {
  await setup();
  await seedUser('alice');
  const e = await setup();
  await e.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entitlements', 'alice'), {
      uid: 'alice',
      plan: 'free',
      proUntil: null,
      trialEndsAt: null,
      usageMonth: '2026-10',
      pdfStatementsThisMonth: 0,
    });
  });

  await assertFails(updateDoc(doc(asUser('alice'), 'entitlements', 'alice'), { plan: 'pro' }));
  await assertFails(
    updateDoc(doc(asUser('alice'), 'entitlements', 'alice'), { proUntil: new Date(2030, 1, 1) }),
  );
});

test('rules: the PDF counter may rise by at most one within a month', { skip }, async () => {
  await setup();
  await seedUser('alice');
  const e = await setup();
  await e.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entitlements', 'alice'), {
      uid: 'alice',
      plan: 'free',
      proUntil: null,
      trialEndsAt: null,
      usageMonth: '2026-10',
      pdfStatementsThisMonth: 1,
    });
  });

  const db = asUser('alice');

  await assertSucceeds(
    updateDoc(doc(db, 'entitlements', 'alice'), { pdfStatementsThisMonth: 2 }),
  );

  // Jumping from 2 to 50 in one write is refused.
  await assertFails(
    updateDoc(doc(db, 'entitlements', 'alice'), { pdfStatementsThisMonth: 50 }),
  );

  // Lowering it within the same month is refused.
  await assertFails(
    updateDoc(doc(db, 'entitlements', 'alice'), { pdfStatementsThisMonth: 0 }),
  );
});

test('rules: usageMonth may not move backwards', { skip }, async () => {
  await setup();
  await seedUser('alice');
  const e = await setup();
  await e.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entitlements', 'alice'), {
      uid: 'alice',
      plan: 'free',
      proUntil: null,
      trialEndsAt: null,
      usageMonth: '2026-10',
      pdfStatementsThisMonth: 1,
    });
  });

  await assertFails(
    updateDoc(doc(asUser('alice'), 'entitlements', 'alice'), { usageMonth: '2026-09' }),
  );
});

test('rules: a tutor cannot award itself verification or a rating', { skip }, async () => {
  await setup();
  await seedUser('alice');
  const e = await setup();
  await e.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'tutorProfiles', 'alice'), {
      uid: 'alice',
      displayName: 'Alice',
      rating: 0,
      reviewCount: 0,
      identityVerified: false,
      credentialsVerified: false,
    });
  });

  const db = asUser('alice');

  await assertFails(
    updateDoc(doc(db, 'tutorProfiles', 'alice'), { credentialsVerified: true }),
  );
  await assertFails(updateDoc(doc(db, 'tutorProfiles', 'alice'), { rating: 5 }));

  // Ordinary profile edits still work.
  await assertSucceeds(updateDoc(doc(db, 'tutorProfiles', 'alice'), { displayName: 'Alice T.' }));
});

test('rules: a parent profile is readable only when contactVisible', { skip }, async () => {
  await setup();
  await seedUser('alice', { role: 'parent' });
  await seedUser('bob');
  const e = await setup();
  await e.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'parentProfiles', 'alice'), {
      uid: 'alice',
      displayName: 'Alice',
      city: 'Tacloban City',
      contactVisible: false,
    });
  });

  await assertFails(getDoc(doc(asUser('bob'), 'parentProfiles', 'alice')));

  await e.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), 'parentProfiles', 'alice'), { contactVisible: true });
  });

  await assertSucceeds(getDoc(doc(asUser('bob'), 'parentProfiles', 'alice')));
});

test('rules: reports are writable by any signed-in user but readable only by admin', { skip }, async () => {
  await setup();
  await seedUser('alice');

  await assertSucceeds(
    setDoc(doc(asUser('alice'), 'reports', 'r1'), {
      reporterUid: 'alice',
      targetType: 'tutor_profile',
      targetId: 'someone',
      reason: 'spam',
      description: '',
      status: 'pending',
      createdAt: new Date(),
    }),
  );

  await assertFails(getDoc(doc(asUser('alice'), 'reports', 'r1')));
  await assertSucceeds(getDoc(doc(asAdmin('root'), 'reports', 'r1')));
});

test('rules: an anonymous client cannot read the marketplace', { skip }, async () => {
  await setup();
  await seedUser('alice');

  await assertFails(getDoc(doc(asAnonymous(), 'users', 'alice')));
});

test('rules: an owner cannot delete their own user document', { skip }, async () => {
  await setup();
  await seedUser('alice');

  await assertFails(deleteDoc(doc(asUser('alice'), 'users', 'alice')));
});

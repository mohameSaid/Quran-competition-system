#!/usr/bin/env node
/**
 * Firestore seed importer.
 *
 * Converts the legacy relational reference data into Firestore documents
 * following the platform's data model:
 *   • masterData/{domain}/items/{code}   ← seed/master-data.json
 *   • rolePolicies/{role}                ← seed/role-policies.json
 *
 * Idempotent: document IDs are the stable `code`, so re-running merges
 * rather than duplicating. Hierarchical lists (province→city→village)
 * resolve `parentCode` → `parentId` using those stable IDs.
 *
 * Usage:
 *   npm i -D firebase-admin           # one-time (kept out of app bundle)
 *   # Auth via a service-account key:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   node scripts/seed/import.mjs [--project <projectId>] [--dry-run]
 *
 * Or, against the local emulator:
 *   export FIRESTORE_EMULATOR_HOST=localhost:8080
 *   node scripts/seed/import.mjs --project quran-competition-system
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedDir = resolve(__dirname, '../../seed');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const projectId = argValue('--project') ?? process.env.GCLOUD_PROJECT ?? 'quran-competition-system';
const TENANT = 'default';

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

async function readJson(name) {
  const raw = await readFile(resolve(seedDir, name), 'utf8');
  return JSON.parse(raw);
}

function nowFields() {
  const ts = admin.firestore.FieldValue.serverTimestamp();
  return { createdAt: ts, updatedAt: ts, createdBy: 'seed', organizationId: TENANT };
}

async function importMasterData(db, data) {
  let count = 0;
  for (const [domain, items] of Object.entries(data)) {
    if (domain.startsWith('_') || !Array.isArray(items)) continue;
    for (const item of items) {
      const { parentCode, ...rest } = item;
      const doc = {
        ...rest,
        domain,
        ...(parentCode ? { parentId: parentCode } : {}),
        ...nowFields(),
      };
      const ref = db.collection('masterData').doc(domain).collection('items').doc(item.code);
      console.log(`  masterData/${domain}/items/${item.code}  (${item.name.ar})`);
      if (!dryRun) await ref.set(doc, { merge: true });
      count++;
    }
  }
  return count;
}

async function importRolePolicies(db, data) {
  let count = 0;
  for (const [role, policy] of Object.entries(data)) {
    if (role.startsWith('_')) continue;
    console.log(`  rolePolicies/${role}  (${policy.permissions.length} permissions)`);
    if (!dryRun) {
      await db.collection('rolePolicies').doc(role).set(
        { role, permissions: policy.permissions, ...nowFields() },
        { merge: true },
      );
    }
    count++;
  }
  return count;
}

async function main() {
  console.log(`▶ Seeding project "${projectId}"${dryRun ? ' (dry-run)' : ''}`);
  if (!admin.apps.length) admin.initializeApp({ projectId });
  const db = admin.firestore();

  const master = await readJson('master-data.json');
  const policies = await readJson('role-policies.json');

  const mdCount = await importMasterData(db, master);
  const rpCount = await importRolePolicies(db, policies);

  console.log(`✔ Done — ${mdCount} reference items, ${rpCount} role policies.`);
  if (dryRun) console.log('  (dry-run: nothing was written)');
}

main().catch((err) => {
  console.error('✘ Seed failed:', err);
  process.exit(1);
});

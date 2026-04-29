// SPDX-FileCopyrightText: 2026 Padparadscho <contact@padparadscho.com>
// SPDX-License-Identifier: GPL-3.0-only

/**
 * One-time script to seed the events table with data from the events JSON file
 *
 * Reads event records from `./tables/events.json` and bulk inserts them into the database
 * Existing records (by primary key) are silently skipped
 * Ideally, tables files will be updated periodically as new events are processed
 *
 * - Run: pnpm ts-node ./scripts/seed-events-table.ts
 */
import { db } from '../src/database';
import fs from 'fs/promises';
import path from 'path';

const eventsFile = path.join(__dirname, './tables/events.json');

interface EventRow {
  id: string;
  topics: string | null;
  data: string | null;
  transaction_hash: string | null;
  ledger_sequence: number | null;
  ledger_closed_at: string | null;
  processed: boolean;
  escrow_balance: string | null;
  unit_price: string | null;
}

async function seed() {
  try {
    const raw = await fs.readFile(eventsFile, 'utf-8');
    const events: EventRow[] = JSON.parse(raw);

    console.log(`Seeding ${String(events.length)} events...`);

    await db
      .insertInto('events')
      .values(events)
      .onConflict((oc) => oc.doNothing())
      .execute();

    console.log('Done.');
  } finally {
    await db.destroy();
  }
}

void seed();

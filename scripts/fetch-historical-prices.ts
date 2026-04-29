// SPDX-FileCopyrightText: 2026 Padparadscho <contact@padparadscho.com>
// SPDX-License-Identifier: GPL-3.0-only

/**
 * One-time script to backfill historical prices for processed events
 * Requires a ValidationCloud Node API key (https://www.validationcloud.io/node)
 *
 * This method has a request limit of 10 requests per second or a max of 5 requests in-flight at any one time
 * Learn more: https://docs.validationcloud.io/v1/stellar/horizon-api/trade-aggregations/list-trade-aggregations
 *
 * NOTE: - Manually update the starting ledger after each run to continue backfilling without being rate limited
 *       - Needs better implementation, but works fine for one-time backfilling
 *
 * - Run: pnpm ts-node ./scripts/fetch-historical-prices.ts
 */

import dotenv from 'dotenv';
import { db } from '../src/database';
import type { Events } from '../src/schema';

dotenv.config();

const VALIDATION_CLOUD_API_KEY = process.env.VALIDATIONCLOUD_API_KEY;
const LEDGER_START = 57577223; // First ledger with escrow events

export type EventRow = Events;

// Reusable delay utility
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches all processed escrow events since a given ledger
 * @param sinceLedger - Starting ledger sequence (inclusive)
 * @returns Array of processed event rows
 */
export async function getProcessedEscrowEvents(
  sinceLedger: number,
): Promise<EventRow[]> {
  return db
    .selectFrom('events')
    .selectAll()
    .where('processed', '=', true)
    .where('ledger_sequence', '>=', String(sinceLedger))
    .orderBy('ledger_sequence', 'asc')
    .execute() as unknown as Promise<EventRow[]>;
}

/**
 * Updates the unit_price for a specific event
 * @param id - Event ID to update
 * @param unitPrice - Historical unit price in USD
 */
export async function updateEventUnitPrice(
  ids: string[],
  unitPrice: string,
): Promise<void> {
  await db
    .updateTable('events')
    .set({ unit_price: unitPrice })
    .where('id', 'in', ids)
    .execute();
}

interface TradeAggregationRecord {
  average_price: string;
}

interface TradeAggregationResponse {
  _embedded: {
    records: TradeAggregationRecord[];
  };
}

/**
 * Fetches the historical price (paired with USDC)
 * @param timestampMs - Event timestamp in milliseconds
 * @returns Average price as string, or null if no trade data exists
 */
async function fetchHistoricalPrice(
  timestampMs: number,
): Promise<string | null> {
  const params = new URLSearchParams({
    base_asset_type: 'credit_alphanum12',
    base_asset_code: 'SHX',
    base_asset_issuer:
      'GDSTRSHXHGJ7ZIVRBXEYE5Q74XUVCUSEKEBR7UCHEUUEK72N7I7KJ6JH',
    counter_asset_type: 'credit_alphanum4',
    counter_asset_code: 'USDC',
    counter_asset_issuer:
      'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    start_time: String(timestampMs),
    end_time: String(timestampMs + 3600000),
    resolution: '60000',
    limit: '1',
    order: 'asc',
  });

  if (!VALIDATION_CLOUD_API_KEY) {
    throw new Error('VALIDATIONCLOUD_API_KEY is required');
  }

  const url = `https://archive.stellar.validationcloud.io/v1/${VALIDATION_CLOUD_API_KEY}/trade_aggregations?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${String(response.status)}: ${error}`);
  }

  const data = (await response.json()) as TradeAggregationResponse;
  const records = data._embedded.records;
  if (records.length === 0) {
    return null;
  }

  return records[0].average_price;
}

/**
 * Converts a ledger_closed_at timestamp to milliseconds since epoch
 * @param ledgerClosedAt - The ledger_closed_at value from the event
 * @returns Timestamp in milliseconds
 */
function toTimestampMs(ledgerClosedAt: unknown): number {
  return new Date(ledgerClosedAt as string).getTime();
}

/**
 * Main execution block
 */
async function main(): Promise<void> {
  const events = await getProcessedEscrowEvents(LEDGER_START);

  console.log(`Processing ${String(events.length)} events...\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    try {
      const price = await fetchHistoricalPrice(
        toTimestampMs(event.ledger_closed_at),
      );

      if (!price) {
        skipped++;
        continue;
      }

      await updateEventUnitPrice([event.id], price);
      updated++;

      console.log(`[${String(i + 1)}/${String(events.length)}] $${price}`);

      await sleep(10000);
    } catch {
      failed++;
    }
  }

  console.log(
    `\nEvents processed: ${String(updated)} updated, ${String(skipped)} skipped, ${String(failed)} failed`,
  );
}

main().catch(() => process.exit(1));

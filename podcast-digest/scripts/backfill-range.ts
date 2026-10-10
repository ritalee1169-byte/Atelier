/**
 * Backfill digest for a date range by triggering backfill-digest tasks via Trigger.dev API.
 * Usage: npx tsx scripts/backfill-range.ts 2026-04-01 2026-05-05
 *   (end date is inclusive, defaults to yesterday if omitted)
 */
import { execSync } from 'child_process'
import * as path from 'path'

// dotenv is not a dependency; Node 20.12+ can load the env file itself
process.loadEnvFile(path.resolve(process.cwd(), '.env.local'))

const TRIGGER_SECRET_KEY = process.env.TRIGGER_SECRET_KEY!
const PROJECT_REF = 'proj_ausauvjoptvofpjkowns'

if (!TRIGGER_SECRET_KEY) {
  console.error('TRIGGER_SECRET_KEY not set in .env.local')
  process.exit(1)
}

function parseDateArg(arg: string): Date {
  const d = new Date(arg + 'T12:00:00Z')
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${arg}`)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setUTCDate(copy.getUTCDate() + n)
  return copy
}

async function triggerBackfill(dateStr: string): Promise<string> {
  const payload = JSON.stringify({ date: dateStr })
  const result = execSync(
    `curl -s -X POST https://api.trigger.dev/api/v1/tasks/backfill-digest/trigger \
      -H "Authorization: Bearer ${TRIGGER_SECRET_KEY}" \
      -H "Content-Type: application/json" \
      -d '${payload.replace(/'/g, "'\\''")}'`
  ).toString()
  const json = JSON.parse(result)
  if (json.error) throw new Error(`API error: ${json.error}`)
  return json.id ?? json.runId ?? JSON.stringify(json)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/backfill-range.ts <start-date> [end-date]')
    console.error('  Example: npx tsx scripts/backfill-range.ts 2026-04-01 2026-05-05')
    process.exit(1)
  }

  const start = parseDateArg(args[0])
  const yesterday = addDays(new Date(), -1)
  const end = args[1] ? parseDateArg(args[1]) : yesterday

  if (start > end) {
    console.error('start-date must be <= end-date')
    process.exit(1)
  }

  const dates: string[] = []
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    dates.push(toDateStr(d))
  }

  console.log(`Backfilling ${dates.length} days: ${dates[0]} → ${dates[dates.length - 1]}`)
  console.log('Note: tasks run in parallel on Trigger.dev — all will be queued immediately\n')

  let ok = 0
  let fail = 0
  for (const dateStr of dates) {
    try {
      const runId = await triggerBackfill(dateStr)
      console.log(`✓ ${dateStr} → run ${runId}`)
      ok++
    } catch (err) {
      console.error(`✗ ${dateStr} → ${(err as Error).message}`)
      fail++
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone: ${ok} triggered, ${fail} failed`)
}

main().catch(e => { console.error(e); process.exit(1) })

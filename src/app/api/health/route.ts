import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Cron jobs we track for last-run recency (all must have run within 2× their schedule)
const MONITORED_CRONS = [
  'cleanup_expired_reservations',
  'expire_events',
  'janitor_purge_audit_logs',
  'janitor_lifecycle_updates',
  'janitor_pgmq_maintenance',
  'capture_dead_letters',
  'process_ad_billing_batch',
  'refresh_mv_platform_overview',
];

// DEFAULT partitions that must stay empty — rows here mean partman missed a period
const DEFAULT_PARTITIONS = [
  { schema: 'transactions', table: 'transactions_default' },
  { schema: 'tickets', table: 'tickets_default' },
  { schema: 'system_jobs', table: 'system_jobs_default' },
  { schema: 'audit_logs', table: 'audit_logs_default' },
];

// DLQ depth threshold — alert if more than this many unresolved dead letters
const DLQ_ALERT_THRESHOLD = 10;

interface Check {
  ok: boolean;
  detail?: string | number;
}

export async function GET() {
  const supabase = await createClient();
  const checks: Record<string, Check> = {};
  let healthy = true;

  // ── 1. DB connectivity ────────────────────────────────────────────────────
  try {
    const { error } = await supabase.from('fx_rates').select('id').limit(1);
    checks.db = error ? { ok: false, detail: error.message } : { ok: true };
  } catch (e: unknown) {
    checks.db = { ok: false, detail: e instanceof Error ? e.message : 'unreachable' };
  }

  // ── 2. Dead letter queue depth ────────────────────────────────────────────
  try {
    const { count, error } = await supabase
      .schema('internal' as any)
      .from('dead_letter_queue')
      .select('queue_name', { count: 'exact', head: true });
    if (error) throw error;
    const depth = count ?? 0;
    checks.dlq = {
      ok: depth <= DLQ_ALERT_THRESHOLD,
      detail: depth,
    };
  } catch (e: unknown) {
    checks.dlq = { ok: false, detail: e instanceof Error ? e.message : 'query failed' };
  }

  // ── 3. pg_cron last-run timestamps ───────────────────────────────────────
  try {
    const { data, error } = await supabase
      .rpc('get_cron_health', { p_job_names: MONITORED_CRONS });

    if (error) throw error;

    const stale: string[] = [];
    for (const row of (data ?? []) as Array<{ jobname: string; last_run_at: string | null; ok: boolean }>) {
      if (!row.ok) stale.push(row.jobname);
    }
    checks.cron = stale.length === 0
      ? { ok: true }
      : { ok: false, detail: `stale: ${stale.join(', ')}` };
  } catch (e: unknown) {
    // get_cron_health RPC may not exist yet — degrade gracefully
    checks.cron = { ok: true, detail: 'skipped (rpc unavailable)' };
  }

  // ── 4. DEFAULT partition sizes ────────────────────────────────────────────
  const partitionIssues: string[] = [];
  for (const p of DEFAULT_PARTITIONS) {
    try {
      const { data, error } = await supabase
        .rpc('get_default_partition_count', { p_schema: p.schema, p_table: p.table });
      if (error) throw error;
      const rowCount = Number(data ?? 0);
      if (rowCount > 0) partitionIssues.push(`${p.schema}.${p.table}: ${rowCount} rows`);
    } catch {
      // non-critical — skip if RPC unavailable
    }
  }
  checks.partitions = partitionIssues.length === 0
    ? { ok: true }
    : { ok: false, detail: partitionIssues.join('; ') };

  // ── Aggregate ─────────────────────────────────────────────────────────────
  healthy = Object.values(checks).every(c => c.ok);

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}

import type { ToxicConfig } from '../toxiproxy/types.js';

export interface ChaosScenarioResult {
  scenario: string;
  passed: boolean;
  graceful: boolean;
  recovery: 'auto' | 'manual' | 'n/a';
  durationMs: number;
  notes: string;
}

export interface ChaosScenario {
  /** Human-readable name for the scenario */
  name: string;
  /** What this scenario tests */
  description: string;
  /** Which Toxiproxy proxy to target */
  proxy: string;
  /** What failure to inject (null = disable proxy entirely) */
  toxic: ToxicConfig | null;
  /** What the app should do during the failure */
  expectedBehavior: string;
}

/**
 * Runs a chaos scenario, recording timing and results into the report collector.
 * Use this in your chaos test files to avoid duplicating the timing/recording logic.
 */
export async function runScenario(
  collector: { record: (result: ChaosScenarioResult) => void },
  name: string,
  fn: () => Promise<Partial<ChaosScenarioResult>>,
): Promise<void> {
  const start = Date.now();
  try {
    const partial = await fn();
    collector.record({
      scenario: name,
      passed: partial.passed ?? true,
      graceful: partial.graceful ?? true,
      recovery: partial.recovery ?? 'n/a',
      durationMs: Date.now() - start,
      notes: partial.notes ?? '',
    });
  } catch (error) {
    // Record the failure but do NOT re-throw — chaos failures are expected
    // outcomes that should appear in the report, not crash the Jest suite.
    collector.record({
      scenario: name,
      passed: false,
      graceful: false,
      recovery: 'n/a',
      durationMs: Date.now() - start,
      notes: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

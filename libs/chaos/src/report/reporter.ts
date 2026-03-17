import type { ChaosScenarioResult } from '../scenarios/scenario.js';

export interface ResilienceReport {
  app: string;
  results: ChaosScenarioResult[];
  generatedAt: string;
}

/**
 * Generates a markdown resilience report from chaos test results.
 */
export function generateReport(reports: ResilienceReport[]): string {
  const lines: string[] = [];
  const now = reports[0]?.generatedAt ?? new Date().toISOString();

  lines.push('# Resilience Report — System Craft');
  lines.push(`Generated: ${now}`);
  lines.push('');

  let totalScenarios = 0;
  let totalPassed = 0;
  let totalGraceful = 0;

  for (const report of reports) {
    lines.push(`## ${report.app}`);
    lines.push('');
    lines.push(
      '| Scenario | Result | Graceful? | Recovery | Duration | Notes |',
    );
    lines.push(
      '|----------|--------|-----------|----------|----------|-------|',
    );

    for (const r of report.results) {
      totalScenarios++;
      if (r.passed) totalPassed++;
      if (r.graceful) totalGraceful++;

      lines.push(
        `| ${r.scenario} | ${r.passed ? 'PASS' : 'FAIL'} | ${r.graceful ? 'YES' : 'NO'} | ${r.recovery} | ${r.durationMs}ms | ${r.notes} |`,
      );
    }

    lines.push('');
  }

  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total scenarios:** ${totalScenarios}`);
  lines.push(`- **Passed:** ${totalPassed}`);
  lines.push(`- **Failed:** ${totalScenarios - totalPassed}`);
  lines.push(`- **Graceful degradation:** ${totalGraceful}/${totalScenarios}`);
  lines.push(
    `- **Resilience score:** ${totalPassed}/${totalScenarios} (${totalScenarios > 0 ? Math.round((totalPassed / totalScenarios) * 100) : 0}%)`,
  );
  lines.push('');

  return lines.join('\n');
}

/**
 * Collects results from Jest test runs into a ResilienceReport.
 */
export function createReportCollector(app: string): {
  record: (result: ChaosScenarioResult) => void;
  toReport: () => ResilienceReport;
} {
  const results: ChaosScenarioResult[] = [];

  return {
    record(result: ChaosScenarioResult) {
      results.push(result);
    },
    toReport(): ResilienceReport {
      return {
        app,
        results,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

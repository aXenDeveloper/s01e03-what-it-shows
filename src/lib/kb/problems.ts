import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

export const PROBLEM_TITLES: Record<Problem, string> = {
  parser: 'Shared parser reads day-first dates month first',
  hint: 'booking-v3 form hint says MM/DD/YYYY but the form reads the date day first',
  'one-day': 'Dates move by one day between time zones',
  unplaced: 'No tenant on file',
};

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  taggedAs: Record<string, number>;
  channels: Record<string, number>;
  tenants: string[];
  firstSeen: string;
  lastSeen: string;
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

const tally = (values: string[]) =>
  values.reduce<Record<string, number>>((n, v) => ({ ...n, [v]: (n[v] ?? 0) + 1 }), {});

export function mergedInto(reports: Report[], ticket: number) {
  const unique = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const rows = reports.filter((r) => r.mergedInto === ticket).length;
  return { unique, rows, repeated: rows - unique.length };
}

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  for (const r of reports) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
        channels: tally(rs.map((r) => r.channel)),
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}

export function intakeMisses(groups: ProblemGroup[]): number {
  return groups.reduce((n, g) => n + g.reports.filter((r) => r.meta.intakeTag !== g.problem).length, 0);
}

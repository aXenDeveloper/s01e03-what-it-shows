<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { PROBLEM_TITLES, groupByProblem, intakeMisses, mergedInto, type Problem } from '#lib/kb/problems';

  let { ticket, issues = {} }: { ticket: number; issues?: Partial<Record<Problem, string>> } = $props();

  const merged = $derived(mergedInto(reports as Report[], ticket));
  const groups = $derived(groupByProblem(merged.unique, tenantOf, notes.oneDayMove));
  const misses = $derived(intakeMisses(groups));
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{merged.unique.length}</strong> reports in #{ticket} ·
  <strong>{groups.length}</strong> {groups.length === 1 ? 'problem' : 'problems'}
</p>
<p class="note">
  The export has {merged.rows} rows: {merged.repeated} reports appear twice because its pages overlap. One id, one report.
  Intake's tag disagrees with the problem on {misses} reports.
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>channels</th><th>tagged as</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code><br /><span class="title">{PROBLEM_TITLES[g.problem]}</span></td>
        <td><strong>{g.reports.length}</strong></td>
        <td>{g.tenants.length}</td>
        <td class="muted">{list(g.channels)}</td>
        <td class="muted">{list(g.taggedAs)}</td>
        <td class="muted">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if issues[g.problem]}<a href={issues[g.problem]}>issue</a>{:else}<span class="none">none yet</span>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#each groups as g (g.problem)}
  <details>
    <summary><code>{g.problem}</code>: {g.reports.length} reports from {g.tenants.join(', ')}</summary>
    <p class="ids">{g.reports.map((r) => r.id).join(' ')}</p>
  </details>
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .note, .muted { color: var(--muted); font-size: 0.85em; }
  .title { font-size: 0.85em; }
  .none { color: var(--warn); }
  .ids { font: 0.78rem var(--mono); color: var(--muted); word-spacing: 0.3em; }
  details { margin: 0.4rem 0; }
</style>

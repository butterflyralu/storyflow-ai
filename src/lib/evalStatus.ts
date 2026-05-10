export type EvalStatus = 'PASS' | 'PASS_WITH_CAVEAT' | 'FAIL' | null | undefined;

export function getEvalStatus(result: EvalStatus) {
  if (result === 'PASS') {
    return {
      label: 'Evaluated',
      tooltip: 'Evaluated — Passed',
      dotClass: 'bg-green-500',
      badgeClass: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
    };
  }
  if (result === 'PASS_WITH_CAVEAT') {
    return {
      label: 'With caveats',
      tooltip: 'Evaluated — Passed with caveats',
      dotClass: 'bg-amber-500',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    };
  }
  if (result === 'FAIL') {
    return {
      label: 'Needs work',
      tooltip: 'Evaluated — Needs work',
      dotClass: 'bg-amber-500',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    };
  }
  return {
    label: 'Draft',
    tooltip: 'Draft — not evaluated yet',
    dotClass: 'bg-muted-foreground/40',
    badgeClass: 'border-border bg-muted/40 text-muted-foreground',
  };
}

export type ScorecardVerdict = 'PASS' | 'PASS_WITH_CAVEAT' | 'FAIL';

/**
 * Visual treatment for a scorecard row verdict.
 * - PASS → green
 * - PASS_WITH_CAVEAT → amber
 * - FAIL → red (destructive)
 */
export function getVerdictVariant(result: ScorecardVerdict) {
  if (result === 'PASS') {
    return {
      rowBg: 'bg-primary/5',
      iconBg: 'bg-primary/20 text-primary',
      icon: 'check' as const,
      textClass: 'text-green-500',
    };
  }
  if (result === 'PASS_WITH_CAVEAT') {
    return {
      rowBg: 'bg-amber-500/5',
      iconBg: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
      icon: 'warning' as const,
      textClass: 'text-amber-600 dark:text-amber-400',
    };
  }
  return {
    rowBg: 'bg-destructive/5',
    iconBg: 'bg-destructive/20 text-destructive',
    icon: 'x' as const,
    textClass: 'text-destructive',
  };
}

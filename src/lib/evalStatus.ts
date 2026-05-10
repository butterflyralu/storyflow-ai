export type EvalStatus = 'PASS' | 'FAIL' | null | undefined;

export function getEvalStatus(result: EvalStatus) {
  if (result === 'PASS') {
    return {
      label: 'Evaluated',
      tooltip: 'Evaluated — Passed',
      dotClass: 'bg-green-500',
      badgeClass: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
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

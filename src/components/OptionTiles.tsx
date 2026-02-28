import { cn } from '@/lib/utils';

interface Props {
  options: { label: string }[];
  onSelect: (label: string) => void;
}

export function OptionTiles({ options, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.label}
          onClick={() => onSelect(opt.label)}
          className={cn(
            'rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium',
            'text-foreground shadow-soft transition-all duration-200',
            'hover:border-primary/30 hover:bg-peach-light hover:shadow-soft-lg',
            'active:scale-[0.97]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

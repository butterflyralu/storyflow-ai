import { OptionTile } from '@/types/wizard';
import { cn } from '@/lib/utils';

interface Props {
  options: OptionTile[];
  onSelect: (value: string) => void;
}

export function OptionTiles({ options, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.label}
          onClick={() => onSelect(opt.value)}
          className={cn(
            'rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium',
            'text-foreground shadow-sm transition-all duration-150',
            'hover:border-primary/40 hover:bg-primary/5 hover:shadow-md',
            'active:scale-[0.97]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

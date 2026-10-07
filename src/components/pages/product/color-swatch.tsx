import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type ColorSwatchProps = {
  color: string;
  isSelected: boolean;
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  imageUrl?: string | null;
};

function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return false;
  const r = Number.parseInt(h.substr(0, 2), 16);
  const g = Number.parseInt(h.substr(2, 2), 16);
  const b = Number.parseInt(h.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export function ColorSwatch({
  color,
  isSelected,
  onClick,
  label,
  disabled = false,
  imageUrl,
}: ColorSwatchProps) {
  const dark = !isLightColor(color);

  return (
    <div className='flex flex-col items-center gap-1'>
      <button
        type='button'
        className={cn(
          'relative h-10 w-10 rounded-full border-2 transition-all bg-cover bg-center',
          isSelected ? 'ring-primary ring-2 ring-offset-2' : 'ring-offset-0',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer hover:opacity-90',
        )}
        style={
          imageUrl
            ? { backgroundImage: `url(${imageUrl})` }
            : { backgroundColor: color }
        }
        onClick={onClick}
        disabled={disabled}
        aria-label={label ?? color}
        aria-pressed={isSelected}
      >
        {isSelected && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <Check
              className={cn(
                'h-5 w-5 drop-shadow-md',
                imageUrl ? 'text-white' : dark ? 'text-white' : 'text-black',
              )}
            />
          </div>
        )}
      </button>
      {label && <span className='text-xs'>{label}</span>}
    </div>
  );
}

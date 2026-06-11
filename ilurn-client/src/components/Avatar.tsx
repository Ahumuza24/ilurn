import { cn } from '../lib/utils';

const SIZES = {
  sm: 'h-9 w-9 text-lg rounded-xl',
  md: 'h-12 w-12 text-2xl rounded-2xl',
  lg: 'h-20 w-20 text-4xl rounded-3xl',
  xl: 'h-28 w-28 text-6xl rounded-[2rem]',
} as const;

export type AvatarSize = keyof typeof SIZES;

export function avatarForAgeGroup(group: string | null): string {
  switch (group) {
    case 'TODDLER': return '🧸';
    case 'PRE_PRIMARY': return '🐣';
    case 'PUPIL': return '🦊';
    case 'STUDENT': return '🎓';
    case 'ADMIN': return '🧑‍🏫';
    default: return '👋';
  }
}

interface AvatarProps {
  emoji: string;
  size?: AvatarSize;
  ring?: boolean;
  className?: string;
}

export function Avatar({ emoji, size = 'md', ring = true, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-white shadow-sm shadow-violet-200/60 select-none',
        ring && 'ring-2 ring-violet-200',
        SIZES[size],
        className,
      )}
    >
      <span role="img" aria-label="avatar">{emoji}</span>
    </div>
  );
}

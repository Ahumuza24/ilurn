export function assessmentLabel(type: string): string {
  if (type === 'word-reading') return 'Word Reading';
  if (type === 'spelling-bee') return 'Spelling Bee';
  if (type === 'spelling') return 'Spelling Test';
  return type;
}

/** Solid (no-gradient) color classes for a score band badge. */
export function bandClass(band: string): string {
  if (band === 'Proficient') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (band === 'Developing') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (band === 'Emerging') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

/** Solid accent color per assessment type. */
export function typeColor(type: string): { bar: string; text: string } {
  if (type === 'word-reading') return { bar: 'bg-sky-500', text: 'text-sky-600' };
  if (type === 'spelling') return { bar: 'bg-violet-500', text: 'text-violet-600' };
  if (type === 'spelling-bee') return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-slate-400', text: 'text-slate-600' };
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString();
}

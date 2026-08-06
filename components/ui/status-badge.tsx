type StatusTone = "positive" | "warning" | "danger" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  positive: "bg-[#e7f2ec] text-[#256148]",
  warning: "bg-[#f6eddd] text-[#815d22]",
  danger: "bg-[#f7e7e5] text-[#983d38]",
  neutral: "bg-[#edf0ee] text-[#59645f]",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

interface BadgeProps {
  status: string;
  label?: string;
}

export function Badge({ status, label }: BadgeProps) {
  const text = label ?? status;
  return <span className={`badge ${status.toLowerCase()}`}>{text}</span>;
}

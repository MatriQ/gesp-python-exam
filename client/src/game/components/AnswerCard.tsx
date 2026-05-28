interface AnswerCardProps {
  label: string;       // 'A', 'B', 'C', 'D' or '✅', '❌'
  text: string;
  selected: boolean;
  correct: boolean | null;  // null = not yet revealed
  disabled: boolean;
  onClick: () => void;
}

export function AnswerCard({ label, text, selected, correct, disabled, onClick }: AnswerCardProps) {
  let bg = 'white';
  let border = '2px solid #e0e0e0';
  if (correct === true && selected) { bg = '#dcfce7'; border = '2px solid #22c55e'; }
  else if (correct === false && selected) { bg = '#fef2f2'; border = '2px solid #ef4444'; }
  else if (correct === true && !selected) { bg = '#dcfce7'; border = '2px solid #22c55e'; }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={correct === false && selected ? 'animate-shake' : correct === true && selected ? 'animate-bounceIn' : ''}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 16px',
        borderRadius: 12, background: bg, border,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left', fontSize: 15,
        opacity: disabled && !selected && correct !== true ? 0.6 : 1,
      }}
    >
      <span style={{
        width: 32, height: 32, borderRadius: '50%',
        background: selected ? '#FF6B6B' : '#f0f0f0',
        color: selected ? 'white' : '#666',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 14, flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{ flex: 1 }}>{text}</span>
      {correct === true && selected && <span>✅</span>}
      {correct === false && selected && <span>❌</span>}
    </button>
  );
}

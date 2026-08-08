import {
  formatFillBlanksAnswersText,
  parseFillBlanksAnswersText,
} from './practiceQuestionTypes';

/**
 * Ô đáp án điền chỗ trống — controlled bằng chuỗi thô blanksText (giống ô đoạn văn).
 * Không format lại từ blanks khi đang gõ → Enter / dấu cách không bị mất.
 */
export function FillBlanksAnswersField({
  blanks,
  blanksText,
  disabled = false,
  onBlanksChange,
  className =
    'w-full p-2 border-2 border-slate-300 rounded text-sm min-h-[216px] disabled:opacity-50 resize-y whitespace-pre-wrap leading-relaxed focus:border-indigo-500 font-mono text-[13px]',
  placeholder = 'Đáp án từng chỗ trống — mỗi dòng một chỗ:\n1=(0; 0)\n2=x=0',
  'data-admin-snippet': dataAdminSnippet,
}) {
  const value = typeof blanksText === 'string' ? blanksText : formatFillBlanksAnswersText(blanks);

  return (
    <textarea
      rows={8}
      data-admin-snippet={dataAdminSnippet}
      disabled={disabled}
      value={value}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      onChange={(e) => {
        const raw = e.target.value;
        const { blanks: parsed } = parseFillBlanksAnswersText(raw);
        onBlanksChange?.(parsed, raw);
      }}
      onKeyDown={(e) => {
        // Ngăn listener cha nuốt Enter (không preventDefault — để textarea xuống dòng bình thường).
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
          e.stopPropagation();
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

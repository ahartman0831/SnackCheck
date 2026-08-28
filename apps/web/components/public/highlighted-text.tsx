export function HighlightedText({
  text,
  start,
  end,
}: {
  text: string;
  start: number | null;
  end: number | null;
}) {
  if (start == null || end == null || start < 0 || end <= start || end > text.length) {
    return <span>{text}</span>;
  }
  return (
    <span>
      {text.slice(0, start)}
      <mark className="bg-verify-surface text-verify rounded-sm px-0.5">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </span>
  );
}

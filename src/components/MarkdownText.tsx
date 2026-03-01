import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

/**
 * Renders markdown content with proper formatting.
 * Handles bold, italic, lists, and ensures Gherkin Given/When/Then
 * keywords appear on separate lines.
 */
export function MarkdownText({ content, className }: { content: string; className?: string }) {
  // Ensure Gherkin keywords start on new lines
  const processed = content
    .replace(/(?<!\n)(Given\s)/g, '\n$1')
    .replace(/(?<!\n)(When\s)/g, '\n$1')
    .replace(/(?<!\n)(Then\s)/g, '\n$1')
    .replace(/(?<!\n)(And\s)/g, '\n$1')
    .replace(/(?<!\n)(But\s)/g, '\n$1')
    .replace(/^\n/, ''); // trim leading newline from first keyword

  return (
    <div className={cn('prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}>
      <ReactMarkdown
        components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="text-inherit">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>
        ),
      }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

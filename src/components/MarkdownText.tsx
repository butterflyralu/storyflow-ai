import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

/**
 * Renders markdown content with proper formatting.
 * Handles bold, italic, lists, and ensures Gherkin Given/When/Then
 * keywords appear on separate lines.
 */
export function MarkdownText({ content, className }: { content: string; className?: string }) {
  // Replace literal \n with actual newlines first
  let processed = content.replace(/\\n/g, '\n');

  // Ensure Gherkin keywords start on new lines (use double newline for markdown paragraph break)
  processed = processed
    .replace(/(?<!\n)\s*(Given\s)/g, '\n\n$1')
    .replace(/(?<!\n)\s*(When\s)/g, '\n\n$1')
    .replace(/(?<!\n)\s*(Then\s)/g, '\n\n$1')
    .replace(/(?<!\n)\s*(And\s)/g, '\n\n$1')
    .replace(/(?<!\n)\s*(But\s)/g, '\n\n$1')
    .replace(/^\n+/, ''); // trim leading newlines from first keyword

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

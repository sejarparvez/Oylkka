/**
 * CONTENT-11: small renderer for CMS `ContentBlock.content`. It intentionally
 * supports only the subset of markdown the admin editor documents:
 *
 *   `## Heading`, `### Subheading`, `- list item`, `**bold line**`,
 *   blank lines, and plain paragraphs.
 *
 * Beyond that the text is rendered verbatim — never parsed as HTML — so a
 * content block can never inject markup into a public page.
 */
export function RichText({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <>
      {lines.map((line, i) => {
        // Index is part of the key because duplicate lines are legal content.
        const key = `rt-${i}-${line.slice(0, 24)}`;

        if (line.startsWith('## ')) {
          return (
            <h2
              key={key}
              className='text-2xl md:text-3xl font-bold leading-tight tracking-tight mb-6'
            >
              {line.slice(3)}
              <span className='text-primary'>.</span>
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={key} className='text-lg font-semibold mt-6 mb-3'>
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={key} className='font-semibold text-foreground'>
              {line.slice(2, -2)}
            </p>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <li
              key={key}
              className='flex items-start gap-3 text-sm leading-relaxed text-muted-foreground'
            >
              <span className='w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5' />
              {line.slice(2)}
            </li>
          );
        }
        if (!line.trim()) return <div key={key} className='h-3' />;
        return (
          <p
            key={key}
            className='text-sm leading-relaxed text-muted-foreground'
          >
            {line}
          </p>
        );
      })}
    </>
  );
}

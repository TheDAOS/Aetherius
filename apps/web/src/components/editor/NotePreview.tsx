import React from 'react';

interface NotePreviewProps {
  content: string;
}

export const NotePreview: React.FC<NotePreviewProps> = ({ content }) => {
  // Simple, robust zero-dependency Markdown renderer for MVP
  const renderMarkdown = (markdown: string) => {
    if (!markdown) {
      return (
        <div className="text-ink-muted italic font-mono text-xs">
          No content to preview.
        </div>
      );
    }

    const lines = markdown.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    lines.forEach((line, index) => {
      // Code block detection
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${index}`}
              className="neo-box p-4 bg-cream-shell text-ink-primary font-mono text-xs overflow-x-auto my-3"
            >
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="font-display font-extrabold text-2xl md:text-3xl text-ink-primary border-b-2 border-ink-primary pb-2 my-4">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="font-display font-bold text-xl md:text-2xl text-ink-primary mt-6 mb-3">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="font-display font-bold text-base md:text-lg text-ink-primary mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={index}
            className="neo-box-sm border-l-4 border-l-accent-orange bg-cream-shell p-3 my-3 text-sm text-ink-secondary italic font-serif"
          >
            {line.slice(2)}
          </blockquote>
        );
      } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
        const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
        const text = line.slice(6);
        elements.push(
          <div key={index} className="flex items-center gap-2.5 my-1 text-sm font-sans">
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              className="w-4 h-4 accent-accent-orange rounded-none cursor-default"
            />
            <span className={isChecked ? 'line-through text-ink-muted' : 'text-ink-primary'}>
              {text}
            </span>
          </div>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-5 list-disc text-sm text-ink-primary my-1 leading-relaxed">
            {line.slice(2)}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={index} className="h-3" />);
      } else {
        // Format bold/italic/code in regular paragraphs
        const formatted = line.replace(/`([^`]+)`/g, '<code class="neo-box-sm px-1.5 py-0.5 bg-cream-muted font-mono text-xs">$1</code>')
                              .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-ink-primary">$1</strong>');

        elements.push(
          <p
            key={index}
            className="text-sm font-sans text-ink-secondary leading-relaxed my-2"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      }
    });

    return elements;
  };

  return (
    <div className="flex-1 h-full p-6 md:p-10 bg-paper-canvas overflow-y-auto max-w-4xl mx-auto w-full">
      <div className="prose prose-neutral max-w-none">
        {renderMarkdown(content)}
      </div>
    </div>
  );
};

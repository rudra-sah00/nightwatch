import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from '../components/MermaidDiagram';

export async function generateStaticParams() {
  const docsDir = path.join(process.cwd(), 'docs');
  const slugs: { slug: string[] }[] = [];

  function walk(dir: string, prefix: string[] = []) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        walk(full, [...prefix, file]);
      } else if (file.endsWith('.md') && file !== 'SUMMARY.md') {
        const name = file.replace(/\.md$/, '');
        slugs.push({ slug: [...prefix, name] });
      }
    }
  }

  // Add the index (/) which maps to SETUP.md for us
  slugs.push({ slug: [] });
  walk(docsDir);

  return slugs;
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const resolvedParams = await params;
  const slugArray = resolvedParams.slug || [];

  let filepath = '';
  if (slugArray.length === 0) {
    filepath = path.join(process.cwd(), 'docs', 'SETUP.md');
  } else {
    filepath = `${path.join(process.cwd(), 'docs', ...slugArray)}.md`;
  }

  if (!fs.existsSync(filepath)) {
    notFound();
  }

  const content = fs.readFileSync(filepath, 'utf8');

  return (
    <article className="prose prose-zinc prose-invert prose-a:text-amber-500 hover:prose-a:text-amber-400 prose-headings:font-bold prose-headings:tracking-tight prose-pre:border prose-pre:border-white/10 prose-pre:bg-white/5 prose-img:border prose-img:border-white/10 prose-img:rounded-xl max-w-none bg-black text-zinc-300 p-8 md:p-12 border border-white/10 rounded-2xl mb-12 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // biome-ignore lint/suspicious/noExplicitAny: ReactMarkdown passes complex AST nodes that don't need strict typing here
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            if (match && match[1] === 'mermaid') {
              return <MermaidDiagram chart={String(children).trim()} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a: ({ node, ...props }) => {
            let targetRef = props.href;
            if (targetRef && !targetRef.startsWith('http')) {
              // Convert link to .md over to dynamic route link
              // features/WATCH.md -> /features/WATCH
              targetRef = `/${targetRef.replace('.md', '')}`;
              return <a href={targetRef}>{props.children}</a>;
            }
            return <a target="_blank" rel="noopener noreferrer" {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

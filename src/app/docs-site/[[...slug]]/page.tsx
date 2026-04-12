import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

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
    <article className="prose prose-zinc prose-a:text-amber-600 prose-a:font-bold prose-a:decoration-4 prose-a:underline-offset-4 hover:prose-a:text-black prose-headings:font-black prose-headings:uppercase prose-pre:border-4 prose-pre:border-black prose-pre:shadow-[4px_4px_0px_#1a1a1a] prose-pre:bg-zinc-900 prose-img:border-4 prose-img:border-black prose-img:shadow-[4px_4px_0px_#1a1a1a] max-w-none bg-white p-8 md:p-12 border-4 border-black shadow-[8px_8px_0px_#1a1a1a] mb-12 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ node, ...props }) => {
            let targetRef = props.href;
            if (targetRef && !targetRef.startsWith('http')) {
              // Convert link to .md over to dynamic route link
              // features/WATCH.md -> /features/WATCH
              targetRef = `/${targetRef.replace('.md', '')}`;
              return <Link href={targetRef}>{props.children}</Link>;
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

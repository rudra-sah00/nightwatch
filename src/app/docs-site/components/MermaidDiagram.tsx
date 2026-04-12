'use client';

import mermaid from 'mermaid';
import { useEffect, useState } from 'react';

export function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      fontFamily: 'inherit',
    });

    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);

        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        console.error('Mermaid rendering failed', err);
        if (isMounted) setError(true);
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-medium text-red-500">
        Failed to render diagram.
        <pre className="mt-4 text-left text-xs bg-black/50 p-4 overflow-x-auto rounded-lg font-mono">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-8 flex h-48 w-full animate-pulse items-center justify-center rounded-xl border border-white/5 bg-white/5 text-sm text-zinc-500">
        Loading Diagram...
      </div>
    );
  }

  return (
    <div
      className="my-8 flex w-full justify-center overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-6"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: We need to inject the SVG string returned by the trusted mermaid compiler directly
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

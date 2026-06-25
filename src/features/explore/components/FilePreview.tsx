'use client';

import { FileText, Presentation } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// Lazy-load react-pdf only when a PDF is rendered
const PdfViewer = dynamic(
  () =>
    import('react-pdf').then((mod) => {
      const { pdfjs } = mod;
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      return {
        default: ({
          url,
          onLoad,
          page,
        }: {
          url: string;
          onLoad: (n: number) => void;
          page: number;
        }) => (
          <mod.Document
            file={url}
            onLoadSuccess={({ numPages }) => onLoad(numPages)}
            loading={
              <div className="h-40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <mod.Page pageNumber={page} width={260} />
          </mod.Document>
        ),
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

interface FilePreviewProps {
  url: string;
  className?: string;
}

function getFileType(url: string): 'pdf' | 'docx' | 'pptx' | 'unknown' {
  const lower = url.toLowerCase();
  if (lower.includes('.pdf')) return 'pdf';
  if (lower.includes('.doc')) return 'docx';
  if (lower.includes('.ppt')) return 'pptx';
  return 'unknown';
}

/** Inline document viewer for DM messages */
export function FilePreview({ url, className }: FilePreviewProps) {
  const type = getFileType(url);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  if (type === 'pdf') {
    return (
      <div
        className={`rounded-xl overflow-hidden border border-border bg-card ${className || ''}`}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium">PDF</span>
          </div>
          {numPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-1.5 text-xs disabled:opacity-30"
              >
                ←
              </button>
              <span className="text-[10px] text-foreground/50">
                {currentPage}/{numPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="px-1.5 text-xs disabled:opacity-30"
              >
                →
              </button>
            </div>
          )}
        </div>
        <div className="overflow-auto max-h-80">
          <PdfViewer
            url={url}
            onLoad={(n) => setNumPages(n)}
            page={currentPage}
          />
        </div>
      </div>
    );
  }

  if (type === 'docx' || type === 'pptx') {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    const Icon = type === 'pptx' ? Presentation : FileText;
    const label = type === 'pptx' ? 'Presentation' : 'Document';
    const color = type === 'pptx' ? 'text-orange-500' : 'text-blue-500';

    return (
      <div
        className={`rounded-xl overflow-hidden border border-border bg-card ${className || ''}`}
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <iframe
          src={viewerUrl}
          className="w-full h-80"
          title={`${label} viewer`}
        />
      </div>
    );
  }

  return null;
}

/** Check if a URL is a viewable document */
export function isDocumentUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('.pdf') || lower.includes('.doc') || lower.includes('.ppt')
  );
}

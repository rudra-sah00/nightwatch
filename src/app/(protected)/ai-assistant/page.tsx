'use client';

import { AiAssistantChat } from '@/features/ai-assistant/components/AiAssistantChat';
import { ContentDetailModal } from '@/features/search/components/content-detail-modal';
import { useAiAssistantPage } from './use-ai-assistant-page';

export default function AiAssistantPage() {
  const { selectedContent, setSelectedContent } = useAiAssistantPage();

  return (
    <div className="h-[calc(100vh-80px)] bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col w-full relative z-10 min-h-0">
        <div className="flex-1 min-h-0 flex flex-col">
          <AiAssistantChat
            isOpen={true}
            onClose={() => {}}
            onSelectContent={(id, context, autoPlay) =>
              setSelectedContent({ id, context, autoPlay })
            }
            className="relative inset-0 w-full h-full md:w-full md:h-full md:max-h-none translate-x-0 translate-y-0 rounded-none border-none shadow-none bg-transparent flex-1"
          />
        </div>
      </div>

      {selectedContent ? (
        <ContentDetailModal
          contentId={selectedContent.id}
          initialContext={selectedContent.context}
          autoPlay={selectedContent.autoPlay}
          onClose={() => setSelectedContent(null)}
        />
      ) : null}
    </div>
  );
}

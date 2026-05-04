/** Minimal type declarations for the Google Cast SDK (chrome.cast + cast.framework). */

declare namespace chrome.cast {
  enum SessionStatus {
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    STOPPED = 'stopped',
  }

  enum AutoJoinPolicy {
    TAB_AND_ORIGIN_SCOPED = 'tab_and_origin_scoped',
    ORIGIN_SCOPED = 'origin_scoped',
    PAGE_SCOPED = 'page_scoped',
  }

  class SessionRequest {
    constructor(applicationId: string);
    applicationId: string;
  }

  class ApiConfig {
    constructor(
      sessionRequest: SessionRequest,
      sessionListener: (session: Session) => void,
      receiverListener: (availability: string) => void,
      autoJoinPolicy?: AutoJoinPolicy,
    );
  }

  class Session {
    sessionId: string;
    status: SessionStatus;
    receiver: { friendlyName: string };
    loadMedia(
      loadRequest: chrome.cast.media.LoadRequest,
      onSuccess: () => void,
      onError: (error: chrome.cast.Error) => void,
    ): void;
  }

  class CastError {
    code: string;
    description: string;
  }

  function initialize(
    config: ApiConfig,
    onSuccess: () => void,
    onError: (error: CastError) => void,
  ): void;

  namespace media {
    class MediaInfo {
      constructor(contentId: string, contentType: string);
      contentId: string;
      contentType: string;
      streamType: string;
      metadata: GenericMediaMetadata | null;
    }

    class GenericMediaMetadata {
      title: string;
      images: Array<{ url: string }>;
    }

    class LoadRequest {
      constructor(mediaInfo: MediaInfo);
      autoplay: boolean;
      currentTime: number;
    }

    const StreamType: { BUFFERED: string; LIVE: string };
  }
}

declare namespace cast {
  namespace framework {
    class CastContext {
      static getInstance(): CastContext;
      setOptions(options: CastOptions): void;
      getCurrentSession(): CastSession | null;
      requestSession(): Promise<void>;
      endCurrentSession(stopCasting: boolean): void;
      addEventListener(
        type: string,
        handler: (event: CastStateEvent) => void,
      ): void;
      removeEventListener(
        type: string,
        handler: (event: CastStateEvent) => void,
      ): void;
      getCastState(): string;
    }

    class CastSession {
      getSessionObj(): chrome.cast.Session;
      loadMedia(
        request: chrome.cast.media.LoadRequest,
      ): Promise<string | undefined>;
      endSession(stopCasting: boolean): void;
    }

    interface CastOptions {
      receiverApplicationId: string;
      autoJoinPolicy: chrome.cast.AutoJoinPolicy;
    }

    interface CastStateEvent {
      castState: string;
    }

    enum CastState {
      NO_DEVICES_AVAILABLE = 'NO_DEVICES_AVAILABLE',
      NOT_CONNECTED = 'NOT_CONNECTED',
      CONNECTING = 'CONNECTING',
      CONNECTED = 'CONNECTED',
    }

    enum CastContextEventType {
      CAST_STATE_CHANGED = 'caststatechanged',
    }
  }
}

interface Window {
  __onGCastApiAvailable?: (isAvailable: boolean) => void;
  chrome?: { cast?: typeof chrome.cast };
  cast?: typeof cast;
}

interface SpeechRecognitionResultLike {
  readonly transcript: string;
}

interface SpeechRecognitionResultsLike {
  readonly 0?: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  readonly results: {
    readonly 0?: SpeechRecognitionResultsLike;
  };
}

interface SpeechRecognitionErrorLike {
  readonly error?: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function createSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}

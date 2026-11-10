import { http, HttpResponse } from 'msw';
import mockPassages from './mock-data/passages.json';

export interface PassageRequestGate {
  waiting: boolean;
  release: () => void;
  released: Promise<void>;
}

interface RecoveryHandlers {
  apiHost: string;
  handlers: ReturnType<typeof http.get>[];
}

interface BibleReaderRecovery extends RecoveryHandlers {
  armRequestGate: () => PassageRequestGate;
}

interface VotdRecovery extends RecoveryHandlers {
  getRequestGate: () => PassageRequestGate;
  resetRequestGate: (abortSignal: AbortSignal) => PassageRequestGate;
}

function createPassageRequestGate(onRelease?: () => void): PassageRequestGate {
  let resolveRelease: (() => void) | undefined;
  let didRelease = false;
  const released = new Promise<void>((resolve) => {
    resolveRelease = resolve;
  });

  return {
    waiting: false,
    release: () => {
      if (didRelease) return;
      didRelease = true;
      onRelease?.();
      resolveRelease?.();
    },
    released,
  };
}

export function createBibleCardRecovery(): RecoveryHandlers {
  const apiHost = 'bible-card-recovery.invalid';
  return {
    apiHost,
    handlers: [
      http.get(`https://${apiHost}/v1/bibles/111/passages/LUK.1.39-45`, () => {
        return new HttpResponse(null, { status: 500 });
      }),
    ],
  };
}

export function createBibleReaderRecovery(): BibleReaderRecovery {
  const apiHost = 'bible-reader-recovery.invalid';
  let requestGate = createPassageRequestGate();
  let shouldHoldRequest = false;

  return {
    apiHost,
    handlers: [
      http.get(`https://${apiHost}/v1/bibles/111/passages/:usfm`, async ({ params }) => {
        const usfm = String(params.usfm);
        if (usfm === 'JHN.2' && shouldHoldRequest) {
          shouldHoldRequest = false;
          const activeGate = requestGate;
          activeGate.waiting = true;
          await activeGate.released;
        }
        return HttpResponse.json({
          id: usfm,
          content: `<div class="p"><span class="verse">Passage text for ${usfm}.</span></div>`,
          reference: usfm,
        });
      }),
    ],
    armRequestGate: (): PassageRequestGate => {
      requestGate.release();
      requestGate = createPassageRequestGate(() => {
        shouldHoldRequest = false;
      });
      shouldHoldRequest = true;
      return requestGate;
    },
  };
}

export function createVotdRecovery(): VotdRecovery {
  const apiHost = 'votd-recovery.invalid';
  let requestGate = createPassageRequestGate();
  let requestSignal: AbortSignal | undefined;
  let shouldFailRequest = true;

  return {
    apiHost,
    handlers: [
      http.get(`https://${apiHost}/v1/bibles/111/passages/ISA.43.19`, async () => {
        if (shouldFailRequest) {
          shouldFailRequest = false;
          return HttpResponse.error();
        }
        const activeGate = requestGate;
        activeGate.waiting = true;
        await activeGate.released;
        return HttpResponse.json(mockPassages['ISA.43.19']);
      }),
    ],
    resetRequestGate: (abortSignal: AbortSignal): PassageRequestGate => {
      // Storybook can invoke loaders more than once during one story load. Its
      // abort signal is stable for that load and changes for the next one, so
      // only a new signal resets this module-scoped recovery fixture.
      if (requestSignal === abortSignal) return requestGate;
      requestSignal = abortSignal;
      requestGate.release();
      requestGate = createPassageRequestGate();
      shouldFailRequest = true;
      return requestGate;
    },
    getRequestGate: (): PassageRequestGate => requestGate,
  };
}

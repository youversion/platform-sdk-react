import { http, HttpResponse } from 'msw';
import mockPassages from './mock-data/passages.json';

export const BIBLE_CARD_RECOVERY_API_HOST = 'bible-card-recovery.invalid';
export const BIBLE_READER_RECOVERY_API_HOST = 'bible-reader-recovery.invalid';
export const VOTD_RECOVERY_API_HOST = 'votd-recovery.invalid';

export interface PassageRequestGate {
  waiting: boolean;
  release: () => void;
  released: Promise<void>;
}

function createPassageRequestGate(): PassageRequestGate {
  let resolveRelease: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    resolveRelease = resolve;
  });
  return { waiting: false, release: () => resolveRelease?.(), released };
}

let readerRequestGate = createPassageRequestGate();
let shouldHoldReaderRequest = false;

export function armReaderRequestGate(): PassageRequestGate {
  readerRequestGate.release();
  readerRequestGate = createPassageRequestGate();
  shouldHoldReaderRequest = true;
  return readerRequestGate;
}

let votdRequestGate = createPassageRequestGate();
let votdRequestSignal: AbortSignal | undefined;
let shouldFailVotdRequest = true;

export function resetVotdRequestGate(abortSignal: AbortSignal): PassageRequestGate {
  if (votdRequestSignal === abortSignal) return votdRequestGate;
  votdRequestSignal = abortSignal;
  votdRequestGate.release();
  votdRequestGate = createPassageRequestGate();
  shouldFailVotdRequest = true;
  return votdRequestGate;
}

export function getVotdRequestGate(): PassageRequestGate {
  return votdRequestGate;
}

export const shadowRecoveryHandlers = [
  http.get(`https://${BIBLE_CARD_RECOVERY_API_HOST}/v1/bibles/111/passages/LUK.1.39-45`, () => {
    return new HttpResponse(null, { status: 500 });
  }),
  http.get(`https://${VOTD_RECOVERY_API_HOST}/v1/bibles/111/passages/ISA.43.19`, async () => {
    if (shouldFailVotdRequest) {
      shouldFailVotdRequest = false;
      return HttpResponse.error();
    }
    const requestGate = votdRequestGate;
    requestGate.waiting = true;
    await requestGate.released;
    return HttpResponse.json(mockPassages['ISA.43.19']);
  }),
  http.get(
    `https://${BIBLE_READER_RECOVERY_API_HOST}/v1/bibles/111/passages/:usfm`,
    async ({ params }) => {
      const usfm = String(params.usfm);
      if (usfm === 'JHN.2' && shouldHoldReaderRequest) {
        shouldHoldReaderRequest = false;
        const requestGate = readerRequestGate;
        requestGate.waiting = true;
        await requestGate.released;
      }
      return HttpResponse.json({
        id: usfm,
        content: `<div class="p"><span class="verse">Passage text for ${usfm}.</span></div>`,
        reference: usfm,
      });
    },
  ),
];

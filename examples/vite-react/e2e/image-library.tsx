import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { YouVersionProvider } from '@youversion/platform-react-ui';
import { ImagesPage } from '../src/pages/ImagesPage';
import '../src/index.css';

function ImageLibraryHarness() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [reference, setReference] = useState('');
  const [imageId, setImageId] = useState<string | null>(null);
  const restrict = new URLSearchParams(location.search).has('restrict');
  return (
    <YouVersionProvider
      appKey="browser-test"
      apiHost="api.youversion.test"
      excludedVersionIds={restrict ? [3034] : undefined}
    >
      <div ref={scrollContainerRef} className="h-dvh overflow-auto">
        <ImagesPage
          scrollContainerRef={scrollContainerRef}
          imageId={imageId}
          onSelectImage={setImageId}
          onReadInBible={(passageId, versionId) => setReference(`${versionId}:${passageId}`)}
        />
        <output aria-label="Requested Bible passage">{reference}</output>
      </div>
    </YouVersionProvider>
  );
}

createRoot(document.getElementById('root')!).render(<ImageLibraryHarness />);

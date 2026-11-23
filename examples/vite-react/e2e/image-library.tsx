import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { YouVersionProvider } from '@youversion/platform-react-ui';
import { ImagesPage } from '../src/pages/ImagesPage';
import '../src/index.css';

function ImageLibraryHarness() {
  const [reference, setReference] = useState('');
  const restrict = new URLSearchParams(location.search).has('restrict');
  return (
    <YouVersionProvider
      appKey="browser-test"
      apiHost="api.youversion.test"
      excludedVersionIds={restrict ? [3034] : undefined}
    >
      <ImagesPage
        onReadInBible={(passageId, versionId) => setReference(`${versionId}:${passageId}`)}
      />
      <output aria-label="Requested Bible passage">{reference}</output>
    </YouVersionProvider>
  );
}

createRoot(document.getElementById('root')!).render(<ImageLibraryHarness />);

'use client';

import { type JSX, useState } from 'react';
import {
  SignInButton,
  SignInWithYouVersionPermission,
  useAuthentication,
  VerseOfTheDay,
  BibleTextView,
  BibleChapterPicker,
} from '@youversion/platform-react-ui';

function VotdTester() {
  const [showBibleAppAttribution, setShowBibleAppAttribution] = useState(true);
  const [showShareButton, setShowShareButton] = useState(false);
  const [showSunIcon, setShowSunIcon] = useState(true);
  const [size, setSize] = useState<'default' | 'lg'>('default');
  const [dayOfYear, setDayOfYear] = useState(1);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showBibleAppAttribution}
            onChange={(e) => setShowBibleAppAttribution(e.target.checked)}
          />
          Show Bible App Attribution
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showShareButton}
            onChange={(e) => setShowShareButton(e.target.checked)}
          />
          Show Share Button
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSunIcon}
            onChange={(e) => setShowSunIcon(e.target.checked)}
          />
          Show Sun Icon
        </label>
        <label className="flex items-center gap-2">
          Size:
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as 'default' | 'lg')}
            className="ml-2 px-2 py-1 border border-gray-300 rounded"
          >
            <option value="default">Default</option>
            <option value="lg">Large</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Day of Year:
          <input
            type="number"
            min="1"
            max="366"
            value={dayOfYear}
            onChange={(e) => setDayOfYear(Number(e.target.value))}
            className="ml-2 px-2 py-1 border border-gray-300 rounded"
          />
        </label>
      </div>
      <VerseOfTheDay
        size={size}
        showBibleAppAttribution={showBibleAppAttribution}
        showShareButton={showShareButton}
        showSunIcon={showSunIcon}
        dayOfYear={dayOfYear}
        versionId={111}
      />
    </div>
  );
}

export default function UnauthenticatedView(): JSX.Element {
  const [versionId, _setVersionId] = useState(206);
  const [book, setBook] = useState('GEN');
  const [chapter, setChapter] = useState('1');
  const { auth } = useAuthentication();

  const handleSuccess = () => {
    // Authentication success is handled by the hook
  };

  const handleError = (error: Error) => {
    console.error('Authentication error:', error);
  };

  return (
    <div className="space-y-4 w-full">
      {auth.error && <p className="text-red-600 text-sm">Error: {auth.error.message}</p>}
      <h3 className="text-lg">Verse of the Day</h3>
      <VotdTester />
      <h3 className="text-lg">Verse</h3>
      <p>JHN.3.16-17</p>
      <BibleTextView fontSize={16} reference="JHN.3.16-17" versionId={206} />
      <p>PRO.31.29</p>
      <BibleTextView fontSize={16} reference="PRO.31.29" versionId={206} />
      <h3 className="text-lg">Sign in with YouVersion Button</h3>
      <div className="flex flex-wrap gap-4">
        <section className="bg-[rgba(238,238,238,1)] p-4 flex items-center gap-4 w-full">
          <SignInButton
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            size="short"
            variant="default"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            size="short"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            size="icon"
            variant="default"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            size="icon"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
        </section>
        <section className="bg-[#333333] p-4 flex items-center gap-4 w-full">
          <SignInButton
            background="dark"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            background="dark"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            background="dark"
            size="short"
            variant="default"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            background="dark"
            size="short"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            background="dark"
            size="icon"
            variant="default"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            background="dark"
            size="icon"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
        </section>
        <section className="bg-[rgba(238,238,238,1)] p-4 flex items-center gap-4 w-full">
          <SignInButton
            radius="rectangular"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            size="short"
            variant="default"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            size="short"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            size="icon"
            variant="default"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            size="icon"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
        </section>
        <section className="bg-[#333333] p-4 flex items-center gap-4 w-full">
          <SignInButton
            radius="rectangular"
            background="dark"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            background="dark"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            background="dark"
            size="short"
            variant="default"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            background="dark"
            size="short"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            background="dark"
            size="icon"
            variant="default"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
          <SignInButton
            radius="rectangular"
            background="dark"
            size="icon"
            variant="outline"
            requiredPermissions={[SignInWithYouVersionPermission.bibles]}
            optionalPermissions={[SignInWithYouVersionPermission.highlights]}
            onSuccess={handleSuccess}
            onAuthError={handleError}
          />
        </section>
      </div>
      <BibleChapterPicker.Root
        book={book}
        onBookChange={setBook}
        versionId={versionId}
        chapter={chapter}
        onChapterChange={setChapter}
      >
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>
    </div>
  );
}

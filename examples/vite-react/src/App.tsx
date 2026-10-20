import { useState } from 'react';
import { Navbar } from '@/components/navbar';
import { BibleReaderPage } from '@/pages/BibleReaderPage';
import { VotdPage } from '@/pages/VotdPage';
import { BibleCardPage } from '@/pages/BibleCardPage';

export type Page = 'bible-reader' | 'votd' | 'bible-card';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('bible-reader');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main>
        {currentPage === 'bible-reader' && <BibleReaderPage />}
        {currentPage === 'votd' && <VotdPage />}
        {currentPage === 'bible-card' && <BibleCardPage />}
      </main>
    </div>
  );
}

export default App;

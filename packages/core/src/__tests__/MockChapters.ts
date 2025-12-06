export const mockChapterGenesis1 = {
  id: '1',
  passage_id: 'GEN.1',
  title: '1',
  verses: [
    {
      id: '1',
      passage_id: 'GEN.1.1',
      title: '1',
    },
    {
      id: '2',
      passage_id: 'GEN.1.2',
      title: '2',
    },
    {
      id: '3',
      passage_id: 'GEN.1.3',
      title: '3',
    },
    {
      id: '4',
      passage_id: 'GEN.1.4',
      title: '4',
    },
    {
      id: '5',
      passage_id: 'GEN.1.5',
      title: '5',
    },
    {
      id: '6',
      passage_id: 'GEN.1.6',
      title: '6',
    },
    {
      id: '7',
      passage_id: 'GEN.1.7',
      title: '7',
    },
    {
      id: '8',
      passage_id: 'GEN.1.8',
      title: '8',
    },
    {
      id: '9',
      passage_id: 'GEN.1.9',
      title: '9',
    },
    {
      id: '10',
      passage_id: 'GEN.1.10',
      title: '10',
    },
    {
      id: '11',
      passage_id: 'GEN.1.11',
      title: '11',
    },
    {
      id: '12',
      passage_id: 'GEN.1.12',
      title: '12',
    },
    {
      id: '13',
      passage_id: 'GEN.1.13',
      title: '13',
    },
    {
      id: '14',
      passage_id: 'GEN.1.14',
      title: '14',
    },
    {
      id: '15',
      passage_id: 'GEN.1.15',
      title: '15',
    },
    {
      id: '16',
      passage_id: 'GEN.1.16',
      title: '16',
    },
    {
      id: '17',
      passage_id: 'GEN.1.17',
      title: '17',
    },
    {
      id: '18',
      passage_id: 'GEN.1.18',
      title: '18',
    },
    {
      id: '19',
      passage_id: 'GEN.1.19',
      title: '19',
    },
    {
      id: '20',
      passage_id: 'GEN.1.20',
      title: '20',
    },
    {
      id: '21',
      passage_id: 'GEN.1.21',
      title: '21',
    },
    {
      id: '22',
      passage_id: 'GEN.1.22',
      title: '22',
    },
    {
      id: '23',
      passage_id: 'GEN.1.23',
      title: '23',
    },
    {
      id: '24',
      passage_id: 'GEN.1.24',
      title: '24',
    },
    {
      id: '25',
      passage_id: 'GEN.1.25',
      title: '25',
    },
    {
      id: '26',
      passage_id: 'GEN.1.26',
      title: '26',
    },
    {
      id: '27',
      passage_id: 'GEN.1.27',
      title: '27',
    },
    {
      id: '28',
      passage_id: 'GEN.1.28',
      title: '28',
    },
    {
      id: '29',
      passage_id: 'GEN.1.29',
      title: '29',
    },
    {
      id: '30',
      passage_id: 'GEN.1.30',
      title: '30',
    },
    {
      id: '31',
      passage_id: 'GEN.1.31',
      title: '31',
    },
  ],
};

export const mockGenesisChapters = Array.from({ length: 50 }, (_, i) => {
  const chapterNumber = i + 1;
  return {
    id: chapterNumber.toString(),
    passage_id: `GEN.${chapterNumber}`,
    title: chapterNumber.toString(),
    verses: Array.from({ length: 31 }, (_, j) => {
      const verseNumber = j + 1;
      return {
        id: verseNumber.toString(),
        passage_id: `GEN.${chapterNumber}.${verseNumber}`,
        title: verseNumber.toString(),
      };
    }),
  };
});

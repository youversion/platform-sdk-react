import { http, HttpResponse } from 'msw';
import { mockBooks } from '../mock-data/books';
import { mockChapters } from '../mock-data/chapters';
import mockPassages from '../mock-data/passages.json';
import mockBibles from '../mock-data/bibles.json';
import mockLanguages from '../mock-data/languages.json';

export const globalHandlers = [
  // Specific Bible passages
  http.get('*/v1/bibles/111/passages/LUK.1.39-45', () => {
    return HttpResponse.json(mockPassages['LUK.1.39-45.NIV']);
  }),
  http.get('*/v1/bibles/1588/passages/LUK.1.39-45', () => {
    return HttpResponse.json(mockPassages['LUK.1.39-45.AMP']);
  }),
  http.get('*/v1/bibles/111/passages/ROM.1', () => {
    return HttpResponse.json(mockPassages['ROM.1']);
  }),

  http.get('*/v1/bibles/111/passages/GEN.1.1', () => {
    return HttpResponse.json(mockPassages['GEN.1.1']);
  }),

  http.get('*/v1/bibles/111/passages/GEN.1', () => {
    return HttpResponse.json(mockPassages['GEN.1']);
  }),

  // John passages for verse stories
  http.get('*/v1/bibles/111/passages/JHN.3.16', () => {
    return HttpResponse.json(mockPassages['JHN.3.16']);
  }),

  http.get('*/v1/bibles/111/passages/JHN.3.16-17', () => {
    return HttpResponse.json(mockPassages['JHN.3.16-17']);
  }),

  http.get('*/v1/bibles/111/passages/JHN.3', () => {
    return HttpResponse.json(mockPassages['JHN.3']);
  }),

  http.get('*/v1/bibles/111/passages/JHN.1', () => {
    return HttpResponse.json(mockPassages['JHN.1']);
  }),

  http.get('*/v1/bibles/111/passages/JHN.1.51', () => {
    return HttpResponse.json(mockPassages['JHN.1.51']);
  }),

  // Isaiah passage for verse of the day
  http.get('*/v1/bibles/111/passages/ISA.43.19', () => {
    return HttpResponse.json(mockPassages['ISA.43.19']);
  }),

  // Individual Bible version lookup - dynamically finds Bible from mock data
  http.get('*/v1/bibles/:id', ({ params }) => {
    const id = params.id as string;

    // Check individual mock data first
    if (mockBibles.individual[id as keyof typeof mockBibles.individual]) {
      return HttpResponse.json(mockBibles.individual[id as keyof typeof mockBibles.individual]);
    }

    // Fall back to collections data
    const bible = mockBibles.collections.default.data.find((b) => b.id === Number(id));
    if (bible) {
      return HttpResponse.json(bible);
    }

    return new HttpResponse(null, { status: 404 });
  }),

  // Languages - extended data for version picker
  http.get('*/v1/languages', () => {
    return HttpResponse.json(mockLanguages);
  }),

  // Individual language lookup
  http.get('*/v1/languages/en', () => {
    return HttpResponse.json({
      id: 'en',
      language: 'en',
      display_names: { en: 'English' },
    });
  }),

  http.get('*/v1/languages/ko', () => {
    return HttpResponse.json({
      id: 'ko',
      language: 'ko',
      display_names: { en: 'Korean', ko: '한국어' },
    });
  }),

  // Bibles list - extended data for version picker
  http.get('*/v1/bibles', () => {
    return HttpResponse.json(mockBibles.collections.default);
  }),

  // Books for various bible versions
  http.get('*/v1/bibles/111/books', () => {
    return HttpResponse.json(mockBooks);
  }),

  http.get('*/v1/bibles/1/books', () => {
    return HttpResponse.json(mockBooks);
  }),

  // Chapters for all books using mock data
  http.get('*/v1/bibles/111/books/GEN/chapters', () => {
    return HttpResponse.json(mockChapters);
  }),

  http.get('*/v1/bibles/1/books/GEN/chapters', () => {
    return HttpResponse.json(mockChapters);
  }),

  http.get('*/v1/bibles/111/books/MAT/chapters', () => {
    return HttpResponse.json(mockChapters);
  }),

  http.get('*/v1/bibles/1/books/MAT/chapters', () => {
    return HttpResponse.json(mockChapters);
  }),

  // Verses for Genesis 1
  http.get('*/v1/bibles/111/chapters/GEN.1/verses', () => {
    const verses = Array.from({ length: 31 }, (_, i) => ({
      id: `GEN.1.${i + 1}`,
      number: i + 1,
      reference: `Genesis 1:${i + 1}`,
      content: `This is Genesis 1:${i + 1} content.`,
    }));

    return HttpResponse.json({
      data: verses,
      total_size: verses.length,
    });
  }),

  // Verse of the day by day number
  http.get('*/v1/verse_of_the_days/*', () => {
    return HttpResponse.json({
      day: 1,
      passage_id: 'ISA.43.19',
    });
  }),
];

export default globalHandlers;

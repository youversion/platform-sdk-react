export const mockBooks = {
  data: [
    {
      id: 'GEN',
      title: 'Genesis',
      full_title: 'The First Book of Moses, Commonly Called Genesis',
      abbreviation: 'Gen',
      canon: 'ot',
      chapters: Array.from({ length: 50 }, (_, i) => {
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
      }),
    },
    {
      id: 'EXO',
      title: 'Exodus',
      full_title: 'The Second Book of Moses, Commonly Called Exodus',
      abbreviation: 'Exod',
      canon: 'ot',
      chapters: Array.from({ length: 40 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `EXO.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `EXO.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'LEV',
      title: 'Leviticus',
      full_title: 'The Third Book of Moses, Commonly Called Leviticus',
      abbreviation: 'Lev',
      canon: 'ot',
      chapters: Array.from({ length: 27 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `LEV.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `LEV.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'NUM',
      title: 'Numbers',
      full_title: 'The Fourth Book of Moses, Commonly Called Numbers',
      abbreviation: 'Num',
      canon: 'ot',
      chapters: Array.from({ length: 36 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `NUM.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `NUM.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'DEU',
      title: 'Deuteronomy',
      full_title: 'The Fifth Book of Moses, Commonly Called Deuteronomy',
      abbreviation: 'Deut',
      canon: 'ot',
      chapters: Array.from({ length: 34 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `DEU.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `DEU.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'JOS',
      title: 'Joshua',
      full_title: 'The Book of Joshua',
      abbreviation: 'Josh',
      canon: 'ot',
      chapters: Array.from({ length: 24 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `JOS.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `JOS.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'JDG',
      title: 'Judges',
      full_title: 'The Book of Judges',
      abbreviation: 'Judg',
      canon: 'ot',
      chapters: Array.from({ length: 21 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `JDG.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `JDG.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'RUT',
      title: 'Ruth',
      full_title: 'The Book of Ruth',
      abbreviation: 'Ruth',
      canon: 'ot',
      chapters: Array.from({ length: 4 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `RUT.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `RUT.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '1SA',
      title: '1 Samuel',
      full_title: 'The First Book of Samuel',
      abbreviation: '1 Sam',
      canon: 'ot',
      chapters: Array.from({ length: 31 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `1SA.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `1SA.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '2SA',
      title: '2 Samuel',
      full_title: 'The Second Book of Samuel',
      abbreviation: '2 Sam',
      canon: 'ot',
      chapters: Array.from({ length: 24 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `2SA.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `2SA.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '1KI',
      title: '1 Kings',
      full_title: 'The First Book of Kings',
      abbreviation: '1 Kgs',
      canon: 'ot',
      chapters: Array.from({ length: 22 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `1KI.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `1KI.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '2KI',
      title: '2 Kings',
      full_title: 'The Second Book of Kings',
      abbreviation: '2 Kgs',
      canon: 'ot',
      chapters: Array.from({ length: 25 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `2KI.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `2KI.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '1CH',
      title: '1 Chronicles',
      full_title: 'The First Book of Chronicles',
      abbreviation: '1 Chr',
      canon: 'ot',
      chapters: Array.from({ length: 29 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `1CH.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `1CH.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '2CH',
      title: '2 Chronicles',
      full_title: 'The Second Book of Chronicles',
      abbreviation: '2 Chr',
      canon: 'ot',
      chapters: Array.from({ length: 36 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `2CH.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `2CH.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'EZR',
      title: 'Ezra',
      full_title: 'The Book of Ezra',
      abbreviation: 'Ezra',
      canon: 'ot',
      chapters: Array.from({ length: 10 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `EZR.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `EZR.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'NEH',
      title: 'Nehemiah',
      full_title: 'The Book of Nehemiah',
      abbreviation: 'Neh',
      canon: 'ot',
      chapters: Array.from({ length: 13 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `NEH.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `NEH.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'EST',
      title: 'Esther',
      full_title: 'The Book of Esther',
      abbreviation: 'Esth',
      canon: 'ot',
      chapters: Array.from({ length: 10 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `EST.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `EST.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'JOB',
      title: 'Job',
      full_title: 'The Book of Job',
      abbreviation: 'Job',
      canon: 'ot',
      chapters: Array.from({ length: 42 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `JOB.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `JOB.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'PSA',
      title: 'Psalms',
      full_title: 'The Book of Psalms',
      abbreviation: 'Ps',
      canon: 'ot',
      chapters: Array.from({ length: 150 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `PSA.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `PSA.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'PRO',
      title: 'Proverbs',
      full_title: 'The Book of Proverbs',
      abbreviation: 'Prov',
      canon: 'ot',
      chapters: Array.from({ length: 31 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `PRO.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `PRO.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'ECC',
      title: 'Ecclesiastes',
      full_title: 'The Book of Ecclesiastes',
      abbreviation: 'Eccl',
      canon: 'ot',
      chapters: Array.from({ length: 12 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `ECC.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `ECC.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'SNG',
      title: 'Song of Solomon',
      full_title: 'The Song of Solomon',
      abbreviation: 'Song',
      canon: 'ot',
      chapters: Array.from({ length: 8 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `SNG.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `SNG.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'ISA',
      title: 'Isaiah',
      full_title: 'The Book of Isaiah',
      abbreviation: 'Isa',
      canon: 'ot',
      chapters: Array.from({ length: 66 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `ISA.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `ISA.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'JER',
      title: 'Jeremiah',
      full_title: 'The Book of Jeremiah',
      abbreviation: 'Jer',
      canon: 'ot',
      chapters: Array.from({ length: 52 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `JER.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `JER.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'LAM',
      title: 'Lamentations',
      full_title: 'The Book of Lamentations',
      abbreviation: 'Lam',
      canon: 'ot',
      chapters: Array.from({ length: 5 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `LAM.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `LAM.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'EZK',
      title: 'Ezekiel',
      full_title: 'The Book of Ezekiel',
      abbreviation: 'Ezek',
      canon: 'ot',
      chapters: Array.from({ length: 48 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `EZK.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `EZK.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'DAN',
      title: 'Daniel',
      full_title: 'The Book of Daniel',
      abbreviation: 'Dan',
      canon: 'ot',
      chapters: Array.from({ length: 12 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `DAN.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `DAN.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'HOS',
      title: 'Hosea',
      full_title: 'The Book of Hosea',
      abbreviation: 'Hos',
      canon: 'ot',
      chapters: Array.from({ length: 14 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `HOS.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `HOS.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'JOL',
      title: 'Joel',
      full_title: 'The Book of Joel',
      abbreviation: 'Joel',
      canon: 'ot',
      chapters: Array.from({ length: 3 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `JOL.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `JOL.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'AMO',
      title: 'Amos',
      full_title: 'The Book of Amos',
      abbreviation: 'Amos',
      canon: 'ot',
      chapters: Array.from({ length: 9 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `AMO.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `AMO.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'OBA',
      title: 'Obadiah',
      full_title: 'The Book of Obadiah',
      abbreviation: 'Obad',
      canon: 'ot',
      chapters: Array.from({ length: 1 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `OBA.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 21 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `OBA.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'JON',
      title: 'Jonah',
      full_title: 'The Book of Jonah',
      abbreviation: 'Jonah',
      canon: 'ot',
      chapters: Array.from({ length: 4 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `JON.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `JON.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'MIC',
      title: 'Micah',
      full_title: 'The Book of Micah',
      abbreviation: 'Mic',
      canon: 'ot',
      chapters: Array.from({ length: 7 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `MIC.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `MIC.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'NAM',
      title: 'Nahum',
      full_title: 'The Book of Nahum',
      abbreviation: 'Nah',
      canon: 'ot',
      chapters: Array.from({ length: 3 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `NAM.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `NAM.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'HAB',
      title: 'Habakkuk',
      full_title: 'The Book of Habakkuk',
      abbreviation: 'Hab',
      canon: 'ot',
      chapters: Array.from({ length: 3 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `HAB.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `HAB.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'ZEP',
      title: 'Zephaniah',
      full_title: 'The Book of Zephaniah',
      abbreviation: 'Zeph',
      canon: 'ot',
      chapters: Array.from({ length: 3 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `ZEP.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `ZEP.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'HAG',
      title: 'Haggai',
      full_title: 'The Book of Haggai',
      abbreviation: 'Hag',
      canon: 'ot',
      chapters: Array.from({ length: 2 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `HAG.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `HAG.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'ZEC',
      title: 'Zechariah',
      full_title: 'The Book of Zechariah',
      abbreviation: 'Zech',
      canon: 'ot',
      chapters: Array.from({ length: 14 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `ZEC.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `ZEC.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'MAL',
      title: 'Malachi',
      full_title: 'The Book of Malachi',
      abbreviation: 'Mal',
      canon: 'ot',
      chapters: Array.from({ length: 4 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `MAL.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `MAL.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'MAT',
      title: 'Matthew',
      full_title: 'The Gospel According to Matthew',
      abbreviation: 'Matt',
      canon: 'nt',
      chapters: Array.from({ length: 28 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `MAT.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `MAT.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'MRK',
      title: 'Mark',
      full_title: 'The Gospel According to Mark',
      abbreviation: 'Mark',
      canon: 'nt',
      chapters: Array.from({ length: 16 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `MRK.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `MRK.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'LUK',
      title: 'Luke',
      full_title: 'The Gospel According to Luke',
      abbreviation: 'Luke',
      canon: 'nt',
      chapters: Array.from({ length: 24 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `LUK.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `LUK.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'JHN',
      title: 'John',
      full_title: 'The Gospel According to John',
      abbreviation: 'John',
      canon: 'nt',
      chapters: Array.from({ length: 21 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `JHN.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `JHN.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'ACT',
      title: 'Acts',
      full_title: 'The Acts of the Apostles',
      abbreviation: 'Acts',
      canon: 'nt',
      chapters: Array.from({ length: 28 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `ACT.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `ACT.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'ROM',
      title: 'Romans',
      full_title: 'The Epistle to the Romans',
      abbreviation: 'Rom',
      canon: 'nt',
      chapters: Array.from({ length: 16 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `ROM.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `ROM.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '1CO',
      title: '1 Corinthians',
      full_title: 'The First Epistle to the Corinthians',
      abbreviation: '1 Cor',
      canon: 'nt',
      chapters: Array.from({ length: 16 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `1CO.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `1CO.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '2CO',
      title: '2 Corinthians',
      full_title: 'The Second Epistle to the Corinthians',
      abbreviation: '2 Cor',
      canon: 'nt',
      chapters: Array.from({ length: 13 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `2CO.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `2CO.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'GAL',
      title: 'Galatians',
      full_title: 'The Epistle to the Galatians',
      abbreviation: 'Gal',
      canon: 'nt',
      chapters: Array.from({ length: 6 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `GAL.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `GAL.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'EPH',
      title: 'Ephesians',
      full_title: 'The Epistle to the Ephesians',
      abbreviation: 'Eph',
      canon: 'nt',
      chapters: Array.from({ length: 6 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `EPH.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `EPH.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'PHP',
      title: 'Philippians',
      full_title: 'The Epistle to the Philippians',
      abbreviation: 'Phil',
      canon: 'nt',
      chapters: Array.from({ length: 4 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `PHP.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `PHP.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'COL',
      title: 'Colossians',
      full_title: 'The Epistle to the Colossians',
      abbreviation: 'Col',
      canon: 'nt',
      chapters: Array.from({ length: 4 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `COL.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `COL.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '1TH',
      title: '1 Thessalonians',
      full_title: 'The First Epistle to the Thessalonians',
      abbreviation: '1 Thess',
      canon: 'nt',
      chapters: Array.from({ length: 5 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `1TH.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `1TH.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '2TH',
      title: '2 Thessalonians',
      full_title: 'The Second Epistle to the Thessalonians',
      abbreviation: '2 Thess',
      canon: 'nt',
      chapters: Array.from({ length: 3 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `2TH.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `2TH.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '1TI',
      title: '1 Timothy',
      full_title: 'The First Epistle to Timothy',
      abbreviation: '1 Tim',
      canon: 'nt',
      chapters: Array.from({ length: 6 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `1TI.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `1TI.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '2TI',
      title: '2 Timothy',
      full_title: 'The Second Epistle to Timothy',
      abbreviation: '2 Tim',
      canon: 'nt',
      chapters: Array.from({ length: 4 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `2TI.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `2TI.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'TIT',
      title: 'Titus',
      full_title: 'The Epistle to Titus',
      abbreviation: 'Titus',
      canon: 'nt',
      chapters: Array.from({ length: 3 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `TIT.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `TIT.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'PHM',
      title: 'Philemon',
      full_title: 'The Epistle to Philemon',
      abbreviation: 'Phlm',
      canon: 'nt',
      chapters: Array.from({ length: 1 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `PHM.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 25 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `PHM.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'HEB',
      title: 'Hebrews',
      full_title: 'The Epistle to the Hebrews',
      abbreviation: 'Heb',
      canon: 'nt',
      chapters: Array.from({ length: 13 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `HEB.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `HEB.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'JAS',
      title: 'James',
      full_title: 'The Epistle of James',
      abbreviation: 'Jas',
      canon: 'nt',
      chapters: Array.from({ length: 5 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `JAS.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `JAS.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '1PE',
      title: '1 Peter',
      full_title: 'The First Epistle of Peter',
      abbreviation: '1 Pet',
      canon: 'nt',
      chapters: Array.from({ length: 5 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `1PE.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `1PE.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '2PE',
      title: '2 Peter',
      full_title: 'The Second Epistle of Peter',
      abbreviation: '2 Pet',
      canon: 'nt',
      chapters: Array.from({ length: 3 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `2PE.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `2PE.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '1JN',
      title: '1 John',
      full_title: 'The First Epistle of John',
      abbreviation: '1 John',
      canon: 'nt',
      chapters: Array.from({ length: 5 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `1JN.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 15 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `1JN.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '2JN',
      title: '2 John',
      full_title: 'The Second Epistle of John',
      abbreviation: '2 John',
      canon: 'nt',
      chapters: Array.from({ length: 1 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `2JN.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 13 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `2JN.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: '3JN',
      title: '3 John',
      full_title: 'The Third Epistle of John',
      abbreviation: '3 John',
      canon: 'nt',
      chapters: Array.from({ length: 1 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `3JN.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 14 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `3JN.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'JUD',
      title: 'Jude',
      full_title: 'The Epistle of Jude',
      abbreviation: 'Jude',
      canon: 'nt',
      chapters: Array.from({ length: 1 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `JUD.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 25 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `JUD.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
    {
      id: 'REV',
      title: 'Revelation',
      full_title: 'The Revelation of Jesus Christ',
      abbreviation: 'Rev',
      canon: 'nt',
      chapters: Array.from({ length: 22 }, (_, i) => {
        const chapterNumber = i + 1;
        return {
          id: chapterNumber.toString(),
          passage_id: `REV.${chapterNumber}`,
          title: chapterNumber.toString(),
          verses: Array.from({ length: 20 }, (_, j) => {
            const verseNumber = j + 1;
            return {
              id: verseNumber.toString(),
              passage_id: `REV.${chapterNumber}.${verseNumber}`,
              title: verseNumber.toString(),
            };
          }),
        };
      }),
    },
  ],
};

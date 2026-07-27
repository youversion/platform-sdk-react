import { http, HttpResponse } from 'msw';
import { mockBooks } from '../mock-data/books';
import { mockChapters } from '../mock-data/chapters';
import mockPassages from '../mock-data/passages.json';
import mockBibles from '../mock-data/bibles.json';
import mockLanguages from '../mock-data/languages.json';
import mockOrganizations from '../mock-data/organizations.json';

export const globalHandlers = [
  // Highlights. Only a reader that opted in via `enableHighlights` (and has an
  // authenticated user) ever reaches these — self-contained highlights are off
  // by default, so every other story is unaffected. Shapes mirror
  // `packages/core/src/__tests__/handlers.ts`: `bible_id` on the wire, an
  // enveloped POST body, and a 204 on delete.
  http.get('*/v1/highlights', ({ request }) => {
    const url = new URL(request.url);
    const bibleId = Number(url.searchParams.get('bible_id'));
    const passageId = url.searchParams.get('passage_id');
    if (!bibleId || !passageId) {
      return HttpResponse.json(
        { error: 'invalid_request', error_description: 'bible_id and passage_id are required' },
        { status: 400 },
      );
    }

    // Two pre-existing server highlights on the first two verses of whatever
    // chapter is being read, so a story can show fetched highlights painting on
    // load without any interaction.
    return HttpResponse.json({
      data: [
        { bible_id: bibleId, passage_id: `${passageId}.1`, color: 'fffe00' },
        { bible_id: bibleId, passage_id: `${passageId}.2`, color: '5dff79' },
      ],
    });
  }),

  http.post('*/v1/highlights', async ({ request }) => {
    const body = (await request.json()) as {
      request_id?: string;
      highlight?: { bible_id?: number; passage_id?: string; color?: string };
    };
    if (
      !body.request_id ||
      !body.highlight?.bible_id ||
      !body.highlight.passage_id ||
      !body.highlight.color
    ) {
      return HttpResponse.json(
        {
          error: 'invalid_request',
          error_description:
            'Body must be { request_id, highlight: { bible_id, passage_id, color } }',
        },
        { status: 400 },
      );
    }

    return HttpResponse.json(body.highlight, { status: 201 });
  }),

  http.delete('*/v1/highlights/:passageId', ({ request }) => {
    const url = new URL(request.url);
    if (!url.searchParams.get('bible_id')) {
      return HttpResponse.json(
        { error: 'invalid_request', error_description: 'bible_id is required' },
        { status: 400 },
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Organization (publisher) lookup for the version picker
  http.get('*/v1/organizations/:id', ({ params }) => {
    const id = params.id as string;
    const organization = mockOrganizations[id as keyof typeof mockOrganizations];

    if (organization) {
      return HttpResponse.json(organization);
    }

    return new HttpResponse(null, { status: 404 });
  }),
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

  // John intro passage
  http.get('*/v1/bibles/111/passages/JHN.INTRO', () => {
    return HttpResponse.json({
      id: 'JHN.INTRO',
      content:
        '<div><div class="imt">Intro</div><div class="im">John closes his book by revealing his purpose in writing Jesus\' story: <span class="qt">These are written that you may believe that Jesus is the Messiah, the Son of God, and that by believing you may have life in his name.</span></div><div class="ip">John begins his book by echoing words from the Bible\'s creation story—<span class="qt">In the beginning</span>—showing his readers that this is a story of a new creation. Just as the first creation was completed in seven days, John uses the number seven to structure his book. For the Jews the number seven represented completeness and wholeness, a finished work of God revealing his purpose for the world.</div><div class="ip">The story is told in two main parts. The first describes Jesus\' public ministry and has seven sections. Each section closes with a report on how people respond to Jesus, either in faith or unbelief. The second part is devoted to the Passover weekend, when Jesus gave his life for the world.</div><div class="ip">John records seven instances in which Jesus revealed his identity by using the phrase <span class="qt">I am</span>, the name by which God had revealed himself earlier. Similarly, John records seven miraculous signs that Jesus performed. John\'s narrative mentions twice that the resurrection of Jesus took place on the<span class="qt">first day of the week.</span> In this way he confirms that the power of a new creation has broken into our world.</div></div>',
      reference: 'John Intro',
    });
  }),

  // Joshua intro passage (real TPT data for rich intro content testing)
  http.get('*/v1/bibles/1849/passages/JOS.INTRO', () => {
    return HttpResponse.json({
      id: 'JOS.INTRO',
      content:
        '<div><div class="imt1">Joshua</div><div class="imt2">Introduction</div><div class="is">At a Glance</div><div class="ili"><span class="it">Author</span>: Traditionally Joshua</div><div class="ili"><span class="it">Audience</span>: Originally Israel, but this theological history speaks to everyone</div><div class="ili"><span class="it">Date</span>: 1451–1426 BC</div><div class="ili"><span class="it">Type of Literature</span>: Theological history</div><div class="ili"><span class="it">Major Themes</span>: The land of promise; covenant and obedience; the typology of Jesus; conquest and God’s character</div><div class="ili"><span class="it">Outline</span>:</div><div class="ili2">I. Entering the Land — 1:1–5:12</div><div class="ili2">II. Conquering the Land — 5:13–12:24</div><div class="ili2">III. Dividing the Land — 13:1–22:34</div><div class="ili2">IV. Farewell and Burial in the Land — 23:1–24:33</div><div class="is">About the Book of Joshua</div><div class="ip">A new beginning stretches out before us! When we read the book of Joshua, we learn the ways of God: how he moves us forward, how we triumph over our enemies, and how we do the impossible. Joshua, a former slave in Egypt, became the leader of God’s people after the death of Moses. A generational transfer took place as a younger generation rose with fresh vision, a bold faith, and renewed passion to possess all that God had given them. All this and more is contained in the sacred book you have in your hand, the book of Joshua.</div><div class="ip">Joshua is the hinge of Israel’s history. The wilderness wandering was now over as the promised land was before them. The manna ceased, the Jordan was behind them, a new leader rose, and a new beginning opened up for the people of God. Walled cities and fierce enemies are no match for the living God. But it would still require a faith-filled people to move in and possess what God had given to them.</div><div class="ip">As the sixth book of the Bible, Joshua begins the section of Israel’s history. Bundled together, Joshua through Esther make up the biblical, inspired history of the Jewish people. Our Jewish friends call this section of the Bible (Joshua, Judges, Samuel, Kings) the “Former Prophets.” Since this section of the Bible can be considered prophecy, Joshua prophesies to the church today (see 1 Cor. 10:11), giving us instruction for how to live before God. The truths of Joshua are as much for today as the teachings of Paul or Peter. These Former Prophets lay out in front of us the secrets of victory.</div><div class="ip">The title Former Prophets demonstrates the prophetic nature of God’s dealing with his people and also the nations. It is the story of God’s redemption by the power of his mighty hand and empowering Spirit, giving revelations, performing signs and wonders, and testifying to <span class="nd">Yahweh</span>’s faithfulness in all things.</div><div class="ip">The book of Joshua shows us that we can go into the promised land of what God wants us to be. We can become the delight of God. The book of Joshua is the Ephesians of the Old Testament. Joshua was blessed with every earthly blessing in the land of Canaan. We are blessed with every heavenly blessing in Christ (see Eph. 1:3). Joshua lays out a road map to victory for us so that we can advance into our destiny; and our true destiny is for the better Joshua, Jesus, to lead us into his kingdom (see Eph. 1:13–14).</div><div class="is">Purpose</div><div class="ip">The book of Joshua contains an important and fascinating part of Israel’s history. It describes the transition of God’s chosen people from wilderness wanderers to courageous conquerors. Joshua is written as more than history. It is a “sermon” meant to activate believers today. We have an inheritance that we must fight for in faith. We have every blessing heaven contains (see Eph. 1:3), but we must claim and implement those blessings.</div><div class="ip">The church today needs the courage to conquer. Many modern believers act more like prisoners of war instead of passionate conquerors. Followers of Jesus must see themselves as soldiers in a disciplined army prepared to fight spiritual battles. The book of Joshua is a book of conquest, emboldening the church to move from passivity to passion. Like Joshua, our battles are spiritual battles, for we fight not against flesh and blood but against forces of darkness (see footnote on Josh. 24:11).</div><div class="is">Author and Audience</div><div class="ip">Joshua was one of the twelve spies who first went into the land of Canaan. Along with Caleb, Joshua was the only one to give a good report. Indeed, Israel recognized Joshua as their prophet and something similar to a “king,” <span class="yv-n f"><span class="ft">See Rashi,</span><span class="ft"> </span><span class="it">Yoma</span><span class="ft"> </span><span class="ft">73b; Rambam,</span><span class="ft"> </span><span class="it">Hil. Melachim</span><span class="ft"> </span><span class="ft">1:3, 3:8;</span><span class="ft"> </span><span class="it">Hil. Sanhedrin</span><span class="ft"> </span><span class="ft">18:6.</span></span>although they had not yet come into possession of their kingdom. According to the Jewish historian Josephus, Joshua succeeded Moses when he was eighty-five. He was a military commander who conquered seven nations (kingdoms) in seven years. He died at the age of one hundred and ten and was buried in Timnath Serah.</div><div class="ip">Joshua’s original name was Hoshea, but Moses changed it to <span class="it">Yehoshua</span> (see Num. 13:8, 16), which can be translated as “<span class="nd">Yahweh</span> is salvation” or “<span class="nd">Yahweh</span> save.” In fact, the name Yehoshua is nearly the Hebrew equivalent of the name Jesus (Yeshua). The Greek word for Jesus is <span class="it">Iesous</span> and means the same as the name Joshua. One could almost say there is a book in the Bible named <span class="it">Jesus</span>. That’s one book I would want to read, wouldn’t you?</div><div class="ip">Although certain portions were added after Joshua’s death, translators believe the author was Joshua himself for several reasons: Certain episodes of the book bear the mark of an eyewitness, such as where the author states “we” passed through the waters on dry ground in chapter three; Joshua’s description of Canaanite wickedness parallels the well-known Ras Shamra tablets, written in Joshua’s time; Joshua’s list of boundaries for the twelve tribes (see Josh. 13–19) accurately reflect the known situation of Canaan prior to the Jewish monarchy; descriptions of certain cities, such as Jerusalem still being a Jebusite city (see 15:63) and Gezer still being a Canaanite city (see 16:10), imply the author was living in the time of Joshua; and the author seems to write about things that happened in his lifetime, not about anything happening previously.</div><div class="ip">For the people of Israel, the book of Joshua was an important “hinge book” between the Torah and Prophecy. This conquering military hero who ushered in the salvation of <span class="nd">Yahweh</span> wrote this book to a people wrestling with establishing the nation in the land <span class="nd">Yahweh</span> provided, understanding God’s divine revelation-word of promise, and waiting for the fullness of his provision and promises to be realized. Similarly, we, too, wait for <span class="nd">Yahweh</span>’s promises to be fully realized, awaiting the day of his promised-land rest!</div><div class="is">Major Themes</div><div class="ip"><span class="bdit">The Land of Promise.</span> The book of Joshua is the book of the land. It is this long-ago-promised gift of a specific land by <span class="nd">Yahweh</span> that is the central animating theme. The verses offered just after Israel takes possession of the land could be a fair summary of the entire book: “So <span class="nd">Yahweh</span> gave Israel all the land he had promised their ancestors. They took possession of the land and settled there. <span class="nd">Yahweh</span> kept his promise and gave them peace in the land. . . . Not one of their enemies could stand against them. <span class="nd">Yahweh</span> didn’t break a single promise that he made to the people of Israel” (21:43–45).</div><div class="ip">This central theological theme in Joshua is intimately connected with Israel’s national and ethnic identities and to <span class="nd">Yahweh</span>’s fulfillment of his promises to the patriarchs Abraham, Isaac, and Jacob to gift their generations such a land of promise. We find six aspects of this gift throughout the book of Joshua: (1) God promised the land-gift to the forefathers; (2) God gave the gift to Israel; (3) Joshua divided it as an inheritance for the people; (4) this gift was closely connected to the land on the east side of the Jordan River; (5) it would not be difficult to take from those still living there because God had caused its inhabitants to tremble with fear; and (6) the land-gift was filled with other gods who tempted Israel.</div><div class="ip">The promised land wasn’t just <span class="it">land</span>; it was a <span class="it">gift</span>. A gift a good Father (<span class="nd">Yahweh</span>) gave to his beloved children (Israel). God promised this gift from the day he called out the man (Abraham) who would birth the nation, and he ultimately fulfilled that promise in this wonderful book. But God also extends this gift to committed hearts and obedient hands today. The book illustrates the tragedy of neglecting this gift, offering a foreshadowing of Israel’s wandering ways that would ultimately lead to exile from the land and separation from the gift of <span class="nd">Yahweh</span>.</div><div class="ip"><span class="bdit">Covenant and Obedience.</span> The promised land given to the children of Israel as a promised gift is at the heart of a covenant <span class="nd">Yahweh</span> made with them generations ago. Genesis 17:7–9 outlines the terms of this covenant:</div><div class="iq1">“I will be your children’s God, just as I am your God.</div><div class="iq1">I will give to you and your seed</div><div class="iq1">the land to which you have migrated.</div><div class="iq1">The entire land of Canaan will be yours and your descendants’</div><div class="iq1">as an everlasting possession.</div><div class="iq1">And I will be their God forever!”</div><div class="imq">God explained to Abraham, “Your part of the covenant is to obey its terms, you and your descendants throughout the ages.”</div><div class="ip">Throughout the book of Joshua, the ark of the covenant went before the people as a constant reminder of this relationship, symbolizing <span class="nd">Yahweh</span>’s mercy, power, and holiness. At every juncture of Israel’s journey in this book—from the floodwaters of the Jordan to the gates of Jericho and to the covenant’s renewal at Mount Ebal—they were to march in a new manner, with their eyes on the ark and their hearts set on <span class="nd">Yahweh</span>.</div><div class="ip">Obedience was at the core of this covenantal relationship, realized and renewed in Joshua. The people who still lived in the land, with their pagan gods and pagan ways, constantly challenged the obedience of God’s people. Israel was to worship and obey <span class="nd">Yahweh</span> alone, practices which Joshua outlined in several ways: they were to meditate on the Torah day and night, learn the commands of <span class="nd">Yahweh</span>, practice circumcision, keep the Passover, worship at the place of <span class="nd">Yahweh</span>’s choosing, and obey the written laws of <span class="nd">Yahweh</span>.</div><div class="ip">Perhaps the climax of the covenant in the book comes at the end, just before Joshua’s death was reported. He led the people in renewing their relationship with <span class="nd">Yahweh</span> at Shechem and put into the starkest terms possible Israel’s need to fully embrace their covenantal relationship with <span class="nd">Yahweh</span> and obey him completely: “Make your decision today which gods you will worship—the gods which your ancestors worshiped in Mesopotamia or the gods which the Amorites worship in the land where you are now living—but I and my family, we will give our lives to worship and serve <span class="nd">Yahweh</span>” (Josh. 24:15).</div><div class="ip">The ark not only beautifully illustrates God’s covenant with Israel, it is also a wonderful picture of Jesus Christ, who “is the catalyst of a better covenant which contains far more wonderful promises” (Heb. 8:6). The power of Christ within us enables us to pass over into our full inheritance. Jesus, our forerunner, leads us in, and we are to join with the same obedient voices as those of Israel, declaring “We, too, will worship and serve <span class="nd">Yahweh</span>, for he alone is our God” (Josh. 24:18).</div><div class="ip"><span class="bdit">The Typology of Jesus.</span> To read the book of Joshua and not see Jesus would be unfortunate. Joshua is a clear type of Jesus, for he took the Israelites into a realm that the law (Moses) was unable to experience. The church father Eusebius offers this connection between the name Joshua and the name Jesus:</div><div class="imq">Moses was inspired by the divine Spirit to foresee clearly the name of Jesus; and he deemed this name of special honor. Till it was made known to Moses, it had never been on man’s lips before. He bestowed the name of Jesus on him first of all, and only on him, who he knew would succeed, in type and symbol, after his death. His successor had not previously been called Jesus, but his parents had called him Hoshea.<span class="yv-n f"><span class="ft">See</span><span class="ft"> </span><span class="it">Hist. Eccles.</span><span class="ft"> </span><span class="ft">I 3.</span></span></div><div class="ip">For the believer, the typology of Joshua is apparent. First, the name Joshua is wonderfully similar to Jesus (Yeshua). Secondly, the promised land for the follower of Christ becomes a picture of the untold blessings that are ours in Christ (see Eph. 1:3). Canaan was a fertile land. It symbolizes the abundant life of the victorious believer. Canaan had to be conquered, and so our promises and blessings must be claimed by faith. The law of Moses did not attain Canaan but only the grace of God did. Heathen hordes inhabited Canaan, and God’s people had to purge the land of the powers of darkness and idolatry, just as we must purge our hearts (see Eph. 6:12; Heb. 9:23).</div><div class="ip">The miracle-crossing of the Jordan River typifies crossing over into a life of abundance and union with Jesus Christ. Our Savior was the One who descended into judgment for our sins. The Jordan was miraculously rolled back all the way to a town called Adam; Jesus rolled back the waters of judgment all the way back to the sin of Adam. The rending of the Jordan corresponds to the rending of the veil in the Holy of Holies when Jesus was crucified (see 2 Cor. 3:1–18; Heb. 10:20). We are now those who cross over into union and intimacy with God.</div><div class="ip">Additionally, the pushing back of the waters (as the dividing of the Red Sea previously) displayed the power of Israel’s God over all other gods, including those of the seas and rivers (that were believed to be untamable in the ancient world). <span class="nd">Yahweh</span> showed his power to destroy every other power and authority in carrying out his victory of life for a people he had made his own. This is what caused fear to enter the hearts of the inhabitants of the land who had previously heard of the strong and mighty outstretched arm of <span class="nd">Yahweh</span> that split the Red Sea in two and now divided the river. No god can stand before this God! This is even more significant when gods are associated with particular territories or spheres of influence. This God travels and has power over all territories and powers.</div><div class="ip">Aside from the clear name association, we can see Jesus in the book of Joshua in a number of ways:</div><div class="ili">The Heavenly Joshua (Heb. 4:8)</div><div class="ili">The Pioneer of Our Salvation (Heb. 2:10)</div><div class="ili">The Crimson Rope (Josh. 2:18)</div><div class="ili">The Ark of the Covenant of the Lord of All the Earth (Josh. 3:11)</div><div class="ili">The Memorial of Twelve Stones (Josh. 4:19–24)</div><div class="ili">The Passover Lamb (Josh. 5:10–12; 1 Cor. 5:7–8)</div><div class="ili">The Altar (Josh. 8:30–35; Heb. 13:10)</div><div class="ili">The Commander of <span class="nd">Yahweh</span>’s Armies (Josh. 5:13–15; Eph. 6:12–18)</div><div class="ili">The Heavenly Refuge (Josh. 20:1–9; Heb. 6:19–20)</div><div class="ip"><span class="bdit">Conquest and God’s Character.</span> The book of Joshua is a road map, a manual for conquest. It contains the secrets of conquest with its amazing, jaw-dropping victories and sadly disappointing defeats. And yet, many point to the book of Joshua as an example of God behaving badly because of this theme of conquest, which seems to touch a raw nerve. Some view these battles as morally dubious, filled with nationalistic violence and terror. However, note several things about the context of the time in which this history of Israel’s conquests unfolds.</div><div class="ip">First, war was a normal fact of life; it still is. The Bible reminds us there is a time for war (see Eccl. 3:8) and a justifiable war (see Gen. 14), which the book of Joshua illustrates. However, the modern military cannot claim the right to destructive warfare based on Israelite wars, for they served a divine purpose in unfolding <span class="nd">Yahweh</span>’s plans. Also the sort of holy war we find in Joshua was not invented by Israel nor limited to the nation. Further, the Canaanites were by no means innocent, for their sexual perversion, child sacrifice, and pagan idolatry could not go unpunished by a righteous God.</div><div class="ip">Finally, the theme of conquest reveals the character of God. In the book of Joshua, we see God’s mercy unfold, such as in his sparing of Rahab and her family. Also, consider the fact that <span class="nd">Yahweh</span> mercifully waited hundreds of years before commencing the conquest, giving the inhabitants of the land ample time to repent (see 2 Pet. 3:9). God waited until their cup of iniquity was filled. No doubt this aspect of Joshua can be troubling. However, in this way the conquest shows us God’s anger, justice, and wrath—important elements of his character.</div><div class="ip">God’s character is further unfolded through the many conflicts that arise. We discover, along with Israel, that God not only initiates covenant relationships, but he also punishes disobedient people. He also gives his people victory over their enemies on their way toward possessing the land and nationhood. This God is a God who fights for his people, standing with them in the midst of their oppression and suffering, raising them up to the plateau of victory, and assuring them they have no reason to “yield to fear nor be discouraged, for I am <span class="nd">Yahweh</span> your God, and I will be with you wherever you go!” (Josh. 1:9).</div><div class="mt1 yv-h">Joshua</div><div class="mt2 yv-h">A New Beginning</div></div>',
      reference: 'Joshua ',
    });
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
  // When country=zz, return languages in the API's preferred order for the user's region
  http.get('*/v1/languages', ({ request }) => {
    const url = new URL(request.url);
    const country = url.searchParams.get('country');
    if (country?.toUpperCase() === 'ZZ') {
      const countryOrder = ['en', 'es', 'pt', 'fr', 'ko'];
      const ordered = countryOrder
        .map((id) => mockLanguages.data.find((l: { id: string }) => l.id === id))
        .filter(Boolean);
      return HttpResponse.json({ data: ordered, next_page_token: null });
    }
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

  http.get('*/v1/bibles/1849/books', () => {
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

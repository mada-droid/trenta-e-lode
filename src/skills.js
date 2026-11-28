// skills.js — "Metodo di studio / Study method" section of the Video tab.
// A short questionnaire finds what to improve in how you study and take exams; each answer adds
// points to one or more areas, and the strongest areas get curated YouTube videos (IDs verified via
// oEmbed when chosen). Shared by the Italian edition (Italian videos first, English where useful)
// and the English edition (English videos only).
const SKILLS = (() => {
  const IT = document.documentElement.lang === 'it';
  const tr = o => (o && typeof o === 'object' && 'it' in o ? (IT ? o.it : o.en) : o);

  // ─── Questions: o = [label, weights] ───
  const Q = [
    { id: 'new', q: { it: 'Quando studi un argomento nuovo, cosa fai di solito?', en: 'When you study a new topic, what do you mostly do?' }, o: [
      [{ it: 'Rileggo appunti o libro ed evidenzio', en: 'Re-read notes or the book and highlight' }, { active: 3, understanding: 1 }],
      [{ it: 'Guardo lezioni/video e copio gli appunti', en: 'Watch lectures/videos and copy notes' }, { active: 2, lectures: 1 }],
      [{ it: 'Salto quasi subito agli esercizi', en: 'Jump to the exercises almost straight away' }, { understanding: 1, proofs: 1 }],
      [{ it: 'Chiudo il libro e provo a ricordare / spiegare', en: 'Close the book and try to recall / explain it' }, {}]] },
    { id: 'review', q: { it: 'Quando ripassi quello che hai già studiato?', en: 'When do you review what you studied earlier?' }, o: [
      [{ it: 'Solo negli ultimi giorni prima dell’esame', en: 'Only in the last days before the exam' }, { spaced: 3, procrast: 1 }],
      [{ it: 'Quasi mai: dimentico e riparto da zero', en: 'Almost never: I forget and start from scratch' }, { spaced: 4 }],
      [{ it: 'Ogni tanto, senza uno schema', en: 'Now and then, without a schedule' }, { spaced: 2 }],
      [{ it: 'Regolarmente (flashcard, ripassi programmati)', en: 'Regularly (flashcards, scheduled reviews)' }, {}]] },
    { id: 'ex', multi: true, q: { it: 'Con gli esercizi (di matematica o simili), cosa va storto?', en: 'With exercises (math or similar), what goes wrong?' }, o: [
      [{ it: 'Guardo la soluzione troppo presto', en: 'I look at the solution too early' }, { problems: 2, active: 1 }],
      [{ it: 'Capisco la teoria ma non so da dove partire', en: 'I get the theory but can’t see where to start' }, { problems: 3 }],
      [{ it: 'Errori di calcolo e distrazione', en: 'Calculation slips and careless mistakes' }, { written: 2 }],
      [{ it: 'Le dimostrazioni sono la parte più difficile', en: 'Proofs are the hardest part' }, { proofs: 3 }],
      [{ it: 'Di solito vanno bene', en: 'They usually go fine' }, {}]] },
    { id: 'lect', q: { it: 'A lezione…', en: 'In lectures…' }, o: [
      [{ it: 'Non riesco a seguire: mi mancano le basi', en: 'I can’t follow: I’m missing the basics' }, { lectures: 3, mindset: 1 }],
      [{ it: 'Copio tutto ma capisco poco', en: 'I copy everything but understand little' }, { lectures: 2, active: 1 }],
      [{ it: 'Seguo bene', en: 'I follow well' }, {}]] },
    { id: 'cover', q: { it: 'Come arrivi all’esame rispetto al programma?', en: 'How much of the syllabus have you covered by the exam?' }, o: [
      [{ it: 'Approfondisco ogni dettaglio e non finisco il programma', en: 'I go deep into every detail and don’t finish the syllabus' }, { coverage: 4 }],
      [{ it: 'Ho visto tutto, ma in superficie', en: 'I’ve seen everything, but only on the surface' }, { understanding: 3 }],
      [{ it: 'Ho coperto tutto con calma', en: 'I covered everything calmly' }, {}]] },
    { id: 'written', multi: true, q: { it: 'Allo scritto, cosa ti fa perdere più punti?', en: 'In a written exam, what costs you the most points?' }, o: [
      [{ it: 'Finisco il tempo', en: 'I run out of time' }, { written: 2, problems: 1 }],
      [{ it: 'Panico, vuoto di memoria', en: 'Panic, my mind goes blank' }, { anxiety: 3 }],
      [{ it: 'Perdo tempo/punti a ricopiare in bella o nella forma', en: 'I lose time/points rewriting neatly or on form' }, { written: 3 }],
      [{ it: 'Alcuni esercizi li faccio perfetti, gli altri argomenti non li ho studiati', en: 'Some exercises are perfect, the other topics I never studied' }, { coverage: 3, procrast: 1 }],
      [{ it: 'Va bene così', en: 'It goes fine' }, {}]] },
    { id: 'start', multi: true, q: { it: 'Iniziare e continuare a studiare:', en: 'Starting and keeping going:' }, o: [
      [{ it: 'Rimando l’inizio', en: 'I put off starting' }, { procrast: 3 }],
      [{ it: 'Se mi fermo, ci metto settimane a ripartire', en: 'If I stop, it takes me weeks to get back on track' }, { procrast: 3 }],
      [{ it: 'Mi distraggo dopo pochi minuti (telefono, pensieri)', en: 'I get distracted after a few minutes (phone, thoughts)' }, { focus: 3 }],
      [{ it: 'Studio tante ore ma rendo poco', en: 'I study for hours but get little done' }, { active: 2, focus: 1 }],
      [{ it: 'Nessun problema', en: 'No problem' }, {}]] },
    { id: 'oral', q: { it: 'All’orale, cosa ti preoccupa di più?', en: 'In an oral exam, what worries you most?' }, o: [
      [{ it: 'Spiegare in modo preciso e formale', en: 'Explaining precisely and formally' }, { oral: 3, understanding: 1 }],
      [{ it: 'L’ansia: mi blocco', en: 'Anxiety: I freeze' }, { anxiety: 2, oral: 2 }],
      [{ it: 'Ricordare e rifare le dimostrazioni', en: 'Remembering and redoing proofs' }, { proofs: 2, oral: 1 }],
      [{ it: 'Niente, gli orali vanno bene', en: 'Nothing, orals go fine' }, {}]] },
    { id: 'sleep', q: { it: 'Come dormi, soprattutto in sessione?', en: 'How do you sleep, especially around exams?' }, o: [
      [{ it: 'Poco o notti in bianco', en: 'Too little or all-nighters' }, { sleep: 3 }],
      [{ it: 'Abbastanza ma a orari irregolari', en: 'Enough, but at irregular times' }, { sleep: 2 }],
      [{ it: 'Bene, 7–9 ore', en: 'Well, 7–9 hours' }, {}]] },
    { id: 'nerves', q: { it: 'Prima e durante un esame ti senti…', en: 'Before and during an exam you feel…' }, o: [
      [{ it: 'Molto in ansia: mi fa rendere peggio', en: 'Very anxious: it hurts my performance' }, { anxiety: 3 }],
      [{ it: 'Un po’ nervoso, normale', en: 'A bit nervous, normal' }, { anxiety: 1 }],
      [{ it: 'Tranquillo', en: 'Calm' }, {}]] },
    { id: 'mind', q: { it: 'Quando una materia diventa difficile, pensi…', en: 'When a subject gets hard, you think…' }, o: [
      [{ it: '«Forse non sono portato»', en: '“Maybe I’m not cut out for this”' }, { mindset: 3 }],
      [{ it: '«Mi servono basi, metodo o più tempo»', en: '“I need the basics, a method or more time”' }, {}]] },
  ];

  // ─── Areas: title, why it matters, one thing to do (in the app when possible), videos ───
  // Video rows: [YouTube ID, title, channel, length, language]
  const A = {
    base: { c: '#7c8cff', t: { it: 'Le basi: studiare con metodo', en: 'The basics: studying with a method' },
      why: { it: 'Le tecniche con più evidenze scientifiche: richiamo attivo, ripasso dilazionato, esercizi mescolati.', en: 'The techniques with the strongest evidence: active recall, spaced review, mixed practice.' },
      tip: { it: 'Guarda prima questi: sono la mappa di tutto il resto.', en: 'Watch these first: they are the map for everything else.' },
      it: [['QKFnTndYgTU', 'Come studiare (molto) meno e prendere voti migliori', 'Giuseppe Castagna', '8:51'], ['3FvXpqJEvvM', 'Come studiare all’università: il miglior metodo di studio universitario', 'Alessandro de Concini - ADC', '12:15']],
      en: [['ukLnPbIffxE', 'How to study for exams - Evidence-based revision tips', 'Ali Abdaal', '20:59'], ['TjPFZaMe2yw', '3 tips on how to study effectively', 'TED-Ed', '5:09'], ['p60rN9JEapg', 'The 9 BEST Scientific Study Tips', 'AsapSCIENCE', '3:26']] },
    spaced: { c: '#3fae8c', t: { it: 'Ripasso dilazionato: non dimenticare', en: 'Spaced review: stop forgetting' },
      why: { it: 'Senza ripassi si dimentica gran parte in pochi giorni e si riparte da zero. Ripassi brevi e distanziati fissano tutto.', en: 'Without reviews you forget most of it within days and start over. Short, spaced reviews make it stick.' },
      tip: { it: 'Ogni giorno 10–15 minuti in Ripasso, e rifai a distanza di 1, 3, 7 giorni gli esercizi già risolti.', en: 'Every day spend 10–15 minutes in Flashcards, and redo solved exercises after 1, 3 and 7 days.' },
      it: [['13DUcT2AewY', 'Spaced repetitions (ripetizioni programmate)', 'Alessandro de Concini - ADC', '1:59'], ['CGG-VEmfqWU', 'Memorizzazione a lungo termine - le ripetizioni programmate', 'Andrea Muzii', '7:16'], ['xYoyYwz7HRo', 'Gestione dei ripassi: come non dimenticarsi ciò che si studia', 'Annalisa Ciaccio', '8:24']],
      en: [['-uMMRjrzPmE', 'Spaced Repetition: The most powerful study technique', 'Tiny Medicine', '2:33'], ['cVf38y07cfk', 'Spaced repetition in learning theory', 'Osmosis from Elsevier', '4:28'], ['X_TWGOxz8X4', 'How to Use Spaced Repetition in 3 Minutes', 'Karl Avillo, MD', '3:01']] },
    active: { c: '#e3a23c', t: { it: 'Richiamo attivo', en: 'Active recall' },
      why: { it: 'Rileggere dà l’illusione di sapere. Ricordare a libro chiuso è ciò che crea memoria davvero.', en: 'Re-reading feels like knowing. Recalling with the book closed is what actually builds memory.' },
      tip: { it: 'Dopo ogni pomodoro chiudi tutto e scrivi o di’ a voce ciò che ricordi; poi controlla.', en: 'After every Pomodoro close everything and write or say what you remember; then check.' },
      it: [['LfjLg0Wt4Z8', 'Active recall per ricordare cosa si studia', 'Giugyssima', '6:47'], ['mEM4An5YwMU', 'Il mio metodo di studio: prima lettura e active recall', 'Annalisa Ciaccio', '5:45'], ['fMqK3QC88Y8', 'Come usare le tecniche di active recall e spaced repetition', 'Giovanni DOC Fenu', '7:27']],
      en: [['mzexJPoXBCM', 'How to Study & Learn Using Active Recall', 'Huberman Lab Clips', '6:49'], ['IyvlgRf7u3Y', 'How to do ACTIVE RECALL Effectively?', 'Tiny Medicine', '3:54'], ['MSq-KGj_cnY', '12 ways to Active Recall in 12 minutes', 'Mike and Matty', '12:18']] },
    coverage: { c: '#d9534f', t: { it: 'Coprire tutto il programma (perfezionismo)', en: 'Covering the whole syllabus (perfectionism)' },
      why: { it: 'Approfondire ogni dettaglio fa prendere il massimo su 1–2 esercizi e zero sugli altri. Prima tutto al 70%, poi si approfondisce.', en: 'Going deep into every detail earns full marks on 1–2 questions and zero on the rest. First everything to 70%, then deepen.' },
      tip: { it: 'Dai a ogni argomento un tetto di pomodori; ciò che vuoi approfondire va in una lista “dopo” e si riprende solo a programma finito.', en: 'Give each topic a Pomodoro budget; anything you want to dig into goes on a “later” list, picked up only once the syllabus is done.' },
      it: [['lxKksToUlsM', 'Come affrontare il perfezionismo tossico nello studio', 'Alessandro de Concini - ADC', '10:19'], ['kAGwtvW7O9I', 'Come ho sconfitto il perfezionismo (e raddoppiato i risultati)', 'Andrea Muzii', '12:41'], ['lIqdy-G7vQg', 'Come organizzare la sessione per passare tutti gli esami', 'Lucia Wang', '14:44']],
      en: [['PiqSQtXPq8I', 'How PERFECTIONISM is Preventing You from Studying EFFECTIVELY', 'Kloom', '5:16'], ['bYQB0YVY7qE', 'The 4-Part Daily Exam Routine That Got Me Straight A’s in Engineering', 'Penrose', '15:47']] },
    procrast: { c: '#a45bd1', t: { it: 'Iniziare e restare costante', en: 'Starting and staying consistent' },
      why: { it: 'Non serve motivazione ma una soglia d’ingresso bassa e una regola per non fermarsi a lungo.', en: 'You don’t need motivation: you need a tiny starting step and a rule against long breaks.' },
      tip: { it: 'Regola dei due giorni: mai saltare due giorni di fila. Minimo un pomodoro al giorno, anche nei giorni no.', en: 'Two-day rule: never skip two days in a row. At least one Pomodoro a day, even on bad days.' },
      it: [['3HGZYAjoZaM', '7 modi concreti per avere più disciplina', 'EfficaceMente', '13:13'], ['Qj7SeVj_nNU', 'Non riesci a studiare? Motivazione e volontà', 'Alessandro de Concini - ADC', '9:19']],
      en: [['FWTNMzK9vG4', 'Why you procrastinate even when it feels bad', 'TED-Ed', '5:46'], ['Sw-Onb-CKTY', 'How to be CONSISTENT (even if you don’t feel like it)', 'Mike and Matty', '9:29'], ['48jlHaxZnig', 'How to Stop Procrastination & Increase Motivation', 'Huberman Lab Clips', '7:06']] },
    lectures: { c: '#45a0d1', t: { it: 'Seguire le lezioni e colmare le lacune', en: 'Following lectures and filling gaps' },
      why: { it: 'Se mancano le basi, a lezione si copia senza capire. Bastano 10 minuti di “priming” prima e un ripasso mirato dei prerequisiti.', en: 'With gaps in the basics you copy without understanding. Ten minutes of priming before class and a targeted review of prerequisites fix most of it.' },
      tip: { it: 'Prima di ogni lezione sfoglia l’argomento per 10 minuti; a lezione segna con “?” ciò che non capisci e chiariscilo il giorno stesso.', en: 'Before each lecture skim the topic for 10 minutes; in class mark what you don’t get with “?” and clear it up the same day.' },
      it: [['wdC-jMsp2aA', 'Come prendere appunti… sul serio!', 'Alessandro de Concini - ADC', '11:11'], ['tq5mLScR2YM', 'Come prendere appunti all’università: metodo veloce ed efficace', 'Lucia Wang', '32:50']],
      en: [['eZWP-eA-lCg', 'What is Priming? Increase Learning by 40%', 'Justin Sung', '4:41'], ['AffuwyJZTQQ', 'How to Take Notes in Class: The 5 Best Methods', 'Thomas Frank', '6:40'], ['cRQqH18wJgw', 'The Surprising Truth About Note-taking During Lectures', 'Benjamin Keep, PhD, JD', '8:48']] },
    problems: { c: '#e58f3c', t: { it: 'Esercizi di matematica', en: 'Math problem solving' },
      why: { it: 'Saper rifare un esercizio visto non basta: serve riconoscere il tipo di esercizio e saper partire da soli.', en: 'Redoing a familiar exercise isn’t enough: you need to recognise the type and start on your own.' },
      tip: { it: 'Prima di guardare la soluzione resisti 10 minuti; poi rifai l’esercizio da zero due giorni dopo. Mescola esercizi di argomenti diversi.', en: 'Hold out 10 minutes before looking at the solution; redo it from scratch two days later. Mix exercises from different topics.' },
      it: [['vQAoly1QMSs', 'Matematica: fare più esercizi non basta (ecco perché)', 'Alessandro de Concini - ADC', '19:41'], ['x40DlRH1tMs', 'Come studiare per Analisi I da 30 e lode', 'JohnnyCannuccia - studystraw', '17:46'], ['BO5Cs9-IMd0', 'Come studiare per l’esame di Analisi', 'Alessandro de Concini - ADC', '8:35'], ['yFDO86FiNSc', 'Come ho imparato la matematica e superato Analisi 1 (senza essere un genio)', 'DivulgaMente | Alberto Giannone', '10:37']],
      en: [['cqk4vcuKoBQ', 'How to Study for Math', 'Professor Leonard', '13:30'], ['aLPhBVkhE6I', 'My study routine as a Math Prof // My top study tips', 'Dr. Trefor Bazett', '12:52'], ['zhL3EMFSm6o', 'Polya’s Problem Solving Process', 'Math Videos that Motivate', '5:25']] },
    proofs: { c: '#b06ab3', t: { it: 'Teoremi e dimostrazioni', en: 'Theorems and proofs' },
      why: { it: 'Le dimostrazioni non si imparano a memoria: si ricordano l’idea chiave e i 3–4 passaggi che la reggono.', en: 'Proofs aren’t memorised word for word: you remember the key idea and the 3–4 steps that carry it.' },
      tip: { it: 'Per ogni teorema scrivi su una flashcard: ipotesi, tesi, idea in una riga, passaggi chiave. Poi rifallo a libro chiuso.', en: 'For each theorem write a flashcard: hypotheses, claim, the idea in one line, key steps. Then redo it with the book closed.' },
      it: [['Hy50FX8kUzA', 'Come studiare teoremi e dimostrazioni', 'Mathone | Davide Murari', '32:56'], ['O4EB-w9IXhs', 'Lo scoglio delle dimostrazioni agli esami', 'Marcello Dario Cerroni', '15:54']],
      en: [['IA03dUDY6ls', 'How To Figure Out Math Proofs On Your Own', 'The Math Sorcerer', '9:00'], ['YYgepDY3rHw', 'An Introduction to Mathematical Proofs', 'zeropercent', '9:41']] },
    written: { c: '#e5534b', t: { it: 'Strategia per lo scritto', en: 'Written exam strategy' },
      why: { it: 'Allo scritto contano tempo e presentazione: chi scrive bene al primo colpo e gestisce il tempo prende più punti.', en: 'Written exams reward time management and presentation: writing it cleanly the first time earns more points.' },
      tip: { it: 'Fai le simulazioni a tempo; abituati a scrivere direttamente in bella (brutta solo per i calcoli) e a fare prima gli esercizi sicuri.', en: 'Do timed mock exams; get used to writing the final copy directly (scratch only for calculations) and doing the sure questions first.' },
      it: [['i4cLqs7Nl-g', 'Vuoi eccellere in Analisi 1? 5 consigli per prepararti al meglio', 'Giacomo Radicchi', '5:34']],
      en: [['VkQsafoUPBk', 'becoming good at tests is easy, actually', 'easy, actually', '11:37'], ['pByDJDUEbUA', 'The HACK to ACE MATH no matter what - Caltech study tip', 'Amy Wang', '11:51']] },
    oral: { c: '#7a5af5', t: { it: 'Esame orale', en: 'Oral exam' },
      why: { it: 'L’orale si allena parlando: definizioni dette ad alta voce, con il linguaggio formale, davanti a qualcuno.', en: 'Orals are trained by speaking: definitions said out loud, in formal language, in front of someone.' },
      tip: { it: 'Due volte a settimana simula l’orale: estrai una domanda, rispondi ad alta voce per 5 minuti, registrati e riascolta.', en: 'Twice a week simulate the oral: draw a question, answer out loud for 5 minutes, record yourself and listen back.' },
      it: [['CLg64UVqnWw', '3 consigli per spaccare a un esame orale', 'Alessandro de Concini - ADC', '9:52'], ['swJq6lzCOzE', 'Come NON dare un esame orale', 'Alessandro de Concini - ADC', '6:55'], ['jD184EMSC7I', 'Come superare l’ansia da esame orale', 'Filippo Caccamo', '3:57']],
      en: [['hFB-RsXhQQQ', 'How to study for an oral exam', 'Arata Academy ENGLISH', '12:35'], ['3CkCEOvkAsg', 'How I Study for Oral Exams in Med School', 'The Ashley Notes', '8:46']] },
    anxiety: { c: '#45ae9c', t: { it: 'Ansia da esame', en: 'Exam anxiety' },
      why: { it: 'Un po’ d’ansia vuol dire che ci tieni; quando blocca, si gestisce con respirazione, simulazioni realistiche e una routine pre-esame.', en: 'Some nerves mean you care; when they freeze you, breathing, realistic simulations and a pre-exam routine help.' },
      tip: { it: 'Fai le simulazioni nelle stesse condizioni dell’esame (orario, tempo, niente appunti): l’esame vero diventa “l’ennesima volta”.', en: 'Do simulations in exam conditions (time of day, time limit, no notes): the real exam becomes “just another one”.' },
      it: [['puRzUEm7LJk', 'Come sconfiggere l’ansia da esame', 'Alessandro de Concini - ADC', '15:25'], ['c_sRfaHpvr4', 'Ansia da esame: i consigli della psicologa', 'Centro Medico Lazzaro Spallanzani', '3:40']],
      en: [['fHfHSq7PVDU', 'How to Beat Test Anxiety and Take on Exams Without Stress', 'Thomas Frank', '9:03'], ['vQsVhbVEbSU', 'Seriously, please watch this before your next exam', 'Matthew Smith', '3:59'], ['-RZ86OB9hw4', 'Conquering exam stress: lessons from our bodies', 'The Physiological Society', '2:32']] },
    focus: { c: '#5b8def', t: { it: 'Concentrazione', en: 'Focus' },
      why: { it: 'La concentrazione si allena: telefono lontano, un obiettivo per sessione, pause vere.', en: 'Focus is trainable: phone away, one goal per session, real breaks.' },
      tip: { it: 'Usa il Pomodoro con un compito collegato e il telefono in un’altra stanza.', en: 'Use the Pomodoro with a linked task and your phone in another room.' },
      it: [['clOAm1rE1EQ', 'Come studiare per ore senza distrarsi (8 consigli)', 'Lucia Wang', '16:28'], ['hMS3-4Wu3eY', 'Come concentrarsi nello studio (e non solo)', 'Alessandro de Concini - ADC', '7:41'], ['bqb3ZXHg9ps', 'Come concentrarsi al meglio: 3 tecniche dalle neuroscienze', 'Marco Montemagno', '3:11']],
      en: [['Hu4Yvq-g7_Y', 'How to Get Your Brain to Focus | Chris Bailey | TEDxManchester', 'TEDx Talks', '15:57'], ['seMVR9lwrjM', 'How to study EFFECTIVELY without distraction', 'simple, actually', '4:11']] },
    understanding: { c: '#3fae8c', t: { it: 'Capire davvero (tecnica di Feynman)', en: 'Real understanding (Feynman technique)' },
      why: { it: 'Se non lo sai spiegare in parole semplici, non l’hai ancora capito: e lo scopri prima dell’esame.', en: 'If you can’t explain it simply, you don’t understand it yet, and you find out before the exam.' },
      tip: { it: 'Per ogni argomento spiega l’idea come a un amico che non ha seguito il corso; dove ti blocchi, torna al libro.', en: 'For each topic explain the idea to a friend who skipped the course; wherever you get stuck, go back to the book.' },
      it: [['E9FMWLLf40Y', 'Come studiare con la tecnica di Feynman', 'Alessandro de Concini - ADC', '13:23'], ['2B2K1lYv0oA', 'La tecnica di apprendimento di Feynman', 'Sprouts Italia', '2:02']],
      en: [['_f-qkGJBPts', 'How to Learn Faster with the Feynman Technique', 'Thomas Frank', '5:48'], ['tkm0TNFzIeg', 'The Feynman Technique', 'Sprouts', '2:02'], ['FrNqSLPaZLc', 'Learn Faster with The Feynman Technique', 'Scott Young', '4:08']] },
    mindset: { c: '#d9a43c', t: { it: '«Non sono portato»: la mentalità giusta', en: '“I’m not a math person”: mindset' },
      why: { it: 'Quasi sempre non è talento: mancano prerequisiti o metodo. Si recuperano entrambi.', en: 'It is almost never talent: it is missing prerequisites or method, and both can be fixed.' },
      tip: { it: 'Quando non capisci, chiediti “quale prerequisito mi manca?” invece di “sono portato?”.', en: 'When you don’t understand, ask “which prerequisite am I missing?” instead of “am I good at this?”.' },
      it: [['POSlZEd-qhA', 'Talento per la matematica: non è come pensi', 'Alessandro de Concini - ADC', '22:48']],
      en: [['3icoSeGqQtY', 'How you can be good at math, and other surprising facts about learning', 'Jo Boaler | TEDxStanford', '12:58'], ['HMJMQy-Rgw8', 'Jo Boaler - Fixed Mindset v. Growth in Math', 'Youcubed', '3:23']] },
    sleep: { c: '#6c7bd9', t: { it: 'Sonno e memoria', en: 'Sleep and memory' },
      why: { it: 'Il sonno è quando la memoria si consolida: le notti in bianco cancellano parte di quanto studiato.', en: 'Sleep is when memory consolidates: all-nighters erase part of what you studied.' },
      tip: { it: 'Orari regolari e niente notti in bianco prima degli esami: rende più di due ore di studio in più.', en: 'Regular hours and no all-nighters before exams: worth more than two extra hours of study.' },
      it: [],
      en: [['5MuIMqhT8DM', 'Sleep Is Your Superpower | Matt Walker', 'TED', '19:19'], ['gedoSfZvBgE', 'The benefits of a good night’s sleep', 'TED-Ed', '5:45']] },
  };
  const L = IT ? {
    tabLess: 'Lezioni', tabSkill: 'Metodo di studio', title: 'Metodo di studio',
    intro: 'Rispondi a qualche domanda su come studi e affronti gli esami: l’app capisce cosa migliorare e ti consiglia i video giusti da YouTube.',
    multi: 'puoi sceglierne più di una', go: 'Mostrami cosa migliorare', missing: n => `Mancano ${n} risposte`,
    profile: 'Cosa migliorare, in ordine', redo: 'Rifai il questionario', why: 'Perché', todo: 'Da fare', others: 'Altri temi',
    watched: 'Visto', markW: 'Segna come visto', yt: '↗ YouTube', allGood: 'Nessun punto debole evidente: ecco le basi per affinare il metodo.', en: 'in inglese', saved: n => `${n} video visti`,
    claude: 'I consigli di Claude per te', answered: d => `Risposte del ${d}`,
  } : {
    tabLess: 'Lectures', tabSkill: 'Study method', title: 'Study method',
    intro: 'Answer a few questions about how you study and take exams: the app works out what to improve and recommends the right YouTube videos.',
    multi: 'you can pick more than one', go: 'Show me what to improve', missing: n => `${n} answers missing`,
    profile: 'What to improve, in order', redo: 'Retake the questionnaire', why: 'Why', todo: 'Do this', others: 'Other topics',
    watched: 'Watched', markW: 'Mark as watched', yt: '↗ YouTube', allGood: 'No clear weak spot: here are the basics to sharpen your method.', en: '', saved: n => `${n} videos watched`,
    claude: 'Claude’s advice for you', answered: d => `Answers from ${d}`,
  };

  // ─── State: S.skills = { answers: { qid: index | [indexes] }, at, watched: { ytId: ts } } ───
  let tab = 'lessons', draft = null, cur = null;
  const st = () => { if (!S.skills) S.skills = window.SKILLS_PREFILL ? JSON.parse(JSON.stringify(window.SKILLS_PREFILL)) : { answers: null, watched: {} }; S.skills.watched ||= {}; return S.skills; };
  const vids = k => [...(IT ? A[k].it.map(v => [...v, 'it']) : []), ...A[k].en.map(v => [...v, 'en'])];
  function score(ans) {
    const s = {};
    for (const q of Q) { const a = ans[q.id]; for (const i of [].concat(a ?? [])) for (const [k, w] of Object.entries(q.o[i]?.[1] || {})) s[k] = (s[k] || 0) + w; }
    return Object.entries(s).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }
  const answered = a => a && Q.every(q => [].concat(a[q.id] ?? []).length);

  function quiz() {
    const a = draft || {}, miss = Q.filter(q => ![].concat(a[q.id] ?? []).length).length;
    return `<div class="card sk-quiz"><h2>${L.title}</h2><p class="muted">${L.intro}</p>
      ${Q.map((q, n) => `<div class="sk-q"><b>${n + 1}. ${tr(q.q)}</b>${q.multi ? ` <span class="faint small">(${L.multi})</span>` : ''}
        <div class="sk-opts">${q.o.map((o, i) => `<button class="chip ${[].concat(a[q.id] ?? []).includes(i) ? 'on' : ''}" data-a="sk-ans" data-q="${q.id}" data-i="${i}">${tr(o[0])}</button>`).join('')}</div></div>`).join('')}
      <div class="row" style="margin-top:14px"><span class="sp"></span>${miss ? `<span class="small muted">${L.missing(miss)}</span>` : ''}<button class="btn pri" data-a="sk-submit" ${miss ? 'disabled' : ''}>${L.go}</button></div></div>`;
  }
  function results() {
    const s = st(), ranked = score(s.answers), top = ranked.filter(([, v]) => v >= 3).slice(0, 6).map(([k]) => k);
    const areas = ['base', ...top.filter(k => k !== 'base')], rest = Object.keys(A).filter(k => !areas.includes(k));
    const max = Math.max(1, ...ranked.map(r => r[1])), sc = Object.fromEntries(ranked);
    const all = areas.flatMap(k => vids(k).map(v => [k, v]));
    if (!cur || !Object.keys(A).some(k => vids(k).some(v => v[0] === cur))) cur = (all.find(([, v]) => !s.watched[v[0]]) || all[0])[1][0];
    const [ak, v] = Object.keys(A).flatMap(k => vids(k).map(x => [k, x])).find(([, x]) => x[0] === cur);
    const row = (k, x) => `<div class="vid sk-vid ${x[0] === cur ? 'on' : ''}" data-a="sk-play" data-y="${x[0]}"><div class="th" style="background-image:url(https://i.ytimg.com/vi/${x[0]}/mqdefault.jpg)">${s.watched[x[0]] ? '<span>✓</span>' : ''}</div>
      <div style="min-width:0"><div class="ell"><b>${esc(x[1])}</b></div><div class="small faint ell">${esc(x[2])} · ${x[3]}${x[4] === 'en' && IT ? ` · <span class="sk-en">EN</span>` : ''}</div></div></div>`;
    const block = k => `<div class="sk-area" style="--c:${A[k].c}"><div class="row"><b>${tr(A[k].t)}</b><span class="sp"></span>${k !== 'base' ? `<div class="sk-bar"><i style="width:${(sc[k] || 0) / max * 100}%"></i></div>` : ''}</div>
      <div class="small muted" style="margin:2px 0 4px">${tr(A[k].why)}</div>${vids(k).map(x => row(k, x)).join('')}</div>`;
    const nW = Object.keys(s.watched).length;
    const tips = window.SKILLS_PREFILL?.tips ? `<div class="card sk-claude" style="margin-top:16px"><h2>${L.claude}</h2><ol>${window.SKILLS_PREFILL.tips.map(t => `<li><b>${esc(t[0])}</b> ${esc(t[1])}</li>`).join('')}</ol></div>` : '';
    return `<div class="grid" style="grid-template-columns:minmax(0,1.7fr) minmax(300px,1fr);align-items:start">
      <div><div class="card">
        <div class="yt"><iframe id="ytp" src="https://www.youtube-nocookie.com/embed/${v[0]}?rel=0&modestbranding=1&enablejsapi=1${IT ? '&hl=it' : ''}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
        <div class="row" style="margin-top:12px"><div style="min-width:0"><h2 style="margin:0">${esc(v[1])}</h2><div class="small muted">${esc(v[2])} · ${v[3]}${v[4] === 'en' && IT ? ' · ' + L.en : ''}</div></div><span class="sp"></span>
          <button class="btn sm ghost" data-a="yt-ext" data-y="${v[0]}">${L.yt}</button>
          <button class="btn sm ${s.watched[v[0]] ? '' : 'pri'}" data-a="sk-watched" data-y="${v[0]}">${s.watched[v[0]] ? '✓ ' + L.watched : L.markW}</button></div>
        <div class="sk-why" style="--c:${A[ak].c}"><div><span class="lbl">${tr(A[ak].t)}</span></div><div class="small"><b>${L.why}:</b> ${tr(A[ak].why)}</div><div class="small"><b>${L.todo}:</b> ${tr(A[ak].tip)}</div></div></div>
        ${tips}</div>
      <div class="card" style="max-height:82vh;overflow:auto"><div class="row"><h2 style="margin:0">${L.profile}</h2><span class="sp"></span><span class="small faint">${L.saved(nW)}</span></div>
        ${top.length ? '' : `<p class="small muted">${L.allGood}</p>`}
        ${areas.map(block).join('')}
        <details class="sk-more"><summary>${L.others}</summary>${rest.map(block).join('')}</details>
        <div class="row" style="margin-top:12px"><span class="small faint">${s.at ? L.answered(fmtDay(s.at, { day: 'numeric', month: 'long' })) : ''}</span><span class="sp"></span><button class="btn sm ghost" data-a="sk-redo">${L.redo}</button></div></div></div>`;
  }
  function view() { return answered(st().answers) && !draft ? results() : quiz(); }
  const tabs = () => `<div class="seg sk-tabs"><button class="${tab === 'lessons' ? 'on' : ''}" data-a="sk-tab" data-t="lessons">▶ ${L.tabLess}</button><button class="${tab === 'skills' ? 'on' : ''}" data-a="sk-tab" data-t="skills">🧠 ${L.tabSkill}</button></div>`;

  // Wrap the Video view ("video" in the Italian edition, "videos" in the English one).
  const key = V.video ? 'video' : 'videos', base = V[key];
  V[key] = () => {
    if (tab === 'skills') return `<div class="row"><h1>Video</h1><span class="sp"></span>${tabs()}</div>` + view();
    const html = base(); const i = html.indexOf('</h1>');
    return i < 0 ? tabs() + html : html.slice(0, i) + `</h1>${tabs()}` + html.slice(i + 5);
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a^="sk-"]'); if (!el) return;
    const d = el.dataset, s = st(), keep = () => { const vv = $('#view'), y = vv.scrollTop; render(); vv.scrollTop = y; };
    if (d.a === 'sk-tab') { tab = d.t; render(); }
    if (d.a === 'sk-ans') {
      draft ||= JSON.parse(JSON.stringify(s.answers || {}));
      const q = Q.find(x => x.id === d.q), i = +d.i;
      if (q.multi) { const cur2 = [].concat(draft[q.id] ?? []); const none = q.o.length - 1; let n = cur2.includes(i) ? cur2.filter(x => x !== i) : [...cur2.filter(x => i === none ? false : x !== none), i]; draft[q.id] = n; }
      else draft[q.id] = i;
      SFX.tick(0.4); keep();
    }
    if (d.a === 'sk-submit' && answered(draft)) { s.answers = draft; s.at = today(); draft = null; cur = null; save(); SFX.goal(); render(); $('#view').scrollTop = 0; }
    if (d.a === 'sk-redo') { draft = JSON.parse(JSON.stringify(s.answers || {})); render(); $('#view').scrollTop = 0; }
    if (d.a === 'sk-play') { cur = d.y; keep(); }
    if (d.a === 'sk-watched') { if (s.watched[d.y]) delete s.watched[d.y]; else { s.watched[d.y] = Date.now(); SFX.tick(0.7); } save(); keep(); }
  });
  return { Q, A, score, open: () => { tab = 'skills'; go(key); } };
})();

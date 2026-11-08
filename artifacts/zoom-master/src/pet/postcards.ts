import type { Lang } from "../i18n/translations";

type Bag = {
  hello: string[];
  miss: string[];
  day: string[];
  soft: string[];
  joke: string[];
};

const en: Bag = {
  hello: ["Hello.", "Hey.", "Hi.", "Oh, you.", "There you are.", "Psst.", "A little wave.", "Knock knock.", "Look who came.", "Hi hi."],
  miss: ["I missed you.", "You were gone a while.", "I kept your spot warm.", "The room was quiet without you.", "I saved you a crumb."],
  day: ["How is your day?", "What are you doing?", "Good day to you.", "A kind start, if the day is new.", "Good night, if the lamp is low.", "May the day stay gentle.", "How is the day treating you?"],
  soft: ["You are doing fine.", "Stay a minute.", "I am glad you opened this.", "A small life, kept.", "Hold the warm light.", "One crumb at a time.", "I like when you visit."],
  joke: [
    "Why did the crumb go to school? To get a little wiser.",
    "I tried to tell a joke. It came out warm.",
    "Are you a blanket? Because I rest better near you.",
    "What do you call a shy spark? A quiet hello.",
    "I would offer tea, but I only have crumbs.",
    "My favorite sport is waiting for you. I am very good at it.",
    "If I had pockets, I would keep a smile in one.",
    "Do not tell the night I said good morning. It gets jealous.",
    "I practiced waving. This letter is the wave.",
    "A pun walked in. I let it sit down.",
    "Why was the cookie calm? It had a chip on its shoulder, and it was fine.",
    "I counted to three. Then I wrote to you.",
    "You plus today equals a good idea.",
    "I am not lost. I am exactly where your letter is.",
    "Good night is just good day in a softer coat.",
    "I brought nothing but a sentence. It is yours.",
    "The moon asked how you are. I said I would ask.",
    "A small joke: I am shorter when I bow. Hello.",
    "If days were crumbs, I would share the warm one.",
    "I wrote this slowly, so it would last.",
    "What is a pet's favorite note? This one.",
    "I saved the last hello for you.",
    "Even a quiet day can say something kind.",
    "I hope your pockets feel light and lucky.",
  ],
};

const it: Bag = {
  hello: ["Ciao.", "Ehi.", "Oh, sei tu.", "Eccomi.", "Guarda chi c'è.", "Psst.", "Un piccolo saluto.", "Toc toc.", "Sei arrivato.", "Ciao ciao."],
  miss: ["Mi sei mancato.", "Sei stato via un po'.", "Ti ho tenuto il posto caldo.", "La stanza era quieta senza di te.", "Ti ho tenuto una briciola."],
  day: ["Come va la giornata?", "Che fai?", "Buona giornata.", "Buon inizio, se il giorno è nuovo.", "Buonanotte, se la luce è bassa.", "Che la giornata resti gentile.", "Come ti tratta oggi?"],
  soft: ["Stai andando bene.", "Resta un minuto.", "Sono contento che tu l'abbia aperta.", "Una vita piccola, tenuta bene.", "Tieni la luce calda.", "Una briciola alla volta.", "Mi piace quando passi."],
  joke: [
    "Perché la briciola va a scuola? Per diventare un poco più saggia.",
    "Ho provato una barzelletta. È uscita calda.",
    "Sei una coperta? Vicino a te riposo meglio.",
    "Come si chiama una scintilla timida? Un ciao piano.",
    "Ti offrirei un tè, ma ho solo briciole.",
    "Il mio sport è aspettarti. Sono bravissimo.",
    "Se avessi le tasche, terrei un sorriso in una.",
    "Non dire alla notte che ho detto buongiorno. Si ingelosisce.",
    "Ho provato a salutare. Questa lettera è il saluto.",
    "È entrata una freddura. L'ho fatta sedere.",
    "Perché il biscotto è calmo? Ha una goccia di cioccolato, e gli sta bene.",
    "Ho contato fino a tre. Poi ti ho scritto.",
    "Tu più oggi fa una buona idea.",
    "Non mi sono perso. Sono proprio dove sta la tua lettera.",
    "Buonanotte è buongiorno con un cappotto più morbido.",
    "Non ho portato nulla, solo una frase. È tua.",
    "La luna ha chiesto come stai. Ho detto che te lo chiedevo.",
    "Freddura piccola: quando mi inchino sono più basso. Ciao.",
    "Se i giorni fossero briciole, ti darei quello caldo.",
    "L'ho scritta piano, così dura di più.",
    "Qual è la nota preferita di un pet? Questa.",
    "Ho tenuto l'ultimo ciao per te.",
    "Anche un giorno quieto può dire una cosa gentile.",
    "Spero che le tasche ti sembrino leggere e fortunate.",
  ],
};

function linesOf(bag: Bag, name: string, italian: boolean): string[] {
  const out: string[] = [];
  for (const hello of bag.hello) {
    for (const line of [...bag.miss, ...bag.day, ...bag.soft]) out.push(`${hello} ${line}`);
  }
  for (const joke of bag.joke) out.push(joke);
  out.push(italian ? `${name} ti pensa.` : `${name} is thinking of you.`);
  return out;
}

const cache = new Map<string, string[]>();

function pack(lang: Lang, name: string): string[] {
  const key = `${lang}:${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const italian = lang === "it";
  const bag = italian ? it : en;
  const lines = linesOf(bag, name, italian).filter((line, index, all) => all.indexOf(line) === index);
  cache.set(key, lines);
  return lines;
}

/** One postcard line. There are more than 200, and the recent ones stay away. */
export function postcardLine(lang: Lang, name: string, avoid: number[]): { id: number; text: string } {
  const lines = pack(lang, name);
  const blocked = new Set(avoid);
  let id = Math.floor(Math.random() * lines.length);
  for (let n = 0; n < 12 && blocked.has(id); n++) id = (id + 1) % lines.length;
  return { id, text: lines[id] };
}

export function postcardCount(lang: Lang, name: string): number {
  return pack(lang, name).length;
}

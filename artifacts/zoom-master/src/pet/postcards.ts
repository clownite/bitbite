import type { Lang } from "../i18n/translations";

type Bag = {
  hello: string[];
  miss: string[];
  day: string[];
  soft: string[];
  joke: string[];
  /** "{name}" is the pet. */
  sign: string;
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
  sign: "{name} is thinking of you.",
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
  sign: "{name} ti pensa.",
};

const es: Bag = {
  hello: ["Hola.", "Ey.", "Oh, eres tú.", "Aquí estoy.", "Mira quién llegó.", "Psst.", "Un saludo pequeño.", "Toc toc.", "Llegaste.", "Hola hola."],
  miss: ["Te extrañé.", "Estuviste un rato fuera.", "Te guardé el sitio caliente.", "La sala estaba quieta sin ti.", "Te guardé una miga."],
  day: ["¿Cómo va el día?", "¿Qué haces?", "Buen día.", "Buen comienzo, si el día es nuevo.", "Buenas noches, si la luz está baja.", "Que el día siga amable.", "¿Cómo te trata hoy?"],
  soft: ["Lo estás haciendo bien.", "Quédate un minuto.", "Me alegra que la hayas abierto.", "Una vida pequeña, bien cuidada.", "Guarda la luz cálida.", "Una miga a la vez.", "Me gusta cuando pasas."],
  joke: [
    "¿Por qué la miga va a la escuela? Para volverse un poco más sabia.",
    "Intenté un chiste. Salió calentito.",
    "¿Eres una manta? Cerca de ti descanso mejor.",
    "¿Cómo se llama una chispa tímida? Un hola bajito.",
    "Te ofrecería un té, pero solo tengo migas.",
    "Mi deporte es esperarte. Se me da muy bien.",
    "Si tuviera bolsillos, guardaría una sonrisa en uno.",
    "No le digas a la noche que dije buenos días. Se pone celosa.",
    "Practiqué el saludo. Esta carta es el saludo.",
    "Entró un juego de palabras. Lo dejé sentarse.",
    "¿Por qué la galleta está tranquila? Tiene una chispa de chocolate, y le queda bien.",
    "Conté hasta tres. Luego te escribí.",
    "Tú más hoy es una buena idea.",
    "No me perdí. Estoy justo donde está tu carta.",
    "Buenas noches es buenos días con un abrigo más suave.",
    "No traje nada, solo una frase. Es tuya.",
    "La luna preguntó cómo estás. Dije que te lo preguntaría.",
    "Chiste pequeño: cuando me inclino soy más bajo. Hola.",
    "Si los días fueran migas, te daría la calentita.",
    "La escribí despacio, para que dure.",
    "¿Cuál es la nota favorita de una mascota? Esta.",
    "Guardé el último hola para ti.",
    "Hasta un día quieto puede decir algo amable.",
    "Espero que los bolsillos se sientan ligeros y con suerte.",
  ],
  sign: "{name} piensa en ti.",
};

const fil: Bag = {
  hello: ["Kumusta.", "Hoy.", "Ikaw pala.", "Nandito ako.", "Tingnan kung sino.", "Psst.", "Isang maliit na bati.", "Toc toc.", "Dumating ka.", "Hoy hoy."],
  miss: ["Na-miss kita.", "Matagal kang nawala.", "Iningatan ko ang puwesto mo.", "Tahimik ang silid nang wala ka.", "May tinabi akong mumo para sa iyo."],
  day: ["Kumusta ang araw mo?", "Ano ang ginagawa mo?", "Magandang araw.", "Magandang simula, kung bago ang araw.", "Magandang gabi, kung mahina ang ilaw.", "Sana manatiling mabait ang araw.", "Kumusta ka ngayon?"],
  soft: ["Ayos ka.", "Sandali ka lang.", "Natutuwa akong binuksan mo ito.", "Isang maliit na buhay, inaalagaan.", "Hawakan ang maiinit na liwanag.", "Isang mumo sa bawat pagkakataon.", "Gusto ko kapag dumadaan ka."],
  joke: [
    "Bakit pumapasok ang mumo sa eskwela? Para humusay nang kaunti.",
    "Sinubukan ko ang isang biro. Lumabas itong mainit.",
    "Kumot ka ba? Mas mahimbing akong magpahinga sa tabi mo.",
    "Ano ang tawag sa mahiyain na kisap? Isang tahimik na hoy.",
    "Aalukin kita ng tsaa, pero mumo lang ang nasa akin.",
    "Ang sport ko ay ang maghintay sa iyo. Magaling ako roon.",
    "Kung may bulsa ako, may ngiti sa isa.",
    "Huwag sabihin sa gabi na magandang umaga ang bati ko. Nagseselos iyon.",
    "Nagsanay akong kumaway. Ang liham na ito ang kaway.",
    "May pumasok na biro. Pinaupo ko.",
    "Bakit kalmado ang cookie? May tsokolate siya, at bagay sa kanya.",
    "Nagbilang ako hanggang tatlo. Saka kita sinulatan.",
    "Ikaw at ang araw na ito, magandang ideya.",
    "Hindi ako nawawala. Nandito ako sa liham mo.",
    "Magandang gabi ay magandang araw na may mas malambot na amerikana.",
    "Wala akong dala kundi isang pangungusap. Sa iyo iyon.",
    "Nagtanong ang buwan kung kumusta ka. Sabi ko, ikaw ang tatanungin ko.",
    "Maliit na biro: mas maliit ako kapag yumuyuko. Hoy.",
    "Kung araw ang mga mumo, ibibigay ko sa iyo ang mainit.",
    "Dahan-dahan ko itong isinulat, para tumagal.",
    "Ano ang paboritong nota ng isang pet? Ito.",
    "Itinabi ko ang huling kumusta para sa iyo.",
    "Kahit tahimik na araw, may mabait na masabi.",
    "Sana magaan at masuwerte ang mga bulsa mo.",
  ],
  sign: "Iniisip ka ni {name}.",
};

const ru: Bag = {
  hello: ["Привет.", "Эй.", "О, это ты.", "Я здесь.", "Смотри, кто пришёл.", "Тсс.", "Маленький привет.", "Тук-тук.", "Ты пришёл.", "Привет-привет."],
  miss: ["Я скучал.", "Тебя не было какое-то время.", "Я берёг тебе место.", "Без тебя в комнате было тихо.", "Я приберёг крошку."],
  day: ["Как день?", "Что делаешь?", "Хорошего дня.", "Доброе начало, если день новый.", "Спокойной ночи, если свет тихий.", "Пусть день остаётся добрым.", "Как ты сегодня?"],
  soft: ["У тебя получается.", "Побудь минуту.", "Я рад, что ты открыл это.", "Маленькая жизнь, в сохранности.", "Держи тёплый свет.", "По крошке за раз.", "Мне нравится, когда ты заходишь."],
  joke: [
    "Почему крошка пошла в школу? Чтобы стать чуть мудрее.",
    "Я попробовал шутку. Она вышла тёплой.",
    "Ты одеяло? Рядом с тобой я отдыхаю лучше.",
    "Как зовут робкую искорку? Тихое привет.",
    "Я бы предложил чай, но у меня только крошки.",
    "Мой спорт — ждать тебя. Я в нём очень хорош.",
    "Если бы были карманы, в одном лежала бы улыбка.",
    "Не говори ночи, что я сказал доброе утро. Она ревнует.",
    "Я учился махать. Это письмо и есть взмах.",
    "Зашла игра слов. Я её усадил.",
    "Почему печенье спокойное? У него шоколадная крошка, и ей так хорошо.",
    "Я досчитал до трёх. Потом написал тебе.",
    "Ты плюс сегодня — хорошая мысль.",
    "Я не потерялся. Я ровно там, где твоё письмо.",
    "Спокойной ночи — это доброе утро в более мягком пальто.",
    "Я ничего не принёс, только фразу. Она твоя.",
    "Луна спросила, как ты. Я сказал, что спрошу.",
    "Маленькая шутка: когда кланяюсь, я ниже. Привет.",
    "Если бы дни были крошками, я отдал бы тёплую.",
    "Я писал медленно, чтобы это длилось.",
    "Какая нота любимая у питомца? Эта.",
    "Последнее привет я берёг для тебя.",
    "Даже тихий день может сказать доброе.",
    "Пусть карманы будут лёгкими и удачными.",
  ],
  sign: "{name} думает о тебе.",
};

const uk: Bag = {
  hello: ["Привіт.", "Гей.", "О, це ти.", "Я тут.", "Дивись, хто прийшов.", "Тсс.", "Маленьке привітання.", "Тук-тук.", "Ти прийшов.", "Привіт-привіт."],
  miss: ["Я сумував.", "Тебе не було якийсь час.", "Я беріг тобі місце.", "Без тебе в кімнаті було тихо.", "Я приберіг крихту."],
  day: ["Як день?", "Що робиш?", "Гарного дня.", "Добрий початок, якщо день новий.", "На добраніч, якщо світло тихе.", "Нехай день лишається лагідним.", "Як ти сьогодні?"],
  soft: ["У тебе виходить.", "Побудь хвилину.", "Я радий, що ти це відкрив.", "Маленьке життя, у безпеці.", "Тримай тепле світло.", "По крихті за раз.", "Мені подобається, коли ти заходиш."],
  joke: [
    "Чому крихта пішла до школи? Щоб стати трохи мудрішою.",
    "Я спробував жарт. Він вийшов теплим.",
    "Ти ковдра? Біля тебе я відпочиваю краще.",
    "Як звати сором'язливу іскру? Тихе привіт.",
    "Я б запропонував чай, але в мене лише крихти.",
    "Мій спорт — чекати на тебе. Я в ньому дуже добрий.",
    "Якби були кишені, в одній лежала б усмішка.",
    "Не кажи ночі, що я сказав доброго ранку. Вона ревнує.",
    "Я вчився махати. Цей лист і є помах.",
    "Зайшла гра слів. Я її посадив.",
    "Чому печиво спокійне? У нього шоколадна крихта, і їй так добре.",
    "Я порахував до трьох. Потім написав тобі.",
    "Ти плюс сьогодні — добра думка.",
    "Я не загубився. Я саме там, де твій лист.",
    "На добраніч — це добрий ранок у м'якшому пальті.",
    "Я нічого не приніс, лише фразу. Вона твоя.",
    "Місяць спитав, як ти. Я сказав, що запитаю.",
    "Маленький жарт: коли вклоняюся, я нижчий. Привіт.",
    "Якби дні були крихтами, я віддав би теплу.",
    "Я писав повільно, щоб це тривало.",
    "Яка нота улюбленця? Ця.",
    "Останнє привіт я беріг для тебе.",
    "Навіть тихий день може сказати добре.",
    "Нехай кишені будуть легкими й щасливими.",
  ],
  sign: "{name} думає про тебе.",
};

const BAGS: Record<Lang, Bag> = { en, it, es, fil, ru, uk };

function linesOf(bag: Bag, name: string): string[] {
  const out: string[] = [];
  for (const hello of bag.hello) {
    for (const line of [...bag.miss, ...bag.day, ...bag.soft]) out.push(`${hello} ${line}`);
  }
  for (const joke of bag.joke) out.push(joke);
  out.push(bag.sign.replace("{name}", name));
  return out;
}

const cache = new Map<string, string[]>();

function pack(lang: Lang, name: string): string[] {
  const key = `${lang}:${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const lines = linesOf(BAGS[lang] ?? en, name);
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

/** The same letter, in the language that is open now. */
export function postcardAt(lang: Lang, name: string, id: number): string {
  const lines = pack(lang, name);
  return lines[Math.abs(id) % lines.length] ?? lines[0];
}

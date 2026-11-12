export type FamilyId = "water" | "fire" | "grass" | "electric";

export type KinName = { it: string; en: string };

/** Ten adults in each family. The first is the one a new line grows into. */
export const KIN: Record<FamilyId, KinName[]> = {
  water: [
    { it: "Foca", en: "Seal" },
    { it: "Lontra", en: "Otter" },
    { it: "Pinguino", en: "Penguin" },
    { it: "Balena", en: "Whale" },
    { it: "Axolotl", en: "Axolotl" },
    { it: "Delfino", en: "Dolphin" },
    { it: "Medusa", en: "Jelly" },
    { it: "Granchio", en: "Crab" },
    { it: "Ippocampo", en: "Seahorse" },
    { it: "Orca", en: "Orca" },
  ],
  fire: [
    { it: "Pulcino", en: "Chick" },
    { it: "Volpe", en: "Fox" },
    { it: "Panda rosso", en: "Red panda" },
    { it: "Drago", en: "Dragon" },
    { it: "Fenice", en: "Phoenix" },
    { it: "Leone", en: "Lion" },
    { it: "Falco", en: "Hawk" },
    { it: "Tigre", en: "Tiger" },
    { it: "Salamandra", en: "Salamander" },
    { it: "Lucertola", en: "Lizard" },
  ],
  grass: [
    { it: "Lince", en: "Lynx" },
    { it: "Coniglio", en: "Rabbit" },
    { it: "Rana", en: "Frog" },
    { it: "Tartaruga", en: "Turtle" },
    { it: "Riccio", en: "Hedgehog" },
    { it: "Orso", en: "Bear" },
    { it: "Procione", en: "Raccoon" },
    { it: "Koala", en: "Koala" },
    { it: "Panda", en: "Panda" },
    { it: "Capra", en: "Goat" },
  ],
  electric: [
    { it: "Cerbiatto", en: "Fawn" },
    { it: "Gufo", en: "Owl" },
    { it: "Ape", en: "Bee" },
    { it: "Scoiattolo", en: "Squirrel" },
    { it: "Unicorno", en: "Unicorn" },
    { it: "Pipistrello", en: "Bat" },
    { it: "Topo", en: "Mouse" },
    { it: "Zebra", en: "Zebra" },
    { it: "Canguro", en: "Kangaroo" },
    { it: "Camaleonte", en: "Chameleon" },
  ],
};

export function kinName(family: FamilyId, index: number, lang: string): string {
  const list = KIN[family];
  const item = list[Math.min(list.length - 1, Math.max(0, index))] ?? list[0];
  return lang === "it" ? item.it : item.en;
}

import "server-only";

const dictionaries = {
  pt: () => import("./dictionaries/pt.json").then((module) => module.default),
  en: () => import("./dictionaries/en.json").then((module) => module.default),
};

type SupportedLocale = keyof typeof dictionaries;

export const getDictionary = async (locale: string) => {
  const normalizedLocale: SupportedLocale = locale === "en" ? "en" : "pt";
  return dictionaries[normalizedLocale]();
};

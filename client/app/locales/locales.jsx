import { findLocale } from "@/locales/config";
import Cookies from "js-cookie";

const langs = ["en-US", "zh-CN"];

const getLang = () => {
  let lang = Cookies.get("lang");
  if (!langs.includes(lang)) {
    lang = navigator.language || navigator.userLanguage;
    if (!langs.includes(lang)) {
      lang = "en-US";
    }
    Cookies.set("lang", lang);
  }
  return lang;
};

getLang();

export function gettext(string, ...args) {
  const lang = getLang();
  const fLocal = findLocale(lang);
  if (!fLocal) {
    return string;
  }
  const locale = fLocal.locale;
  if (!locale) {
    return string;
  } else {
    const tran = locale[string];
    if (!tran) return string;
    else return tran;
  }
}

export const t = gettext;

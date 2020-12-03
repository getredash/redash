import _ from "lodash";
import zh_CN from "@/locales/zh_CN";

export function localeList() {
  return [
    {
      code: "zh-CN",
      name: "中文",
      locale: zh_CN,
    },
    {
      code: "en-US",
      name: "English",
    },
  ];
}

export function findLocale(code) {
  return _.find(localeList(), ["code", code]);
}

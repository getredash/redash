const units = ["", "K", "M", "B", "T", "P", "E"];

export function formatNumber(v1: number) {
  const [, expNum, expSuffix] = /^(.+)(e\+.+)$/.exec(v1.toString()) || [];

  const v = Number(Number(expNum || v1).toFixed(2));

  const tier = (Math.log10(Math.abs(v)) / 3) | 0;

  if (tier == 0) return v.toString() + (expSuffix || "");

  const suffix = expSuffix || units[tier];
  const scale = Math.pow(10, tier * 3);

  const scaled = v / scale;

  let num;
  if (scaled % 1) {
    const val = scaled.toFixed(1);
    num = val.split(".")[1] === "0" ? val.split(".")[0] : val;
  } else {
    num = scaled;
  }

  // console.log({ v1, v, scaled, num, suffix });

  return num + suffix;
}

export const PositiveDecimalRegex = /^(([1-9]\d*(\.\d+)?)|(\d{1,3}(,\d{3})*(\.\d+)?)|(0\.\d+))$/;

export const numValueOrDefault = (v: number | string | undefined | null, def: number, _debugName?: string) => {
  const v1 = v === undefined || v === "" || v === null || isNaN(Number(v)) ? def : Number(v);
  //console.log({ v, v1, d: _debugName });
  return v1;
};

import DefaultPolicy from "./DefaultPolicy";

export let policy = new DefaultPolicy();

export function setPolicy(newPolicy) {
  policy = newPolicy;
}

import DefaultPolicy from "./DefaultPolicy";

// eslint-disable-next-line import/no-mutable-exports
export let policy = new DefaultPolicy();

export function setPolicy(newPolicy) {
  policy = newPolicy;
}

import DefaultPolicy from './DefaultPolicy';
import UserPolicy from './UserPolicy';

// eslint-disable-next-line import/no-mutable-exports
export let policy = new DefaultPolicy();
export const userPolicy = new UserPolicy();

export function setPolicy(newPolicy) {
  policy = newPolicy;
}

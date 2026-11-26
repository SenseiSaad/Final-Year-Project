/* Opens the early-access dialog from anywhere on the site */
export const EARLY_ACCESS_EVENT = "early-access:open";

export function openEarlyAccess() {
  window.dispatchEvent(new Event(EARLY_ACCESS_EVENT));
}

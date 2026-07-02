/**
 * Escapes special regex characters in a string to prevent ReDoS and regex injections
 */
export const escapeRegex = (value: string): string => {
  return value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

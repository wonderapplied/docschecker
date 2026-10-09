// Operator details shown in the Privacy Policy and Terms. Set these before launch.
export const LEGAL = {
  operator: process.env.NEXT_PUBLIC_OPERATOR_NAME || "[OPERATOR NAME]",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "[CONTACT EMAIL]",
  governingState: process.env.NEXT_PUBLIC_GOVERNING_STATE || "[STATE]",
  /** Bump when the Terms or Privacy Policy change in a way users must re-accept. */
  version: "2026-10-09",
  effectiveDate: "October 9, 2026",
};

export const MIN_AGE = 13;

/** Set after the age question, read once at Google sign-in. */
export const AGE_OK_COOKIE = "age_ok";
/** Set when the age question comes back under the minimum, so the form can't simply be retried. */
export const AGE_BLOCKED_COOKIE = "age_blocked";

/**
 * Age in whole years from a birth month and year. With no day, someone born this month
 * is treated as not having had their birthday yet.
 */
export function ageFrom(birthYear: number, birthMonth: number, now = new Date()): number {
  const age = now.getFullYear() - birthYear;
  return birthMonth < now.getMonth() + 1 ? age : age - 1;
}

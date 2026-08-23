/**
 * Client-safe password strength evaluator.
 *
 * No Node.js `crypto` imports — safe to use in "use client" components.
 */

// ─── Top 50 Common Passwords ────────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
  "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
  "ashley", "bailey", "passw0rd", "shadow", "123123", "654321", "superman",
  "qazwsx", "michael", "football", "password1", "password123", "welcome",
  "jesus", "ninja", "mustang", "password2", "amanda", "joshua", "charlie",
  "andrew", "starwars", "access", "flower", "hottie", "loveme", "zaq1zaq1",
  "hello", "admin", "princess", "login", "welcome1", "solo", "abcdef",
  "1q2w3e4r",
]);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PasswordStrength {
  /** 0 = very weak, 1 = weak, 2 = fair, 3 = strong, 4 = very strong */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** Tailwind color class for the strength bar */
  color: string;
  /** Actionable suggestions to improve */
  suggestions: string[];
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Very Weak", color: "bg-red-500", suggestions: ["Enter a password"] };
  }

  const suggestions: string[] = [];
  let points = 0;

  // ── Common password check ──────────────────────────────────────────────
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      score: 0,
      label: "Very Weak",
      color: "bg-red-500",
      suggestions: ["This is a commonly used password — choose something unique"],
    };
  }

  // ── Length scoring ─────────────────────────────────────────────────────
  const len = password.length;
  if (len >= 16) {
    points += 3;
  } else if (len >= 12) {
    points += 2;
  } else if (len >= 8) {
    points += 1;
  } else {
    suggestions.push("Use at least 8 characters");
  }

  if (len < 12) {
    suggestions.push("12+ characters recommended for strong security");
  }

  // ── Character variety ─────────────────────────────────────────────────
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (varietyCount >= 4) {
    points += 2;
  } else if (varietyCount >= 3) {
    points += 1.5;
  } else if (varietyCount >= 2) {
    points += 1;
  }

  if (!hasUpper) suggestions.push("Add uppercase letters");
  if (!hasDigit) suggestions.push("Add numbers");
  if (!hasSymbol) suggestions.push("Add symbols (!@#$%...)");

  // ── Repetition penalty ────────────────────────────────────────────────
  const repeats = password.match(/(.)\1{2,}/g);
  if (repeats) {
    points -= 0.5;
    suggestions.push("Avoid repeated characters");
  }

  // ── Sequential penalty ────────────────────────────────────────────────
  const sequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i;
  if (sequential.test(password)) {
    points -= 0.5;
    suggestions.push("Avoid sequential characters (abc, 123)");
  }

  // ── Map to score ──────────────────────────────────────────────────────
  const clampedPoints = Math.max(0, Math.min(5, points));
  let score: PasswordStrength["score"];
  let label: string;
  let color: string;

  if (clampedPoints < 1) {
    score = 0; label = "Very Weak"; color = "bg-red-500";
  } else if (clampedPoints < 2) {
    score = 1; label = "Weak"; color = "bg-orange-500";
  } else if (clampedPoints < 3) {
    score = 2; label = "Fair"; color = "bg-yellow-500";
  } else if (clampedPoints < 4.5) {
    score = 3; label = "Strong"; color = "bg-green-500";
  } else {
    score = 4; label = "Very Strong"; color = "bg-emerald-500";
  }

  return { score, label, color, suggestions: suggestions.slice(0, 3) };
}

import { randomInt } from 'crypto';

const LETTERS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALL = LETTERS + DIGITS;

/** Kamida bitta harf va bitta raqam bo'lgan kriptografik tasodifiy parol. */
export function generateRandomPassword(length = 8): string {
  const pick = (chars: string) => chars[randomInt(chars.length)];
  const chars = [pick(LETTERS), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

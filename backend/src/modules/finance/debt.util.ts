export interface DebtInput {
  /** Kursning oylik narxi */
  price: number;
  durationMonth: number;
  /** Hisoblash boshlanadigan sana: guruh boshlanishi va a'zolik sanasidan keyingisi */
  from: Date;
  now: Date;
  /** Shu a'zolik bo'yicha COMPLETED to'lovlar yig'indisi */
  paid: number;
}

export interface DebtResult {
  monthsDue: number;
  expected: number;
  paid: number;
  debt: number;
}

/**
 * Necha oylik to'lov muddati kelgan: boshlanish oyi ham hisoblanadi
 * (darsga kelgan zahoti shu oy uchun to'lov kerak), kurs davomiyligidan oshmaydi.
 */
export function monthsDue(from: Date, now: Date, durationMonth: number): number {
  if (from.getTime() > now.getTime()) return 0;
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months -= 1;
  return Math.min(Math.max(months, 0) + 1, Math.max(durationMonth, 1));
}

/** Qarz = (muddati kelgan oylar × oylik narx) − to'langan summa; manfiy bo'lmaydi. */
export function computeDebt(input: DebtInput): DebtResult {
  const months = monthsDue(input.from, input.now, input.durationMonth);
  const expected = months * input.price;
  return {
    monthsDue: months,
    expected,
    paid: input.paid,
    debt: Math.max(expected - input.paid, 0),
  };
}

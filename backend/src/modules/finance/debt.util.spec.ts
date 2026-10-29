import { computeDebt, monthsDue } from './debt.util';

const d = (s: string) => new Date(s);

describe('monthsDue', () => {
  it("guruh hali boshlanmagan bo'lsa 0", () => {
    expect(monthsDue(d('2026-11-01'), d('2026-10-28'), 6)).toBe(0);
  });
  it('boshlangan oy hisoblanadi', () => {
    expect(monthsDue(d('2026-10-01'), d('2026-10-28'), 6)).toBe(1);
  });
  it("to'liq oy o'tgach keyingi oy qo'shiladi", () => {
    expect(monthsDue(d('2026-09-15'), d('2026-10-15'), 6)).toBe(2);
    expect(monthsDue(d('2026-09-15'), d('2026-10-14'), 6)).toBe(1);
  });
  it('kurs davomiyligidan oshmaydi', () => {
    expect(monthsDue(d('2025-01-01'), d('2026-10-28'), 6)).toBe(6);
  });
});

describe('computeDebt', () => {
  const base = { price: 1_200_000, durationMonth: 6, from: d('2026-09-01'), now: d('2026-10-28') };

  it("to'lamagan talaba 2 oylik qarzdor", () => {
    expect(computeDebt({ ...base, paid: 0 })).toMatchObject({ monthsDue: 2, expected: 2_400_000, debt: 2_400_000 });
  });
  it('qisman to`lagan — qoldiq', () => {
    expect(computeDebt({ ...base, paid: 1_200_000 }).debt).toBe(1_200_000);
  });
  it("ortiqcha to'lagan — qarz 0 (manfiy emas)", () => {
    expect(computeDebt({ ...base, paid: 5_000_000 }).debt).toBe(0);
  });
});

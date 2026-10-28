/** Majburiy env o'zgaruvchilar yo'q bo'lsa ilova ishga tushmaydi (13.3). */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SUPERADMIN_EMAIL',
    'SUPERADMIN_PASSWORD',
  ];
  const missing = required.filter((key) => !String(config[key] ?? '').trim());
  if (missing.length) {
    throw new Error(`Majburiy env o'zgaruvchilar topilmadi: ${missing.join(', ')}`);
  }
  if (String(config.JWT_SECRET).length < 32) {
    throw new Error("JWT_SECRET kamida 32 belgidan iborat bo'lishi kerak");
  }
  if (String(config.SUPERADMIN_PASSWORD).length < 8) {
    throw new Error("SUPERADMIN_PASSWORD kamida 8 belgidan iborat bo'lishi kerak");
  }
  return config;
}

/** localStorage puede no estar disponible (modo privado, datos bloqueados): nunca debe romper la app. */
export function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento: la preferencia simplemente no se recuerda.
  }
}

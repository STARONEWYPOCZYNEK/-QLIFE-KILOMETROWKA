function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type PresetKey = "dzien" | "tydzien" | "miesiac" | "kwartal" | "rok";

export const PRESET_LABELS: Record<PresetKey, string> = {
  dzien: "Dzień",
  tydzien: "Tydzień",
  miesiac: "Miesiąc",
  kwartal: "Kwartał",
  rok: "Rok",
};

export function presetRange(preset: PresetKey, todayIso: string): { od: string; do: string } {
  const today = new Date(`${todayIso}T00:00:00Z`);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();

  switch (preset) {
    case "dzien":
      return { od: todayIso, do: todayIso };
    case "tydzien": {
      const dayOfWeek = (today.getUTCDay() + 6) % 7; // 0 = poniedziałek
      const monday = new Date(today);
      monday.setUTCDate(today.getUTCDate() - dayOfWeek);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      return { od: iso(monday), do: iso(sunday) };
    }
    case "miesiac":
      return { od: iso(new Date(Date.UTC(y, m, 1))), do: iso(new Date(Date.UTC(y, m + 1, 0))) };
    case "kwartal": {
      const quarterStartMonth = Math.floor(m / 3) * 3;
      return {
        od: iso(new Date(Date.UTC(y, quarterStartMonth, 1))),
        do: iso(new Date(Date.UTC(y, quarterStartMonth + 3, 0))),
      };
    }
    case "rok":
      return { od: iso(new Date(Date.UTC(y, 0, 1))), do: iso(new Date(Date.UTC(y, 11, 31))) };
  }
}

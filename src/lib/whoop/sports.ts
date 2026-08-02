/** Best-effort emoji for a WHOOP sport, keyed on the v2 sport_name. */
export function sportEmoji(sportName: string | null | undefined): string {
  const name = (sportName ?? "").toLowerCase();
  if (name.includes("run")) return "🏃";
  if (name.includes("weight") || name.includes("strength") || name.includes("lift"))
    return "🏋️";
  if (name.includes("cycl") || name.includes("bik") || name.includes("spin"))
    return "🚴";
  if (name.includes("walk") || name.includes("hik")) return "🚶";
  if (name.includes("swim")) return "🏊";
  if (name.includes("yoga") || name.includes("pilates") || name.includes("stretch"))
    return "🧘";
  if (name.includes("tennis") || name.includes("padel") || name.includes("squash"))
    return "🎾";
  if (name.includes("soccer") || name.includes("football")) return "⚽";
  if (name.includes("basketball")) return "🏀";
  if (name.includes("golf")) return "⛳";
  if (name.includes("row")) return "🚣";
  if (name.includes("climb") || name.includes("boulder")) return "🧗";
  if (name.includes("box") || name.includes("martial") || name.includes("mma"))
    return "🥊";
  if (name.includes("ski") || name.includes("snowboard")) return "⛷️";
  if (name.includes("meditat") || name.includes("breath")) return "🧘";
  return "💪";
}

export function formatSportName(sportName: string | null | undefined): string {
  if (!sportName) return "Workout";
  return sportName
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

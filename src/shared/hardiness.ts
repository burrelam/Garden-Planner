/**
 * Reading a plant's USDA zone range against the garden's own zone.
 *
 * This is the one question hardiness answers: will the thing live through the
 * winter where she is. It has nothing to do with when anything is sown — that
 * is the frost dates' job, and the two are kept apart on purpose.
 */

export type HardinessTone = "safe" | "edge" | "cold" | "warm";

export interface HardinessVerdict {
  tone: HardinessTone;
  text: string;
}

/**
 * A USDA zone as a sortable number: "5a" -> 10, "5b" -> 11, "10b" -> 21. Half
 * zones are 5F apart, so one step of this is one half zone of winter cold.
 * Returns null for anything that is not a zone, since the field is free text
 * and a gardener can type whatever she likes into it.
 */
export function zoneRank(zone: string): number | null {
  const match = /^(\d{1,2})([ab])?$/.exec(zone.trim().toLowerCase());
  if (!match) return null;
  const number = Number(match[1]);
  if (number < 1 || number > 13) return null;
  return number * 2 + (match[2] === "b" ? 1 : 0);
}

/**
 * What a plant's zone range means for this particular garden. Null when either
 * side is missing or unparseable: a comparison we cannot actually make should
 * say nothing rather than guess.
 */
export function hardinessVerdict(
  range: { min: string; max: string },
  gardenZone: string,
): HardinessVerdict | null {
  const low = zoneRank(range.min);
  const high = zoneRank(range.max);
  const mine = zoneRank(gardenZone);
  if (low === null || high === null || mine === null) return null;
  if (mine < low)
    return {
      tone: "cold",
      text: `Too cold in ${gardenZone} — it needs ${range.min} or milder to live through the winter.`,
    };
  if (mine > high)
    return {
      tone: "warm",
      text: `Warmer than it likes in ${gardenZone} — it is happiest up to ${range.max}.`,
    };
  // One half zone of margin is thin enough to be worth saying out loud: a hard
  // winter is exactly the year it goes wrong.
  if (mine - low <= 1)
    return {
      tone: "edge",
      text: `Just inside its range in ${gardenZone}. A hard winter may take it, so give it shelter or a pot that can come in.`,
    };
  return {
    tone: "safe",
    text: `Hardy in your ${gardenZone} — it should come back each year.`,
  };
}

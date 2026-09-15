import type { Phase } from "./model";
import type { TimelineSlot } from "./timing";

/**
 * What a tapped pill says. The calendar draws a pill and the row's tooltip
 * whispers its meaning, which a phone never shows — so tapping one opens a
 * bubble instead, and this is what goes in it.
 *
 * The wording lives here rather than in the component so it can be read and
 * tested on its own: it is the part a gardener actually reads.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** A half-month slot said out loud: 0 is the first half of January. */
export function slotWords(slot: number) {
  return `${slot % 2 ? "late" : "early"} ${MONTHS[Math.floor(slot / 2)]}`;
}

/**
 * The stretch a run of slots covers, in words rather than slot numbers.
 * One slot says itself; a run says where it starts and where it ends.
 */
export function slotRangeWords(start: number, end: number) {
  return start === end
    ? slotWords(start)
    : `${slotWords(start)} to ${slotWords(end)}`;
}

/**
 * How far the phase under your finger runs either side of the slot you tapped.
 *
 * A gardener tapping the middle of a green band is asking about the whole band,
 * not about that one fortnight, so the bubble has to widen out to the run's own
 * edges. Runs are walked on phase alone and deliberately not on variant: a
 * lettuce harvest that is guideline for a fortnight and then actual is still
 * one picking, and splitting it at the point the colour changes would answer a
 * question nobody asked.
 *
 * The year does not wrap here. A planting that crosses New Year is already two
 * runs on the drawn calendar, and joining them would make a bubble tapped in
 * January claim a stretch that starts the previous autumn.
 */
export function runAround(slots: TimelineSlot[], index: number) {
  const phase = slots[index]?.phase;
  if (!phase) return null;
  let start = index;
  let end = index;
  while (start > 0 && slots[start - 1].phase === phase) start -= 1;
  while (end < slots.length - 1 && slots[end + 1].phase === phase) end += 1;
  return { phase, start, end };
}

/**
 * What the phase means, in the app's own voice — a cosy garden game, not a
 * manual. Each one still has to teach what the pill is telling you to do.
 */
export const PHASE_BODY: Record<Phase, string> = {
  indoor:
    "Windowsill season. Start these in trays somewhere warm and bright — it is still too nippy out there for them.",
  transplant:
    "Moving day! The seedlings you raised inside are big enough to go out to the bed.",
  direct:
    "Straight into the dirt. No trays, no fuss, nothing to shuffle about later.",
  harvest:
    "Basket weather. This should be ready to pick somewhere in these weeks.",
  bloom: "The flowers should be open around now. Fetch the scissors.",
};

/**
 * The line under the body, where there is something worth adding about *this*
 * pill rather than about the phase — why it is drawn the way it is.
 *
 * `variant` is the overlay the calendar already computed: "Slashed" and "Tint"
 * come from the row's status, "Actual" and a guideline "Tint" from comparing a
 * logged planting date against the guide. `logged` tells the two kinds of Tint
 * apart, because dashes mean something different on a row you have dated.
 */
export function variantNote(
  variant: "" | "Slashed" | "Tint" | "Actual",
  logged: boolean,
) {
  if (variant === "Slashed")
    return "Still just a plan. Nothing is in the ground yet, so the row stays see-through until you mark it planted.";
  if (variant === "Actual")
    return "This one is yours. It is counted from the date you logged, not the guide — the lighter fill is your own handwriting.";
  if (variant === "Tint")
    return logged
      ? "That is the guide daydreaming. Your own date runs later than this, so nothing is really happening here yet."
      : "Still a maybe. You have not made your mind up on this one, so the whole row is drawn in dashes.";
  if (logged)
    return "Spot on! Your date and the guide picked the very same weeks, so this pill stays one solid block of colour.";
  return "";
}

/**
 * What to call the sowing a lane belongs to, for a crop grown more than one
 * way. Overwintering is said in full rather than left as a bare label, because
 * it is the one that needs explaining — see the `overwinters` flag on
 * SowingLane, which is the fact this reads.
 */
export function laneNote(sowing: string | undefined, overwinters: boolean) {
  if (overwinters)
    return "This is the one that goes in before winter and sits through it, to be picked the year after.";
  return sowing ? `This is the ${sowing.toLowerCase()} sowing.` : "";
}

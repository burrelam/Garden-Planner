// Core calorie/macro math. Sign convention: negative = deficit (good), positive = surplus.
// Do not invert this convention anywhere in this file or its callers.

export function trueDeficit(grossCalories, activeCalories, restingCalories) {
  return grossCalories - (activeCalories + restingCalories);
}

export function projectedEodTdee(restingTDEEBaseline, activeCaloriesSoFar) {
  return restingTDEEBaseline + activeCaloriesSoFar;
}

export function currentDeficit(grossSoFar, activeSoFar, restingSoFar) {
  return grossSoFar - (activeSoFar + restingSoFar);
}

export function projectedEodDeficit(grossSoFar, eodTdee) {
  return grossSoFar - eodTdee;
}

// past: array of true-deficit numbers for prior completed days in the 7-day window; entries that
// are null/undefined represent untracked days and count as 0 toward the total but not toward
// trackedCount. todayValue: today's Current Deficit or Projected EOD Deficit, whichever the caller
// wants reflected. trackedCount: how many of the 7 days (including today, if tracked) have logged data.
function sevenDayWindow(past, todayValue, todayTracked) {
  const total = past.reduce((sum, v) => sum + (v === null || v === undefined ? 0 : v), 0) + todayValue;
  const trackedCount = past.filter((v) => v !== null && v !== undefined).length + (todayTracked ? 1 : 0);
  return { total, trackedCount };
}

export function sevenDayCurrent(pastSixTrueDeficits, todayCurrentDeficit, todayTracked = true) {
  return sevenDayWindow(pastSixTrueDeficits, todayCurrentDeficit, todayTracked);
}

export function sevenDayEodProjected(pastSixTrueDeficits, todayProjectedEodDeficit, todayTracked = true) {
  return sevenDayWindow(pastSixTrueDeficits, todayProjectedEodDeficit, todayTracked);
}

// ideal and max are both negative numbers, e.g. ideal=-375, max=-500 (the "over max" edge).
// Returns { label, status }; status comes from statusForDeficit so the two never drift apart.
export function remaining(value, ideal, max) {
  const diff = Math.abs(value - ideal);
  const label = value < ideal ? `${Math.round(diff)} to eat` : `OVER by ${Math.round(diff)}`;
  return { label, status: statusForDeficit(value, { ideal, max }) };
}

export function grossCaloriesRemaining(current, max) {
  if (current > max) {
    return { label: `OVER by ${Math.round(current - max)}`, over: true };
  }
  return { label: `${Math.round(max - current)}`, over: false };
}

// Auto-upgrade a declared "rest" day to workout-day targets once active calories exceed 300 mid-day.
export function restDayAutoUpgrade(activeCaloriesSoFar, dayType) {
  return dayType === "rest" && activeCaloriesSoFar > 300;
}

// thresholds: { min, ideal, max }. idealTolerance is the spec's "within 5g (macros) or 100 kcal
// (calories)" band, passed explicitly by the caller rather than guessed from the metric's scale.
// isMidDay controls whether the "close to max" status can show (EOD views never show it).
export function statusForMetric(value, thresholds, idealTolerance, isMidDay = false) {
  const { min, ideal, max } = thresholds;
  if (value > max) return "over_max";
  if (Math.abs(value - ideal) <= idealTolerance) return "at_ideal";
  if (value < min) {
    return value < min * 0.9 ? "below_min" : "close_to_min";
  }
  if (isMidDay && value >= max * 0.9) return "close_to_max";
  return "in_range";
}

// thresholds: { ideal, max } — both negative numbers (e.g. ideal=-375, max=-500).
export function statusForDeficit(value, thresholds) {
  const { ideal, max } = thresholds;
  if (value > 0) return "surplus";
  if (value > ideal) return "below_target";
  if (value >= max) return "at_target";
  return "over_max";
}

// --- Dashboard: BMI and pace ---

export function bmi(weightLbs, heightIn) {
  return (703 * weightLbs) / (heightIn * heightIn);
}

// Standard BMI cutoffs (18.5 / 25 / 30) converted to lbs at a given height, for a visual range bar.
export function bmiBandsInLbs(heightIn) {
  const fromBmi = (b) => (b * heightIn * heightIn) / 703;
  return {
    underweightMax: fromBmi(18.5),
    normalMax: fromBmi(25),
    overweightMax: fromBmi(30),
  };
}

// totalDeficit summed over some period -> implied lbs change (negative deficit = lbs lost = positive).
// Not itself a weekly rate; callers normalize to a per-week figure when the period isn't 7 days.
export function paceFromDeficit(totalDeficit) {
  return totalDeficit / -3500;
}

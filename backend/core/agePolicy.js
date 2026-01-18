export function resolveAgePolicy(age) {
  if (age >= 9 && age <= 12) {
    return { class: "PRE_TEEN", threshold: 0.4 };
  }
  if (age >= 13 && age <= 15) {
    return { class: "TEEN", threshold: 0.5 };
  }
  if (age >= 16 && age <= 17) {
    return { class: "EARLY_ADULT", threshold: 0.6 };
  }
  return null;
}

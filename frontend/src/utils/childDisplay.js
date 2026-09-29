// Display helpers for a Child as the API returns it (docs/api.md):
// { id, fullName, nickname, sex: 'FEMALE' | 'MALE', dateOfBirth: 'YYYY-MM-DD', relation, createdAt }
// The API sends raw data only; everything shown on screen is derived here.

// Parse 'YYYY-MM-DD' as a local calendar date (new Date('2008-05-05') would be UTC midnight).
function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Completed years and months between date of birth and today.
export function getAge(dateOfBirth, today = new Date()) {
  const dob = parseDate(dateOfBirth);
  if (!dob) return null;
  let months = (today.getFullYear() - dob.getFullYear()) * 12 + (today.getMonth() - dob.getMonth());
  if (today.getDate() < dob.getDate()) months -= 1;
  if (months < 0) return null;
  return { years: Math.floor(months / 12), months: months % 12, totalMonths: months };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "18 Years, 4 Months" / "7 Months"
export function getAgeLabel(dateOfBirth) {
  const age = getAge(dateOfBirth);
  if (!age) return '';
  const years = plural(age.years, 'Year');
  const months = plural(age.months, 'Month');
  return age.years === 0 ? months : `${years}, ${months}`;
}

// "18 years old" / "7 months old"
export function getAgeShort(dateOfBirth) {
  const age = getAge(dateOfBirth);
  if (!age) return '';
  return age.years === 0 ? `${plural(age.months, 'month')} old` : `${plural(age.years, 'year')} old`;
}

// "Born May 5, 2008"
export function getBornLabel(dateOfBirth) {
  const dob = parseDate(dateOfBirth);
  if (!dob) return '';
  return `Born ${dob.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
}

// 'FEMALE' -> 'Girl', 'MALE' -> 'Boy'
export function getSexLabel(sex) {
  if (sex === 'FEMALE') return 'Girl';
  if (sex === 'MALE') return 'Boy';
  return '';
}
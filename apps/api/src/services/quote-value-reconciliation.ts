export const serviceAliases = Object.freeze({
  'eco-friendly cleaning': 'eco-conscious cleaning',
  'inside oven': 'inside oven cleaning',
  'oven interior': 'inside oven cleaning',
  'inside fridge': 'inside fridge cleaning',
  'fridge interior': 'inside fridge cleaning',
  'inside cupboards': 'interior cupboard cleaning',
  'cupboard interiors': 'interior cupboard cleaning',
  'garage sweep': 'garage sweeping',
});

export const frequencyMappings = Object.freeze({
  'one-time': 'ONE_TIME',
  weekly: 'WEEKLY',
  'every two weeks': 'EVERY_TWO_WEEKS',
  monthly: 'MONTHLY',
  custom: 'CUSTOM',
});

export const legacyFrequencyAliases = Object.freeze({ fortnightly: 'EVERY_TWO_WEEKS' });

export function canonicalServiceName(value: string) {
  const normalized = value.trim().toLocaleLowerCase('en-AU');
  return serviceAliases[normalized as keyof typeof serviceAliases] ?? normalized;
}

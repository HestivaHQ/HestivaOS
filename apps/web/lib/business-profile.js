export const CORE_BUSINESS_PROFILE_FIELDS = ['registeredName', 'registrationNumber', 'contactNumber', 'businessEmail', 'businessAddress'];
export function businessProfileCompleteness(profile) {
  const complete = CORE_BUSINESS_PROFILE_FIELDS.filter((field) => typeof profile[field] === 'string' && profile[field].trim()).length;
  return Math.round(complete / CORE_BUSINESS_PROFILE_FIELDS.length * 100);
}
const groups = [
  ['Company', [['Registered name', 'registeredName'], ['Trading name', 'tradingName']]],
  ['Registration', [['Company registration number', 'registrationNumber']]],
  ['Contact', [['Main contact number', 'contactNumber'], ['Business email', 'businessEmail'], ['Website', 'website'], ['Business address', 'businessAddress']]],
  ['Banking & payment', [['Bank', 'bankName'], ['Account holder', 'accountHolder'], ['Account number', 'accountNumber'], ['Account type', 'accountType'], ['Branch code', 'branchCode'], ['Payment instructions', 'paymentInstructions']]],
  ['Compliance & official', [['Tax number', 'taxNumber'], ['VAT number', 'vatNumber'], ['Other official identifiers', 'officialIdentifiers']]],
];
export function formatBusinessProfile(profile) {
  const sections = groups.map(([heading, fields]) => {
    const lines = fields.flatMap(([label, field]) => profile[`share${field[0].toUpperCase()}${field.slice(1)}`] && typeof profile[field] === 'string' && profile[field].trim() ? [`${label}: ${profile[field].trim()}`] : []);
    return lines.length ? `${heading}:\n${lines.join('\n')}` : '';
  }).filter(Boolean);
  return ['Hestiva Business Information', ...sections].join('\n\n');
}

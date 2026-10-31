export interface TimezoneInfo {
  timeZone: string;
  code: string;
  flag: string;
  label: string;
}

export interface SupportedCountry {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { code: 'Kenya', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'United States', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'United Kingdom', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'UAE', name: 'United Arab Emirates (UAE)', flag: '🇦🇪', dialCode: '+971' },
  { code: 'Singapore', name: 'Singapore', flag: '🇸🇬', dialCode: '+65' },
  { code: 'Hong Kong', name: 'Hong Kong', flag: '🇭🇰', dialCode: '+852' },
  { code: 'Japan', name: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: 'Switzerland', name: 'Switzerland', flag: '🇨🇭', dialCode: '+41' },
  { code: 'Germany', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'Canada', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'Australia', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'France', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'Netherlands', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: 'South Korea', name: 'South Korea', flag: '🇰🇷', dialCode: '+82' },
  { code: 'India', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'Brazil', name: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'South Africa', name: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: 'Nigeria', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: 'Uganda', name: 'Uganda', flag: '🇺🇬', dialCode: '+256' },
  { code: 'Ghana', name: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
  { code: 'Tanzania', name: 'Tanzania', flag: '🇹🇿', dialCode: '+255' },
  { code: 'Rwanda', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
  { code: 'Egypt', name: 'Egypt', flag: '🇪🇬', dialCode: '+20' },
  { code: 'Turkey', name: 'Turkey', flag: '🇹🇷', dialCode: '+90' },
  { code: 'Saudi Arabia', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: 'Qatar', name: 'Qatar', flag: '🇶🇦', dialCode: '+974' },
  { code: 'Bahrain', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973' },
  { code: 'Kuwait', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965' },
  { code: 'Malaysia', name: 'Malaysia', flag: '🇲🇾', dialCode: '+60' },
  { code: 'Indonesia', name: 'Indonesia', flag: '🇮🇩', dialCode: '+62' },
  { code: 'Thailand', name: 'Thailand', flag: '🇹🇭', dialCode: '+66' },
  { code: 'Vietnam', name: 'Vietnam', flag: '🇻🇳', dialCode: '+84' },
  { code: 'Philippines', name: 'Philippines', flag: '🇵🇭', dialCode: '+63' },
  { code: 'Taiwan', name: 'Taiwan', flag: '🇹🇼', dialCode: '+886' },
  { code: 'China', name: 'China', flag: '🇨🇳', dialCode: '+86' },
  { code: 'Sweden', name: 'Sweden', flag: '🇸🇪', dialCode: '+46' },
  { code: 'Norway', name: 'Norway', flag: '🇳🇴', dialCode: '+47' },
  { code: 'Denmark', name: 'Denmark', flag: '🇩🇰', dialCode: '+45' },
  { code: 'Spain', name: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: 'Italy', name: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: 'Ireland', name: 'Ireland', flag: '🇮🇪', dialCode: '+353' },
  { code: 'Luxembourg', name: 'Luxembourg', flag: '🇱🇺', dialCode: '+352' },
  { code: 'New Zealand', name: 'New Zealand', flag: '🇳🇿', dialCode: '+64' },
  { code: 'Israel', name: 'Israel', flag: '🇮🇱', dialCode: '+972' },
  { code: 'Poland', name: 'Poland', flag: '🇵🇱', dialCode: '+48' },
  { code: 'Czech Republic', name: 'Czech Republic', flag: '🇨🇿', dialCode: '+420' },
  { code: 'Austria', name: 'Austria', flag: '🇦🇹', dialCode: '+43' },
  { code: 'Belgium', name: 'Belgium', flag: '🇧🇪', dialCode: '+32' },
  { code: 'Portugal', name: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
  { code: 'Greece', name: 'Greece', flag: '🇬🇷', dialCode: '+30' },
  { code: 'Cyprus', name: 'Cyprus', flag: '🇨🇾', dialCode: '+357' },
  { code: 'Malta', name: 'Malta', flag: '🇲🇹', dialCode: '+356' },
  { code: 'Cayman Islands', name: 'Cayman Islands', flag: '🇰🇾', dialCode: '+1345' },
  { code: 'British Virgin Islands', name: 'British Virgin Islands', flag: '🇻🇬', dialCode: '+1284' },
  { code: 'Seychelles', name: 'Seychelles', flag: '🇸🇨', dialCode: '+248' },
  { code: 'Mauritius', name: 'Mauritius', flag: '🇲🇺', dialCode: '+230' },
  { code: 'Mexico', name: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
  { code: 'Argentina', name: 'Argentina', flag: '🇦🇷', dialCode: '+54' },
  { code: 'Chile', name: 'Chile', flag: '🇨🇱', dialCode: '+56' },
  { code: 'Colombia', name: 'Colombia', flag: '🇨🇴', dialCode: '+57' },
  { code: 'Pakistan', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: 'Bangladesh', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
];

export const getCountryDetails = (countryStr?: string): SupportedCountry => {
  if (!countryStr) return SUPPORTED_COUNTRIES[0];
  const normalized = countryStr.trim().toLowerCase();
  const found = SUPPORTED_COUNTRIES.find(
    c => c.code.toLowerCase() === normalized || 
         c.name.toLowerCase() === normalized ||
         (normalized.includes('uae') && c.code === 'UAE') ||
         (normalized.includes('emirates') && c.code === 'UAE')
  );
  return found || {
    code: countryStr,
    name: countryStr,
    flag: '🌐',
    dialCode: '+',
  };
};

export const COUNTRY_TIMEZONE_MAP: Record<string, TimezoneInfo> = {
  'kenya': { timeZone: 'Africa/Nairobi', code: 'EAT', flag: '🇰🇪', label: 'Kenya' },
  'ke': { timeZone: 'Africa/Nairobi', code: 'EAT', flag: '🇰🇪', label: 'Kenya' },
  'nigeria': { timeZone: 'Africa/Lagos', code: 'WAT', flag: '🇳🇬', label: 'Nigeria' },
  'ng': { timeZone: 'Africa/Lagos', code: 'WAT', flag: '🇳🇬', label: 'Nigeria' },
  'ghana': { timeZone: 'Africa/Accra', code: 'GMT', flag: '🇬🇭', label: 'Ghana' },
  'gh': { timeZone: 'Africa/Accra', code: 'GMT', flag: '🇬🇭', label: 'Ghana' },
  'south africa': { timeZone: 'Africa/Johannesburg', code: 'SAST', flag: '🇿🇦', label: 'South Africa' },
  'za': { timeZone: 'Africa/Johannesburg', code: 'SAST', flag: '🇿🇦', label: 'South Africa' },
  'uganda': { timeZone: 'Africa/Kampala', code: 'EAT', flag: '🇺🇬', label: 'Uganda' },
  'ug': { timeZone: 'Africa/Kampala', code: 'EAT', flag: '🇺🇬', label: 'Uganda' },
  'tanzania': { timeZone: 'Africa/Dar_es_Salaam', code: 'EAT', flag: '🇹🇿', label: 'Tanzania' },
  'tz': { timeZone: 'Africa/Dar_es_Salaam', code: 'EAT', flag: '🇹🇿', label: 'Tanzania' },
  'rwanda': { timeZone: 'Africa/Kigali', code: 'CAT', flag: '🇷🇼', label: 'Rwanda' },
  'rw': { timeZone: 'Africa/Kigali', code: 'CAT', flag: '🇷🇼', label: 'Rwanda' },
  'ethiopia': { timeZone: 'Africa/Addis_Ababa', code: 'EAT', flag: '🇪🇹', label: 'Ethiopia' },
  'et': { timeZone: 'Africa/Addis_Ababa', code: 'EAT', flag: '🇪🇹', label: 'Ethiopia' },
  'egypt': { timeZone: 'Africa/Cairo', code: 'EET', flag: '🇪🇬', label: 'Egypt' },
  'eg': { timeZone: 'Africa/Cairo', code: 'EET', flag: '🇪🇬', label: 'Egypt' },
  'united kingdom': { timeZone: 'Europe/London', code: 'UK', flag: '🇬🇧', label: 'UK' },
  'uk': { timeZone: 'Europe/London', code: 'UK', flag: '🇬🇧', label: 'UK' },
  'gb': { timeZone: 'Europe/London', code: 'UK', flag: '🇬🇧', label: 'UK' },
  'united states': { timeZone: 'America/New_York', code: 'EST', flag: '🇺🇸', label: 'USA' },
  'us': { timeZone: 'America/New_York', code: 'EST', flag: '🇺🇸', label: 'USA' },
  'usa': { timeZone: 'America/New_York', code: 'EST', flag: '🇺🇸', label: 'USA' },
  'canada': { timeZone: 'America/Toronto', code: 'EST', flag: '🇨🇦', label: 'Canada' },
  'ca': { timeZone: 'America/Toronto', code: 'EST', flag: '🇨🇦', label: 'Canada' },
  'united arab emirates': { timeZone: 'Asia/Dubai', code: 'GST', flag: '🇦🇪', label: 'UAE' },
  'united arab emirates (uae)': { timeZone: 'Asia/Dubai', code: 'GST', flag: '🇦🇪', label: 'UAE' },
  'uae': { timeZone: 'Asia/Dubai', code: 'GST', flag: '🇦🇪', label: 'UAE' },
  'dubai': { timeZone: 'Asia/Dubai', code: 'GST', flag: '🇦🇪', label: 'UAE' },
  'ae': { timeZone: 'Asia/Dubai', code: 'GST', flag: '🇦🇪', label: 'UAE' },
  'singapore': { timeZone: 'Asia/Singapore', code: 'SGT', flag: '🇸🇬', label: 'Singapore' },
  'sg': { timeZone: 'Asia/Singapore', code: 'SGT', flag: '🇸🇬', label: 'Singapore' },
  'hong kong': { timeZone: 'Asia/Hong_Kong', code: 'HKT', flag: '🇭🇰', label: 'Hong Kong' },
  'hk': { timeZone: 'Asia/Hong_Kong', code: 'HKT', flag: '🇭🇰', label: 'Hong Kong' },
  'japan': { timeZone: 'Asia/Tokyo', code: 'JST', flag: '🇯🇵', label: 'Japan' },
  'jp': { timeZone: 'Asia/Tokyo', code: 'JST', flag: '🇯🇵', label: 'Japan' },
  'switzerland': { timeZone: 'Europe/Zurich', code: 'CET', flag: '🇨🇭', label: 'Switzerland' },
  'ch': { timeZone: 'Europe/Zurich', code: 'CET', flag: '🇨🇭', label: 'Switzerland' },
  'germany': { timeZone: 'Europe/Berlin', code: 'CET', flag: '🇩🇪', label: 'Germany' },
  'de': { timeZone: 'Europe/Berlin', code: 'CET', flag: '🇩🇪', label: 'Germany' },
  'australia': { timeZone: 'Australia/Sydney', code: 'AEST', flag: '🇦🇺', label: 'Australia' },
  'au': { timeZone: 'Australia/Sydney', code: 'AEST', flag: '🇦🇺', label: 'Australia' },
  'france': { timeZone: 'Europe/Paris', code: 'CET', flag: '🇫🇷', label: 'France' },
  'fr': { timeZone: 'Europe/Paris', code: 'CET', flag: '🇫🇷', label: 'France' },
  'netherlands': { timeZone: 'Europe/Amsterdam', code: 'CET', flag: '🇳🇱', label: 'Netherlands' },
  'nl': { timeZone: 'Europe/Amsterdam', code: 'CET', flag: '🇳🇱', label: 'Netherlands' },
  'south korea': { timeZone: 'Asia/Seoul', code: 'KST', flag: '🇰🇷', label: 'South Korea' },
  'kr': { timeZone: 'Asia/Seoul', code: 'KST', flag: '🇰🇷', label: 'South Korea' },
  'india': { timeZone: 'Asia/Kolkata', code: 'IST', flag: '🇮🇳', label: 'India' },
  'in': { timeZone: 'Asia/Kolkata', code: 'IST', flag: '🇮🇳', label: 'India' },
  'brazil': { timeZone: 'America/Sao_Paulo', code: 'BRT', flag: '🇧🇷', label: 'Brazil' },
  'br': { timeZone: 'America/Sao_Paulo', code: 'BRT', flag: '🇧🇷', label: 'Brazil' },
  'turkey': { timeZone: 'Europe/Istanbul', code: 'TRT', flag: '🇹🇷', label: 'Turkey' },
  'tr': { timeZone: 'Europe/Istanbul', code: 'TRT', flag: '🇹🇷', label: 'Turkey' },
  'saudi arabia': { timeZone: 'Asia/Riyadh', code: 'AST', flag: '🇸🇦', label: 'Saudi Arabia' },
  'sa': { timeZone: 'Asia/Riyadh', code: 'AST', flag: '🇸🇦', label: 'Saudi Arabia' },
  'qatar': { timeZone: 'Asia/Qatar', code: 'AST', flag: '🇶🇦', label: 'Qatar' },
  'qa': { timeZone: 'Asia/Qatar', code: 'AST', flag: '🇶🇦', label: 'Qatar' },
  'bahrain': { timeZone: 'Asia/Bahrain', code: 'AST', flag: '🇧🇭', label: 'Bahrain' },
  'bh': { timeZone: 'Asia/Bahrain', code: 'AST', flag: '🇧🇭', label: 'Bahrain' },
  'kuwait': { timeZone: 'Asia/Kuwait', code: 'AST', flag: '🇰🇼', label: 'Kuwait' },
  'kw': { timeZone: 'Asia/Kuwait', code: 'AST', flag: '🇰🇼', label: 'Kuwait' },
  'malaysia': { timeZone: 'Asia/Kuala_Lumpur', code: 'MYT', flag: '🇲🇾', label: 'Malaysia' },
  'my': { timeZone: 'Asia/Kuala_Lumpur', code: 'MYT', flag: '🇲🇾', label: 'Malaysia' },
  'indonesia': { timeZone: 'Asia/Jakarta', code: 'WIB', flag: '🇮🇩', label: 'Indonesia' },
  'id': { timeZone: 'Asia/Jakarta', code: 'WIB', flag: '🇮🇩', label: 'Indonesia' },
  'thailand': { timeZone: 'Asia/Bangkok', code: 'ICT', flag: '🇹🇭', label: 'Thailand' },
  'th': { timeZone: 'Asia/Bangkok', code: 'ICT', flag: '🇹🇭', label: 'Thailand' },
  'vietnam': { timeZone: 'Asia/Ho_Chi_Minh', code: 'ICT', flag: '🇻🇳', label: 'Vietnam' },
  'vn': { timeZone: 'Asia/Ho_Chi_Minh', code: 'ICT', flag: '🇻🇳', label: 'Vietnam' },
  'philippines': { timeZone: 'Asia/Manila', code: 'PHT', flag: '🇵🇭', label: 'Philippines' },
  'ph': { timeZone: 'Asia/Manila', code: 'PHT', flag: '🇵🇭', label: 'Philippines' },
  'taiwan': { timeZone: 'Asia/Taipei', code: 'CST', flag: '🇹🇼', label: 'Taiwan' },
  'tw': { timeZone: 'Asia/Taipei', code: 'CST', flag: '🇹🇼', label: 'Taiwan' },
  'china': { timeZone: 'Asia/Shanghai', code: 'CST', flag: '🇨🇳', label: 'China' },
  'cn': { timeZone: 'Asia/Shanghai', code: 'CST', flag: '🇨🇳', label: 'China' },
  'sweden': { timeZone: 'Europe/Stockholm', code: 'CET', flag: '🇸🇪', label: 'Sweden' },
  'se': { timeZone: 'Europe/Stockholm', code: 'CET', flag: '🇸🇪', label: 'Sweden' },
  'norway': { timeZone: 'Europe/Oslo', code: 'CET', flag: '🇳🇴', label: 'Norway' },
  'no': { timeZone: 'Europe/Oslo', code: 'CET', flag: '🇳🇴', label: 'Norway' },
  'denmark': { timeZone: 'Europe/Copenhagen', code: 'CET', flag: '🇩🇰', label: 'Denmark' },
  'dk': { timeZone: 'Europe/Copenhagen', code: 'CET', flag: '🇩🇰', label: 'Denmark' },
  'spain': { timeZone: 'Europe/Madrid', code: 'CET', flag: '🇪🇸', label: 'Spain' },
  'es': { timeZone: 'Europe/Madrid', code: 'CET', flag: '🇪🇸', label: 'Spain' },
  'italy': { timeZone: 'Europe/Rome', code: 'CET', flag: '🇮🇹', label: 'Italy' },
  'it': { timeZone: 'Europe/Rome', code: 'CET', flag: '🇮🇹', label: 'Italy' },
  'ireland': { timeZone: 'Europe/Dublin', code: 'IST', flag: '🇮🇪', label: 'Ireland' },
  'ie': { timeZone: 'Europe/Dublin', code: 'IST', flag: '🇮🇪', label: 'Ireland' },
  'luxembourg': { timeZone: 'Europe/Luxembourg', code: 'CET', flag: '🇱🇺', label: 'Luxembourg' },
  'lu': { timeZone: 'Europe/Luxembourg', code: 'CET', flag: '🇱🇺', label: 'Luxembourg' },
  'new zealand': { timeZone: 'Pacific/Auckland', code: 'NZST', flag: '🇳🇿', label: 'New Zealand' },
  'nz': { timeZone: 'Pacific/Auckland', code: 'NZST', flag: '🇳🇿', label: 'New Zealand' },
  'israel': { timeZone: 'Asia/Jerusalem', code: 'IST', flag: '🇮🇱', label: 'Israel' },
  'il': { timeZone: 'Asia/Jerusalem', code: 'IST', flag: '🇮🇱', label: 'Israel' },
  'poland': { timeZone: 'Europe/Warsaw', code: 'CET', flag: '🇵🇱', label: 'Poland' },
  'pl': { timeZone: 'Europe/Warsaw', code: 'CET', flag: '🇵🇱', label: 'Poland' },
  'czech republic': { timeZone: 'Europe/Prague', code: 'CET', flag: '🇨🇿', label: 'Czech Republic' },
  'cz': { timeZone: 'Europe/Prague', code: 'CET', flag: '🇨🇿', label: 'Czech Republic' },
  'austria': { timeZone: 'Europe/Vienna', code: 'CET', flag: '🇦🇹', label: 'Austria' },
  'at': { timeZone: 'Europe/Vienna', code: 'CET', flag: '🇦🇹', label: 'Austria' },
  'belgium': { timeZone: 'Europe/Brussels', code: 'CET', flag: '🇧🇪', label: 'Belgium' },
  'be': { timeZone: 'Europe/Brussels', code: 'CET', flag: '🇧🇪', label: 'Belgium' },
  'portugal': { timeZone: 'Europe/Lisbon', code: 'WET', flag: '🇵🇹', label: 'Portugal' },
  'pt': { timeZone: 'Europe/Lisbon', code: 'WET', flag: '🇵🇹', label: 'Portugal' },
  'greece': { timeZone: 'Europe/Athens', code: 'EET', flag: '🇬🇷', label: 'Greece' },
  'gr': { timeZone: 'Europe/Athens', code: 'EET', flag: '🇬🇷', label: 'Greece' },
  'cyprus': { timeZone: 'Asia/Nicosia', code: 'EET', flag: '🇨🇾', label: 'Cyprus' },
  'cy': { timeZone: 'Asia/Nicosia', code: 'EET', flag: '🇨🇾', label: 'Cyprus' },
  'malta': { timeZone: 'Europe/Malta', code: 'CET', flag: '🇲🇹', label: 'Malta' },
  'mt': { timeZone: 'Europe/Malta', code: 'CET', flag: '🇲🇹', label: 'Malta' },
  'mexico': { timeZone: 'America/Mexico_City', code: 'CST', flag: '🇲🇽', label: 'Mexico' },
  'mx': { timeZone: 'America/Mexico_City', code: 'CST', flag: '🇲🇽', label: 'Mexico' },
  'argentina': { timeZone: 'America/Argentina/Buenos_Aires', code: 'ART', flag: '🇦🇷', label: 'Argentina' },
  'ar': { timeZone: 'America/Argentina/Buenos_Aires', code: 'ART', flag: '🇦🇷', label: 'Argentina' },
  'chile': { timeZone: 'America/Santiago', code: 'CLT', flag: '🇨🇱', label: 'Chile' },
  'cl': { timeZone: 'America/Santiago', code: 'CLT', flag: '🇨🇱', label: 'Chile' },
  'colombia': { timeZone: 'America/Bogota', code: 'COT', flag: '🇨🇴', label: 'Colombia' },
  'co': { timeZone: 'America/Bogota', code: 'COT', flag: '🇨🇴', label: 'Colombia' },
  'pakistan': { timeZone: 'Asia/Karachi', code: 'PKT', flag: '🇵🇰', label: 'Pakistan' },
  'pk': { timeZone: 'Asia/Karachi', code: 'PKT', flag: '🇵🇰', label: 'Pakistan' },
  'bangladesh': { timeZone: 'Asia/Dhaka', code: 'BST', flag: '🇧🇩', label: 'Bangladesh' },
  'bd': { timeZone: 'Asia/Dhaka', code: 'BST', flag: '🇧🇩', label: 'Bangladesh' },
};

export const getUserTimezoneInfo = (userCountry?: string): TimezoneInfo => {
  const normalized = (userCountry || '').trim().toLowerCase();
  if (normalized && COUNTRY_TIMEZONE_MAP[normalized]) {
    return COUNTRY_TIMEZONE_MAP[normalized];
  }
  if (normalized.includes('uae') || normalized.includes('emirates') || normalized.includes('dubai')) {
    return COUNTRY_TIMEZONE_MAP['uae'];
  }

  // Detect system timezone as fallback
  try {
    const sysTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      timeZone: sysTz,
      code: 'LOCAL',
      flag: '🌐',
      label: userCountry || 'Local Time',
    };
  } catch {
    return {
      timeZone: 'Africa/Nairobi',
      code: 'EAT',
      flag: '🇰🇪',
      label: 'Kenya',
    };
  }
};

export interface FormattedSignalTime {
  eatTime: string;          // e.g. "13:00 EAT"
  eatFormatted12: string;   // e.g. "1:00 PM EAT"
  localTimeStr: string;     // e.g. "11:00 AM"
  localTimeFull: string;    // e.g. "11:00 AM (🇳🇬 Nigeria WAT)"
  isDifferentCountry: boolean;
  userCountryInfo: TimezoneInfo;
}

export const formatSignalTimeForCountry = (
  sigTime: string,
  userCountry?: string
): FormattedSignalTime => {
  const countryInfo = getUserTimezoneInfo(userCountry);

  if (!sigTime) {
    return {
      eatTime: '12:00 EAT',
      eatFormatted12: '12:00 PM EAT',
      localTimeStr: '12:00 PM',
      localTimeFull: '12:00 PM EAT',
      isDifferentCountry: false,
      userCountryInfo: countryInfo,
    };
  }

  const parts = sigTime.split(':');
  const sigHour = parseInt(parts[0] || '12', 10);
  const sigMin = parseInt(parts[1] || '0', 10);

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Find today's date in Kenya (EAT / UTC+3)
  const now = new Date();
  const kenyaDateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(now).split('/').map(Number);

  const m = pad(kenyaDateParts[0]);
  const d = pad(kenyaDateParts[1]);
  const y = kenyaDateParts[2];

  // ISO string representing Kenya start time
  const isoKenya = `${y}-${m}-${d}T${pad(sigHour)}:${pad(sigMin)}:00+03:00`;
  const signalDate = new Date(isoKenya);

  // Format Kenya 12-hour
  const eatFormatted12 = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(signalDate) + ' EAT';

  // Format in user local timezone
  let localTimeStr = '';
  try {
    localTimeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: countryInfo.timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(signalDate);
  } catch {
    localTimeStr = eatFormatted12;
  }

  const isKenyaTz =
    countryInfo.timeZone === 'Africa/Nairobi' ||
    countryInfo.label.toLowerCase() === 'kenya';

  const localTimeFull = isKenyaTz
    ? `${sigTime} EAT (${eatFormatted12} 🇰🇪)`
    : `${localTimeStr} (${countryInfo.flag} ${countryInfo.label} ${countryInfo.code})`;

  return {
    eatTime: `${sigTime} EAT`,
    eatFormatted12,
    localTimeStr,
    localTimeFull,
    isDifferentCountry: !isKenyaTz,
    userCountryInfo: countryInfo,
  };
};

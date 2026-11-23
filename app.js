// ==========================================
// 1. STANDAARD GOLFBAAN DATA & STATE
// ==========================================
const DEFAULT_COURSES = [
  {
    id: 'kromme-rijn',
    name: 'Golfclub Kromme Rijn',
    city: 'Bunnik',
    typeLabel: 'Bos/parkbaan (goede luwte)',
    windFactor: 0.85,
    lat: 52.0558,
    lon: 5.2069,
    booking: {
      primary: true,
      shortName: 'Kromme Rijn',
      url: 'https://www.krommerijn.nl/starttijden/',
      memberUrl: 'https://www.krommerijn.nl/inloggen-e-golf4u/',
      memberUntil: '2026-12-31',
      system: 'E-Golf4U',
      advanceDays: null,
      rule: 'Lid t/m 31 dec 2026 (E-Golf4U) · daarna greenfee via starttijden'
    }
  },
  {
    id: 'amelisweerd',
    name: 'UGC Amelisweerd',
    city: 'Utrecht',
    typeLabel: 'Bosbaan (veel beschutting)',
    windFactor: 0.80,
    lat: 52.0672,
    lon: 5.1744,
    booking: {
      primary: true,
      shortName: 'Amelisweerd',
      url: 'https://amelisweerd.golfdashboard.com/',
      system: 'Golfdashboard',
      advanceDays: 14,
      guestWeekendHours: { winter: 12 * 60, summer: 13 * 60 + 30 },
      rule: 'Tot 14 dagen vooruit · gasten vr–zo vanaf 12:00 (winter) / 13:30 (zomer)'
    }
  },
  {
    id: 'de-utrechtse',
    name: 'Golfclub De Utrechtse',
    city: 'Schalkwijk',
    typeLabel: 'Park/polderbaan (licht open)',
    windFactor: 1.05,
    lat: 52.0114,
    lon: 5.1636,
    booking: {
      primary: true,
      shortName: 'De Utrechtse',
      url: 'https://www.deutrechtse.nl/gastspelers/starttijd-boeken',
      system: 'Mondial / GOLF.NL',
      advanceDays: null,
      rule: 'Online boeken (9-holes of par-3)'
    }
  },
  {
    id: 'kroonprins',
    name: 'Golfbaan De Kroonprins',
    city: 'Vianen',
    typeLabel: 'Open polderbaan (windgevoelig)',
    windFactor: 1.15,
    lat: 51.9839,
    lon: 5.0719,
    booking: {
      primary: true,
      shortName: 'De Kroonprins',
      url: 'https://golfbaandekroonprins.nl/',
      system: 'Kroonprins',
      advanceDays: 5,
      rule: 'Greenfee vanaf 5 dagen vooraf · gasten vanaf 09:00 · max 3-ballen'
    }
  },
  {
    id: 'wilnis',
    name: 'Golfpark Wilnis',
    city: 'Wilnis',
    typeLabel: 'Open polderbaan (windgevoelig)',
    windFactor: 1.15,
    lat: 52.1931,
    lon: 4.8925,
    booking: {
      primary: false,
      shortName: 'Wilnis',
      url: 'https://wilnis.golfer.intogolf.nl/#/login',
      system: 'IntoGolf',
      advanceDays: null,
      rule: 'Online boeken via IntoGolf'
    }
  },
  {
    id: 'biltse-duinen',
    name: 'Golfbaan De Biltse Duinen',
    city: 'Bilthoven',
    typeLabel: 'Bos/heidebaan (goede luwte)',
    windFactor: 0.85,
    lat: 52.1269,
    lon: 5.2133,
    booking: {
      primary: false,
      shortName: 'Biltse Duinen',
      url: 'https://www.biltseduinen.nl/',
      system: 'E-Golf4U',
      advanceDays: 14,
      rule: 'Online boeken tot 14 dagen vooruit'
    }
  },
  {
    id: 'spandersbosch',
    name: 'Golfpark Spandersbosch',
    city: 'Hilversum',
    typeLabel: 'Bosbaan (veel beschutting)',
    windFactor: 0.80,
    lat: 52.2386,
    lon: 5.1464,
    booking: {
      primary: false,
      shortName: 'Spandersbosch',
      url: 'https://www.golfparkspandersbosch.nl/',
      system: 'TeeControl',
      advanceDays: null,
      rule: 'Vooraf online reserveren (Boschbaan / Crailoobaan)'
    }
  },
  {
    id: 'drentsche',
    name: 'Drentsche Golf & Country Club',
    city: 'Zeijerveen',
    typeLabel: 'Parkbaan (gemiddelde luwte)',
    windFactor: 0.90,
    lat: 53.0176,
    lon: 6.5287,
    booking: {
      primary: false,
      shortName: 'Drentsche GCC',
      url: 'https://dgcc.nl/',
      system: 'Golfdashboard',
      advanceDays: 10,
      rule: 'Online boeken tot 10 dagen vooruit via dgcc.nl'
    }
  },
  {
    id: 'engelenburg',
    name: 'Engelenburg Golf & Country Club',
    city: 'Brummen',
    typeLabel: 'Landgoed/parkbaan (goede luwte)',
    windFactor: 0.85,
    lat: 52.0905,
    lon: 6.1347,
    booking: {
      primary: false,
      shortName: 'Engelenburg',
      url: 'https://engelenburg.com/',
      system: 'Receptie / web',
      advanceDays: 14,
      rule: 'Gasten tot 14 dagen vooruit · receptie 0575-569999'
    }
  }
];

const state = {
  courses: [],
  selectedCourseId: 'kromme-rijn',
  holes: 9, // 9 = 2.0u, 18 = 4.0u
  preference: 1, // 0 = Bikkel, 1 = Normaal, 2 = Mooiweer
  viewMode: 'single', // 'single' | 'compare'
  weatherByCourse: {},
  analysesByCourse: {},
  expandedDayIndex: 0,
  shareMode: 'week',
  shareDayIndex: 0,
  lastPngDataUrl: ''
};

const $ = (id) => document.getElementById(id);

function loadCourses() {
  let custom = [];
  try {
    custom = JSON.parse(localStorage.getItem('golfweer_custom_courses_v1') || '[]');
  } catch (e) {
    custom = [];
  }
  state.courses = [...DEFAULT_COURSES, ...custom];
}

function saveCustomCourse(course) {
  let custom = [];
  try {
    custom = JSON.parse(localStorage.getItem('golfweer_custom_courses_v1') || '[]');
  } catch (e) {}
  custom.push(course);
  try {
    localStorage.setItem('golfweer_custom_courses_v1', JSON.stringify(custom));
  } catch (e) {}
  loadCourses();
}

// ==========================================
// 2. OPEN-METEO API FETCH
// ==========================================
async function fetchAllWeatherData() {
  const loadingBox = $('loadingBox');
  const errorBox = $('errorBox');
  const singleCont = $('singleCourseContainer');
  const compareCont = $('compareCoursesContainer');

  if (loadingBox && state.viewMode !== 'planner') loadingBox.classList.remove('hidden');
  if (errorBox) errorBox.classList.add('hidden');
  if (singleCont) singleCont.classList.add('hidden');
  if (compareCont) compareCont.hidden = 'until-found';

  try {
    const lats = state.courses.map(c => c.lat).join(',');
    const lons = state.courses.map(c => c.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,weather_code&daily=sunrise,sunset&timezone=Europe%2FAmsterdam&forecast_days=7`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();

    const list = Array.isArray(data) ? data : [data];
    state.courses.forEach((course, idx) => {
      state.weatherByCourse[course.id] = list[idx] || list[0];
    });

    recomputeAllAnalyses();
    if (loadingBox) loadingBox.classList.add('hidden');
    renderApp();
  } catch (err) {
    if (loadingBox) loadingBox.classList.add('hidden');
    if (errorBox) errorBox.classList.remove('hidden');
    if ($('errorText')) $('errorText').textContent = err.message || 'Kon weerdata niet ophalen.';
  }
}

// ==========================================
// 3. GOLF PLAYABILITY SCORE & ANALYSE ENGINE
// ==========================================
function getAmsterdamNowDecimalHour() {
  const nowStr = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam', hour12: false });
  const parts = nowStr.split(', ')[1].split(':');
  return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
}

function windDirLabel(deg) {
  const dirs = ['N', 'NNO', 'NO', 'ONO', 'O', 'OZO', 'ZO', 'ZZO', 'Z', 'ZZW', 'ZW', 'WZW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

function weatherIcon(code, precip, prob) {
  if (precip >= 0.8 || prob >= 65) return '🌧️';
  if (precip >= 0.15 || prob >= 35) return '🌦️';
  if (code === 0 || code === 1) return '☀️';
  if (code === 2) return '⛅';
  if (code === 45 || code === 48) return '🌫️';
  return '☁️';
}

function weatherSvgIcon(code, precip, prob, sizeClass = 'w-5 h-5', onDark = false) {
  const sunStroke = onDark ? '#e2c891' : '#b89652';
  const cloudStroke = onDark ? '#cad6cf' : '#6d7d76';
  const fogStroke = onDark ? '#b9c6bf' : '#7b857f';
  const drizzleStroke = onDark ? '#98bfd4' : '#4c748c';
  const rainStroke = onDark ? '#88b4cc' : '#3f6680';

  if (precip >= 0.8 || prob >= 65) {
    return `<svg class="${sizeClass} shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6.5 15.5h10.25a3.75 3.75 0 00.56-7.46 5.25 5.25 0 00-10.17-1.26A3.75 3.75 0 006.5 15.5z" stroke="${cloudStroke}"/>
      <path d="M8.5 18.5l-1 2.5M12 18.5l-1 2.5M15.5 18.5l-1 2.5" stroke="${rainStroke}"/>
    </svg>`;
  }
  if (precip >= 0.15 || prob >= 35) {
    return `<svg class="${sizeClass} shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6.5 15.5h10.25a3.75 3.75 0 00.56-7.46 5.25 5.25 0 00-10.17-1.26A3.75 3.75 0 006.5 15.5z" stroke="${cloudStroke}"/>
      <path d="M10 18.5l-.8 2M14 18.5l-.8 2" stroke="${drizzleStroke}"/>
    </svg>`;
  }
  if (code === 0 || code === 1) {
    return `<svg class="${sizeClass} shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="${sunStroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>`;
  }
  if (code === 2) {
    return `<svg class="${sizeClass} shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8.5 10.5a3.25 3.25 0 015.85-1.5M12 4.5V3M6.34 6.34l-1.06-1.06M4.5 11H3" stroke="${sunStroke}"/>
      <path d="M7.5 18.5h9.25a3.25 3.25 0 00.48-6.46 4.5 4.5 0 00-8.72-1.08A3.25 3.25 0 007.5 18.5z" stroke="${cloudStroke}"/>
    </svg>`;
  }
  if (code === 45 || code === 48) {
    return `<svg class="${sizeClass} shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="${fogStroke}" stroke-width="1.6" stroke-linecap="round">
      <path d="M4 9h14M6 13h14M5 17h11"/>
    </svg>`;
  }
  return `<svg class="${sizeClass} shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="${cloudStroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 17.5h10.5a3.75 3.75 0 00.56-7.46 5.25 5.25 0 00-10.17-1.26A3.75 3.75 0 006.5 17.5z"/>
  </svg>`;
}

/**
 * Interpoleert vloeiend een kleur op basis van de golfscore (0-100),
 * zodat 1 punt verschil slechts een subtiele kleurnuance oplevert
 * en witte tekst altijd goed leesbaar blijft.
 */
function interpolateScoreRgb(score) {
  const stops = [
    { s: 30, rgb: [143, 61, 66] },   // Muted terracotta-rose (#8f3d42)
    { s: 48, rgb: [155, 87, 59] },   // Muted rust (#9b573b)
    { s: 60, rgb: [140, 106, 50] },  // Warm ochre (#8c6a32)
    { s: 70, rgb: [92, 115, 68] },   // Muted olive-sage (#5c7344)
    { s: 80, rgb: [52, 107, 77] },   // Calm fairway sage (#346b4d)
    { s: 92, rgb: [27, 94, 61] }     // Rich clubhouse pine (#1b5e3d)
  ];

  const clamped = Math.max(stops[0].s, Math.min(stops[stops.length - 1].s, score));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (clamped >= a.s && clamped <= b.s) {
      const t = (clamped - a.s) / (b.s - a.s);
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t)
      ];
    }
  }
  return stops[stops.length - 1].rgb;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function scoreBadgeMeta(score) {
  const [r, g, b] = interpolateScoreRgb(score);
  const hex = rgbToHex(r, g, b);
  const label = score >= 82 ? 'Topdag' : score >= 68 ? 'Goed' : score >= 52 ? 'Matig' : 'Slecht';

  // Donkere variant voor tekst op zachte getinte achtergrond (>= 4.5:1 contrast)
  const tr = Math.round(r * 0.62);
  const tg = Math.round(g * 0.62);
  const tb = Math.round(b * 0.62);
  const tintStyle = `background-color: rgba(${r}, ${g}, ${b}, 0.11); color: rgb(${tr}, ${tg}, ${tb}); border-color: rgba(${r}, ${g}, ${b}, 0.24);`;

  return {
    label,
    hex,
    bgStyle: `background-color: ${hex}; color: #ffffff;`,
    tintStyle,
    softStyle: tintStyle,
    dotStyle: `background-color: ${hex};`
  };
}

/**
 * Berekent zowel de uurscore als de uitsplitsing van strafpunten per factor,
 * zodat we per dag kort kunnen samenvatten waarom de score is zoals hij is.
 */
function calculateHourlyGolfScore(hourIdx, hourly, course, pref) {
  const temp = hourly.temperature_2m[hourIdx];
  const appTemp = hourly.apparent_temperature[hourIdx];
  const precip = hourly.precipitation[hourIdx] || 0;
  const prob = hourly.precipitation_probability?.[hourIdx] ?? (precip > 0 ? 70 : 10);
  const effWind = (hourly.wind_speed_10m[hourIdx] || 0) * course.windFactor;
  const effGusts = (hourly.wind_gusts_10m[hourIdx] || effWind) * course.windFactor;

  const prefMult = pref === 0 ? 0.78 : pref === 2 ? 1.25 : 1.0;

  // 1. Kwadratische regenkans-weging (<=10% is 0 straf; 20% ~0.5 pt; 70% ~18 pt)
  const normProb = Math.max(0, (prob - 10) / 90);
  const probPenalty = Math.pow(normProb, 2) * 34 * prefMult;

  // 2. Actuele neerslag (mm/u) gewogen met waarschijnlijkheid
  const probWeight = Math.max(0.35, prob / 100);
  const precipPenalty = precip > 0
    ? Math.min(48, (precip * 26 * probWeight + 4) * prefMult)
    : 0;
  const rainPenalty = probPenalty + precipPenalty;

  // 3. Natte turf / zachte greens door regen in voorgaande 3 uur
  let priorRain = 0;
  for (let back = 1; back <= 3; back++) {
    if (hourIdx - back >= 0) priorRain += (hourly.precipitation[hourIdx - back] || 0);
  }
  const wetPenalty = priorRain > 0.3 ? Math.min(9, priorRain * 2.2) : 0;

  // 4. Wind & windvlagen
  let windPenalty = 0;
  if (effWind > 12) {
    windPenalty += Math.pow((effWind - 12) / 10, 1.45) * 10 * prefMult;
  }
  if (effGusts > 24) {
    windPenalty += ((effGusts - 24) / 10) * 6.5 * prefMult;
  }

  // 5. Gevoelstemperatuur (seizoensvriendelijk)
  const idealLow = pref === 0 ? 8 : pref === 2 ? 15 : 11;
  const idealHigh = 24;
  let coldPenalty = 0;
  let heatPenalty = 0;
  if (appTemp < idealLow) {
    coldPenalty = (idealLow - appTemp) * (pref === 0 ? 1.2 : pref === 2 ? 2.4 : 1.8);
  } else if (appTemp > idealHigh) {
    heatPenalty = (appTemp - idealHigh) * 1.7;
  }
  const frostPenalty = temp <= 1.5 ? 8 : 0;

  const totalPenalty = rainPenalty + wetPenalty + windPenalty + coldPenalty + heatPenalty + frostPenalty;
  const score = Math.max(5, Math.min(99, Math.round(100 - totalPenalty)));

  return {
    score,
    penalties: {
      rain: rainPenalty,
      wet: wetPenalty,
      wind: windPenalty,
      cold: coldPenalty,
      heat: heatPenalty,
      frost: frostPenalty
    }
  };
}

/**
 * Bouwt een compacte 1-regelige uitleg waarom de score van een dag is zoals hij is.
 */
function buildScoreReason(avgPenalties, rep, bestScore) {
  const items = [];

  if (avgPenalties.rain >= 3.5) {
    const label = rep.precip >= 0.4 || rep.prob >= 60 ? 'Regen' : 'Kans op buien';
    items.push({ pts: avgPenalties.rain, text: `${label} (-${Math.round(avgPenalties.rain)})` });
  }
  if (avgPenalties.wind >= 3.5) {
    const label = rep.wind >= 22 || rep.gusts >= 35 ? 'Stevige wind' : 'Wind';
    items.push({ pts: avgPenalties.wind, text: `${label} (-${Math.round(avgPenalties.wind)})` });
  }
  if (avgPenalties.cold >= 3.5) {
    const label = rep.appTemp <= 5 ? 'Koud' : 'Fris';
    items.push({ pts: avgPenalties.cold, text: `${label} (-${Math.round(avgPenalties.cold)})` });
  }
  if (avgPenalties.heat >= 3.5) {
    items.push({ pts: avgPenalties.heat, text: `Warm (-${Math.round(avgPenalties.heat)})` });
  }
  if (avgPenalties.frost >= 3.5) {
    items.push({ pts: avgPenalties.frost, text: `Kans op rijp (-${Math.round(avgPenalties.frost)})` });
  }
  if (avgPenalties.wet >= 3.0) {
    items.push({ pts: avgPenalties.wet, text: `Natte baan (-${Math.round(avgPenalties.wet)})` });
  }

  items.sort((a, b) => b.pts - a.pts);

  if (items.length === 0) {
    if (bestScore >= 85) return 'Droog, weinig wind en aangenaam';
    return 'Droog en goed speelbaar, lichte wind of iets fris';
  }

  const top = items.slice(0, 3).map(i => i.text).join(' · ');
  if (bestScore >= 80 && items.length === 1) {
    return `Verder droog en rustig · ${top}`;
  }
  return top;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDecimalHour(dec, roundToQuarter = true) {
  let totalMins = Math.round(dec * 60);
  if (roundToQuarter) totalMins = Math.round(totalMins / 15) * 15;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDurationHours(decHours) {
  const totalMins = Math.max(0, Math.round(decHours * 60));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}u ${String(m).padStart(2, '0')}m`;
}

function getHourLightPhase(hour, sunriseDec, sunsetDec, playableLightEnd) {
  const slotStart = hour;
  const slotEnd = hour + 1;
  if (slotEnd <= sunriseDec) return 'dark';
  if (slotStart >= playableLightEnd) return 'dark';
  if (slotStart < sunriseDec && slotEnd > sunriseDec) return 'sunrise';
  if (slotEnd > sunsetDec) return 'sunset';
  return 'daylight';
}

function analyzeCourse7Days(course) {
  const raw = state.weatherByCourse[course.id];
  if (!raw) return [];
  const hourly = raw.hourly;
  const daily = raw.daily;
  const roundHours = state.holes === 9 ? 2.0 : 4.0;
  const nowDec = getAmsterdamNowDecimalHour();
  const days = [];

  for (let d = 0; d < 7; d++) {
    const baseIdx = d * 24;
    const sunriseDate = new Date(daily.sunrise[d]);
    const sunsetDate = new Date(daily.sunset[d]);
    const sunriseDec = sunriseDate.getHours() + sunriseDate.getMinutes() / 60;
    const sunsetDec = sunsetDate.getHours() + sunsetDate.getMinutes() / 60;

    // Burgerlijke schemering: +15 min bij helder/lichtbewolkt en droog
    const sunsetHourIdx = Math.min(baseIdx + 23, baseIdx + Math.floor(sunsetDec));
    const sunsetCloud = hourly.cloud_cover?.[sunsetHourIdx] ?? 50;
    const sunsetPrecip = hourly.precipitation?.[sunsetHourIdx] ?? 0;
    const twilightBonus = (sunsetCloud < 75 && sunsetPrecip < 0.1) ? 0.25 : 0;
    const playableLightEnd = Math.min(23.5, sunsetDec + twilightBonus);

    // Uurscores berekenen
    const hourRows = [];
    for (let h = 0; h < 24; h++) {
      const idx = baseIdx + h;
      const res = calculateHourlyGolfScore(idx, hourly, course, state.preference);
      hourRows.push({
        hour: h,
        score: res.score,
        penalties: res.penalties,
        temp: Math.round(hourly.temperature_2m[idx]),
        appTemp: Math.round(hourly.apparent_temperature[idx]),
        precip: +(hourly.precipitation[idx] || 0).toFixed(1),
        prob: Math.round(hourly.precipitation_probability?.[idx] ?? 0),
        wind: Math.round((hourly.wind_speed_10m[idx] || 0) * course.windFactor),
        gusts: Math.round((hourly.wind_gusts_10m[idx] || 0) * course.windFactor),
        windDir: windDirLabel(hourly.wind_direction_10m[idx] || 0),
        code: hourly.weather_code[idx]
      });
    }

    // Kwartier-interpolatie voor starttijdvensters
    const earliestStart = Math.max(
      Math.ceil(sunriseDec * 4) / 4,
      d === 0 ? Math.ceil((nowDec + 0.25) * 4) / 4 : 0
    );
    const latestStart = Math.floor((playableLightEnd - roundHours) * 4) / 4;

    const candidateStarts = [];
    for (let st = earliestStart; st <= latestStart + 0.001; st += 0.25) {
      const steps = Math.round(roundHours * 4);
      let sum = 0;
      let minStep = 100;
      for (let k = 0; k < steps; k++) {
        const t = st + k * 0.25;
        const h0 = Math.min(23, Math.floor(t));
        const h1 = Math.min(23, h0 + 1);
        const frac = t - h0;
        const interp = hourRows[h0].score * (1 - frac) + hourRows[h1].score * frac;
        sum += interp;
        if (interp < minStep) minStep = interp;
      }
      const avg = Math.round((sum / steps) * 0.8 + minStep * 0.2);
      candidateStarts.push({ start: st, score: avg });
    }

    let bestStart = Math.max(9, earliestStart);
    let bestScore = 50;
    let windowStartMin = bestStart;
    let windowStartMax = bestStart;

    if (candidateStarts.length > 0) {
      candidateStarts.forEach(c => {
        if (c.score > bestScore) {
          bestScore = c.score;
          bestStart = c.start;
        }
      });
      // Dynamische starttijd-marge: alle aaneengesloten starttijden binnen 5 punten van piek
      const threshold = bestScore - 5;
      const bestIdx = candidateStarts.findIndex(c => c.start === bestStart);
      let left = bestIdx;
      let right = bestIdx;
      while (left > 0 && candidateStarts[left - 1].score >= threshold) left--;
      while (right < candidateStarts.length - 1 && candidateStarts[right + 1].score >= threshold) right++;
      windowStartMin = candidateStarts[left].start;
      windowStartMax = candidateStarts[right].start;
    } else {
      // Te laat op de dag voor volledige ronde
      const fallbackH = Math.min(23, Math.max(0, Math.floor(nowDec)));
      bestScore = hourRows[fallbackH].score;
    }

    // Gemiddelde strafpunten tijdens het beste speelvenster voor de score-uitleg
    const avgPen = { rain: 0, wet: 0, wind: 0, cold: 0, heat: 0, frost: 0 };
    const stepsForPen = Math.max(1, Math.round(roundHours));
    for (let k = 0; k < stepsForPen; k++) {
      const hIdx = Math.min(23, Math.max(0, Math.round(bestStart + k)));
      const p = hourRows[hIdx].penalties;
      avgPen.rain += p.rain / stepsForPen;
      avgPen.wet += p.wet / stepsForPen;
      avgPen.wind += p.wind / stepsForPen;
      avgPen.cold += p.cold / stepsForPen;
      avgPen.heat += p.heat / stepsForPen;
      avgPen.frost += p.frost / stepsForPen;
    }

    // Metrics voor optimale starttijd
    const repH = Math.min(23, Math.max(0, Math.round(bestStart + roundHours / 2)));
    const rep = hourRows[repH];
    const spanHours = windowStartMax - windowStartMin;
    const scoreReason = buildScoreReason(avgPen, rep, bestScore);

    // Progressieve starttijd-label
    let teeTimeLabel = '';
    let flexibilityLabel = '';
    if (candidateStarts.length === 0 && d === 0) {
      teeTimeLabel = 'Te laat voor volledige ronde vóór donker';
      flexibilityLabel = 'Daglicht voorbij';
    } else if (d <= 1) {
      if (spanHours >= 2.25) {
        flexibilityLabel = 'Hele dag stabiel';
        teeTimeLabel = `Start ${formatDecimalHour(windowStartMin)} – ${formatDecimalHour(windowStartMax)}`;
      } else if (spanHours >= 0.75) {
        flexibilityLabel = 'Ruime keuze';
        teeTimeLabel = `Start ${formatDecimalHour(windowStartMin)} – ${formatDecimalHour(windowStartMax)}`;
      } else {
        flexibilityLabel = 'Scherp venster';
        teeTimeLabel = `Afslag ${formatDecimalHour(bestStart)} (finish ${formatDecimalHour(bestStart + roundHours)})`;
      }
    } else if (d <= 3) {
      const hFrom = Math.floor(windowStartMin);
      const hTo = Math.ceil(windowStartMax);
      teeTimeLabel = hTo - hFrom >= 2
        ? `Start tussen ${String(hFrom).padStart(2, '0')}:00 – ${String(hTo).padStart(2, '0')}:00`
        : `Rond ${String(Math.round(bestStart)).padStart(2, '0')}:00 uur`;
      flexibilityLabel = hTo - hFrom >= 2 ? 'Ruim venster' : 'Uur-indicatie';
    } else {
      if (spanHours >= 2.5) {
        teeTimeLabel = 'Hele dag geschikt';
        flexibilityLabel = 'Dagdeel-indicatie';
      } else if (bestStart < 12) {
        teeTimeLabel = 'Ochtend (09:00 – 12:30)';
        flexibilityLabel = 'Dagdeel-indicatie';
      } else {
        teeTimeLabel = 'Middag (12:30 – 16:00)';
        flexibilityLabel = 'Dagdeel-indicatie';
      }
    }

    // Datumlabels
    const dateObj = new Date(daily.sunrise[d]);
    const weekdayShort = dateObj.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '');
    const weekdayLong = dateObj.toLocaleDateString('nl-NL', { weekday: 'long' });
    const dateShort = dateObj.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
    const dayTitle = d === 0 ? 'Vandaag' : d === 1 ? 'Morgen' : weekdayLong.charAt(0).toUpperCase() + weekdayLong.slice(1);
    const dayPill = d === 0 ? 'Vandaag' : d === 1 ? 'Morgen' : weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1);

    const caddieTip = buildCaddieAdvice(rep, course, hourRows, bestStart, roundHours);
    const clothing = d <= 1 ? buildClothingAdvice(rep, course, bestStart) : null;

    days.push({
      dayIndex: d,
      dateIso: String(daily.sunrise[d]).slice(0, 10),
      dayTitle,
      dayPill,
      dateShort,
      score: bestScore,
      scoreReason,
      teeTimeLabel,
      flexibilityLabel,
      lightUntil: formatDecimalHour(playableLightEnd, false),
      sunriseStr: formatDecimalHour(sunriseDec, false),
      sunsetStr: formatDecimalHour(sunsetDec, false),
      sunriseDec,
      sunsetDec,
      twilightBonus,
      daylightDurationStr: formatDurationHours(sunsetDec - sunriseDec),
      playableLightEnd,
      hasPlayableWindow: candidateStarts.length > 0,
      earliestStart,
      latestStart,
      temp: rep.temp,
      appTemp: rep.appTemp,
      wind: rep.wind,
      gusts: rep.gusts,
      windDir: rep.windDir,
      precip: rep.precip,
      prob: rep.prob,
      code: rep.code,
      icon: weatherIcon(rep.code, rep.precip, rep.prob),
      hourRows,
      bestStart,
      roundHours,
      caddieTip,
      clothing
    });
  }

  return days;
}

function buildCaddieAdvice(rep, course, hourRows, bestStart, roundHours) {
  const tips = [];
  if (rep.temp <= 3) tips.push('Kans op nachtvorst/rijp: check wintergreens en reken op 1 tot 1,5 club minder lengte.');
  else if (rep.appTemp <= 9) tips.push(`Frisse omstandigheden (${rep.appTemp}°C gevoel): de bal vliegt ca. 5% minder ver, neem een extra club.`);
  else if (rep.appTemp >= 23) tips.push('Warme, droge lucht: de bal draagt verder en rolt extra door op de fairways.');

  if (rep.wind >= 22) tips.push(`Stevige wind (${rep.wind} km/u ${rep.windDir}, vlagen ${rep.gusts} km/u): sla lage punch-shots bij tegenwind.`);
  else if (course.windFactor <= 0.85) tips.push(`${course.name} ligt goed beschut tussen de bomen; houd hoog in de boomtoppen wel rekening met wind.`);
  else tips.push(`Open ligging op ${course.name}: let bij approach-shots extra op zijwind (${rep.windDir}).`);

  if (rep.prob >= 45 || rep.precip > 0.2) tips.push(`Regenkans ${rep.prob}%: zachtere greens, minder rol op de fairway.`);
  else tips.push('Droge greens met voorspelbare rol; ideale condities om aan te vallen op de vlag.');

  return tips.join(' ');
}

function buildClothingAdvice(rep, course, bestStart) {
  let top = '';
  let badge = '';

  if (rep.appTemp <= 4) {
    badge = '3 dunne lagen (thermo + wind)';
    top = 'Ademend thermoshirt + polo of dunne midlayer + lichte windstopper (niet te dik i.v.m. beweging).';
  } else if (rep.appTemp <= 9) {
    if (rep.wind >= 18) {
      badge = '3 dunne lagen (met bodywarmer)';
      top = 'Dun thermoshirt of polo + quarter-zip + winddichte bodywarmer (romp warm, armen vrij voor de swing).';
    } else {
      badge = '2 lagen (thermo/polo + trui)';
      top = 'Ademend thermoshirt of lange-mouw polo + quarter-zip trui (warm genoeg zodra je in beweging bent).';
    }
  } else if (rep.appTemp <= 14) {
    badge = 'Polo + quarter-zip';
    top = 'Golfpolo + lichte quarter-zip of dunne trui (makkelijk uit te trekken als het opwarmt).';
  } else if (rep.appTemp <= 18) {
    badge = 'Polo + lichte laag';
    top = 'Golfpolo + dun vest of lichte windbreaker voor de eerste holes.';
  } else {
    badge = 'Korte mouw / luchtig';
    top = 'Ademende golfpolo (korte mouw); zonnebrand mee.';
  }

  const bottom = rep.appTemp >= 21 && rep.prob < 25
    ? 'Golfshort + ademende lage golfsokken.'
    : 'Lange golfbroek; waterdichte golfschoenen aanbevolen i.v.m. dauw/vocht.';

  const acc = [];
  if (rep.appTemp <= 5) acc.push('muts/nekwarmer & winterhandschoenen');
  else if (rep.appTemp <= 8 && rep.wind >= 18) acc.push('dunne muts of oorwarmer voor de wind');
  if (rep.prob >= 35 || rep.precip > 0) acc.push('licht regenjack, stormparaplu & reservehandschoen');
  if (bestStart < 10.5) acc.push('extra dauwhanddoekje voor clubblad & bal');
  if (acc.length === 0) acc.push('pet/zonnebril & standaard golfhandschoen');

  return {
    badge,
    top,
    bottom,
    accessories: acc.join(', ') + '.'
  };
}

function recomputeAllAnalyses() {
  state.courses.forEach(c => {
    state.analysesByCourse[c.id] = analyzeCourse7Days(c);
  });
}

function findBestAlternative(dayIdx, currentCourseId) {
  const currentDays = state.analysesByCourse[currentCourseId];
  if (!currentDays || !currentDays[dayIdx]) return null;
  const curScore = currentDays[dayIdx].score;
  let bestAlt = null;
  state.courses.forEach(c => {
    if (c.id === currentCourseId) return;
    const d = state.analysesByCourse[c.id]?.[dayIdx];
    if (d && d.score >= curScore + 6 && (!bestAlt || d.score > bestAlt.score)) {
      bestAlt = { courseName: c.name, courseId: c.id, score: d.score, diff: d.score - curScore };
    }
  });
  return bestAlt;
}

// ==========================================
// 4. UI RENDERING
// ==========================================
function getAmsterdamTodayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

function getBookingCourses() {
  return state.courses.filter(c => c.booking && c.booking.url);
}

function getCourseBookingStatus(course, dateIso, overlapEndMins = null) {
  if (!course || !course.booking) return null;
  const b = course.booking;
  const todayIso = getAmsterdamTodayIso();

  let daysAhead = 0;
  let targetDate = null;
  if (dateIso) {
    const [ty, tm, td] = todayIso.split('-').map(Number);
    const [dy, dm, dd] = dateIso.split('-').map(Number);
    const tMs = Date.UTC(ty, tm - 1, td);
    const dMs = Date.UTC(dy, dm - 1, dd);
    daysAhead = Math.round((dMs - tMs) / 86400000);
    targetDate = new Date(dy, dm - 1, dd, 12, 0, 0);
  }

  let isOpenNow = true;
  let openFromLabel = '';
  if (b.advanceDays && dateIso && daysAhead > b.advanceDays) {
    isOpenNow = false;
    const [dy, dm, dd] = dateIso.split('-').map(Number);
    const openDt = new Date(dy, dm - 1, dd - b.advanceDays, 12, 0, 0);
    openFromLabel = `vanaf ${openDt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`;
  }

  let guestNote = '';
  if (b.guestWeekendHours && targetDate) {
    const dow = targetDate.getDay(); // 0=zo, 5=vr, 6=za
    if (dow === 0 || dow === 5 || dow === 6) {
      const month = targetDate.getMonth() + 1;
      const isWinter = month === 11 || month === 12 || month === 1 || month === 2;
      const guestStart = isWinter ? b.guestWeekendHours.winter : b.guestWeekendHours.summer;
      const guestStr = `${String(Math.floor(guestStart / 60)).padStart(2, '0')}:${String(guestStart % 60).padStart(2, '0')}`;
      if (overlapEndMins !== null && overlapEndMins <= guestStart) {
        guestNote = `gasten vanaf ${guestStr}`;
      }
    }
  }

  const effectiveDateIso = dateIso || todayIso;
  const isMember = Boolean(b.memberUntil && effectiveDateIso <= b.memberUntil);
  const resolvedUrl = (isMember && b.memberUrl) ? b.memberUrl : b.url;

  const analysisDay = dateIso
    ? (state.analysesByCourse[course.id] || []).find(day => day.dateIso === dateIso)
    : null;

  return {
    course,
    primary: b.primary !== false,
    shortName: b.shortName || course.name,
    url: resolvedUrl,
    system: b.system || '',
    rule: b.rule || '',
    advanceDays: b.advanceDays || null,
    daysAhead,
    isMember,
    memberBadge: isMember ? 'lid' : '',
    isOpenNow,
    openFromLabel,
    guestNote,
    weatherScore: analysisDay ? analysisDay.score : null
  };
}

function renderCourseSelector() {
  const sel = $('courseSelect');
  if (!sel) return;
  sel.innerHTML = state.courses.map(c =>
    `<option value="${c.id}" ${c.id === state.selectedCourseId ? 'selected' : ''}>${c.name} — ${c.city}</option>`
  ).join('');
  const active = state.courses.find(c => c.id === state.selectedCourseId);
  if (active && $('courseMeta')) {
    const shortType = active.typeLabel.replace(/\s*\([^)]*\)/g, '').trim();
    const baseText = `${shortType} · windfactor ${active.windFactor.toFixed(2)}×`;
    const bStatus = getCourseBookingStatus(active, getAmsterdamTodayIso());
    if (bStatus) {
      const label = bStatus.isMember
        ? `Starttijden (Lid · ${bStatus.system})`
        : `Starttijden (${bStatus.system})`;
      $('courseMeta').innerHTML = `${escapeHtml(baseText)} · <a href="${escapeHtml(bStatus.url)}" target="_blank" rel="noopener noreferrer" class="font-medium text-[#1b3a2d] hover:underline">${escapeHtml(label)} &nearr;</a>`;
    } else {
      $('courseMeta').textContent = baseText;
    }
  }
}

function renderApp() {
  renderCourseSelector();
  const singleCont = $('singleCourseContainer');
  const compareCont = $('compareCoursesContainer');
  const plannerCont = $('plannerContainer');
  const loadingBox = $('loadingBox');
  const hasWeather = Object.keys(state.analysesByCourse).length > 0;

  if (singleCont) singleCont.classList.remove('hidden');

  if (state.viewMode === 'planner') {
    if (loadingBox) loadingBox.classList.add('hidden');
    if (singleCont) singleCont.hidden = 'until-found';
    if (compareCont) compareCont.hidden = 'until-found';
    if (plannerCont) plannerCont.removeAttribute('hidden');
  } else if (state.viewMode === 'compare') {
    if (singleCont) singleCont.hidden = 'until-found';
    if (plannerCont) plannerCont.hidden = 'until-found';
    if (compareCont) compareCont.removeAttribute('hidden');
    if (hasWeather) renderCompareMatrix();
  } else {
    if (compareCont) compareCont.hidden = 'until-found';
    if (plannerCont) plannerCont.hidden = 'until-found';
    if (singleCont) {
      if (hasWeather) singleCont.removeAttribute('hidden');
      else singleCont.hidden = true;
    }
    if (hasWeather) renderSingleCourse();
  }

  if (window.SwingersPlanner && typeof window.SwingersPlanner.onWeatherOrSettingsUpdated === 'function') {
    window.SwingersPlanner.onWeatherOrSettingsUpdated();
  }
}

function buildCollapsedPlannerBadgeHtml(plannerRow) {
  if (!plannerRow) return '';
  if (plannerRow.confirmed) {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#163828] text-white font-mono-score">Bevestigd ${escapeHtml(plannerRow.confirmed)}</span>`;
  }
  if (plannerRow.potentieel === 'GOGOGO') {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#1b5e3d] text-white">3/3 GO</span>`;
  }
  if (plannerRow.potentieel === 'GO') {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f9f3e3] text-[#6d5120] border border-[#dec68e]">2/3 GO</span>`;
  }
  return '';
}

function buildDaylightVisualHtml(d, plannerRow) {
  const startHour = 7;
  const endHour = Math.max(20, Math.min(22, Math.floor(d.playableLightEnd) + 1));
  const spanStart = startHour;
  const spanEnd = endHour + 1;
  const totalSpan = spanEnd - spanStart;
  const pct = (val) => Math.max(0, Math.min(100, ((val - spanStart) / totalSpan) * 100));

  const visibleHours = d.hourRows.filter(r => r.hour >= startHour && r.hour <= endHour);

  const pDarkAmEnd = pct(d.sunriseDec);
  const pSunriseEnd = pct(Math.min(d.sunsetDec, d.sunriseDec + 0.35));
  const pDayEnd = pct(Math.max(d.sunriseDec + 0.35, d.sunsetDec - 0.35));
  const pSunsetEnd = pct(d.playableLightEnd);

  const segDarkAm = pDarkAmEnd;
  const segSunrise = Math.max(0, pSunriseEnd - pDarkAmEnd);
  const segDay = Math.max(0, pDayEnd - pSunriseEnd);
  const segSunset = Math.max(0, pSunsetEnd - pDayEnd);
  const segDarkPm = Math.max(0, 100 - pSunsetEnd);

  let bestOverlayHtml = '';
  if (d.hasPlayableWindow) {
    const bLeft = pct(d.bestStart);
    const bRight = pct(d.bestStart + d.roundHours);
    if (bRight > bLeft) {
      bestOverlayHtml = `<div class="daylight-best-marker" style="left:${bLeft.toFixed(2)}%;width:${(bRight - bLeft).toFixed(2)}%;" aria-hidden="true"></div>`;
    }
  }

  let overlapTrackHtml = '';
  if (plannerRow && (plannerRow.hasOverlap || plannerRow.count === 1 || plannerRow.confirmed)) {
    let barHtml = '';
    if (plannerRow.hasOverlap && plannerRow.overlapStart !== null && plannerRow.overlapEnd !== null) {
      const oLeft = pct(plannerRow.overlapStart / 60);
      const oRight = pct(plannerRow.overlapEnd / 60);
      const playersLabel = plannerRow.availMembers.map(m => m.shortName).join(' & ');
      if (oRight > oLeft) {
        barHtml += `
          <div class="overlap-timeline-bar overlap-timeline-bar-go" style="left:${oLeft.toFixed(2)}%;width:${Math.max(8, oRight - oLeft).toFixed(2)}%;">
            ${escapeHtml(playersLabel)} · ${escapeHtml(plannerRow.overlapText)}
          </div>
        `;
      }
    } else if (plannerRow.count === 1 && plannerRow.availMembers[0]) {
      const solo = plannerRow.availMembers[0];
      const pSolo = plannerRow.parsed[solo.key];
      const oLeft = pct(pSolo.startMins / 60);
      const oRight = pct(pSolo.endMins / 60);
      if (oRight > oLeft) {
        barHtml += `
          <div class="overlap-timeline-bar overlap-timeline-bar-solo" style="left:${oLeft.toFixed(2)}%;width:${Math.max(8, oRight - oLeft).toFixed(2)}%;">
            Alleen ${escapeHtml(solo.shortName)} (${escapeHtml(pSolo.summary)})
          </div>
        `;
      }
    }

    if (plannerRow.confirmed) {
      const m = String(plannerRow.confirmed).match(/(\d{1,2})[:.](\d{2})/);
      if (m) {
        const cDec = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
        const cLeft = pct(cDec);
        barHtml += `<div class="overlap-timeline-confirmed-pin" style="left:${cLeft.toFixed(2)}%;" title="Bevestigde starttijd ${escapeHtml(plannerRow.confirmed)}" aria-hidden="true"></div>`;
      }
    }

    if (barHtml) {
      overlapTrackHtml = `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[11px] text-[#66706a]">
            <span>Beschikbaarheid op daglicht-as</span>
            ${plannerRow.confirmed ? `<span class="font-mono-score font-medium text-[#18241e]">Bevestigd ${escapeHtml(plannerRow.confirmed)}</span>` : ''}
          </div>
          <div class="overlap-timeline-track">${barHtml}</div>
        </div>
      `;
    }
  }

  const barAriaLabel = `Daglichtperiode op ${d.dayTitle} van ${String(startHour).padStart(2, '0')}:00 tot ${String(spanEnd).padStart(2, '0')}:00: zonsopgang om ${d.sunriseStr}, zonsondergang om ${d.sunsetStr}, speelbaar licht tot ${d.lightUntil}.`;

  const tilesHtml = visibleHours.map(r => {
    const hb = scoreBadgeMeta(r.score);
    const phase = getHourLightPhase(r.hour, d.sunriseDec, d.sunsetDec, d.playableLightEnd);
    const inBest = d.hasPlayableWindow && phase !== 'dark' && r.hour >= Math.floor(d.bestStart) && r.hour < Math.ceil(d.bestStart + d.roundHours);

    const phaseMeta = phase === 'daylight'
      ? { cls: 'hour-tile-daylight', label: 'Daglicht' }
      : phase === 'sunrise'
        ? { cls: 'hour-tile-twilight', label: 'Zonsopgang' }
        : phase === 'sunset'
          ? { cls: 'hour-tile-twilight', label: 'Schemering' }
          : { cls: 'hour-tile-dark', label: 'Donker' };

    return `
      <div class="hour-tile ${phaseMeta.cls} ${inBest ? 'hour-tile-best' : ''}">
        <div class="text-[10px] font-mono-score font-medium text-[#535d57] mb-1">
          <span>${String(r.hour).padStart(2, '0')}u</span>${inBest ? '<span class="text-[#b89652] ml-0.5" aria-hidden="true">★</span>' : ''}
          <span class="visually-hidden">${phaseMeta.label}${inBest ? ', beste speelvenster' : ''}</span>
        </div>
        <div class="font-mono-score text-xs font-semibold py-0.5 px-1 rounded border" style="${hb.tintStyle}">${r.score}</div>
        <div class="text-[10px] font-mono-score mt-1">${r.temp}°</div>
        <div class="hour-tile-sub text-[9px] font-mono-score">${r.prob}%</div>
      </div>
    `;
  }).join('');

  return `
    <div class="bg-white rounded-lg p-3.5 border border-[#e6e3db] space-y-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-xs font-semibold text-[#18241e]">Verloop per uur</h3>
        <span class="text-[11px] text-[#66706a] font-mono-score">${String(startHour).padStart(2, '0')}:00 – ${String(endHour).padStart(2, '0')}:00</span>
      </div>

      <div class="space-y-2">
        <div class="daylight-track" role="img" aria-label="${escapeHtml(barAriaLabel)}">
          ${segDarkAm > 0 ? `<div class="daylight-seg daylight-seg-dark" style="width:${segDarkAm.toFixed(2)}%"></div>` : ''}
          ${segSunrise > 0 ? `<div class="daylight-seg daylight-seg-sunrise" style="width:${segSunrise.toFixed(2)}%"></div>` : ''}
          ${segDay > 0 ? `<div class="daylight-seg daylight-seg-day" style="width:${segDay.toFixed(2)}%"></div>` : ''}
          ${segSunset > 0 ? `<div class="daylight-seg daylight-seg-sunset" style="width:${segSunset.toFixed(2)}%"></div>` : ''}
          ${segDarkPm > 0 ? `<div class="daylight-seg daylight-seg-dark" style="width:${segDarkPm.toFixed(2)}%"></div>` : ''}
          ${bestOverlayHtml}
        </div>
        ${overlapTrackHtml}
      </div>

      <div class="hourly-grid" style="--hour-cols: ${visibleHours.length};">
        ${tilesHtml}
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#66706a]">
        <span class="inline-flex items-center gap-1.5"><span class="daylight-legend-swatch daylight-swatch-day" aria-hidden="true"></span>Daglicht</span>
        <span class="inline-flex items-center gap-1.5"><span class="daylight-legend-swatch daylight-swatch-twilight" aria-hidden="true"></span>Schemering</span>
        <span class="inline-flex items-center gap-1.5"><span class="daylight-legend-swatch daylight-swatch-dark" aria-hidden="true"></span>Donker</span>
        <span class="inline-flex items-center gap-1.5"><span class="daylight-legend-swatch daylight-swatch-best" aria-hidden="true"></span>Beste venster</span>
      </div>
    </div>
  `;
}

function buildDayPlayersCardHtml(d, plannerRow, members, activeMember, course) {
  if (!plannerRow || !members) return '';
  const activeCourse = course || state.courses.find(c => c.id === state.selectedCourseId) || state.courses[0];

  let statusPill = '';
  if (plannerRow.confirmed) {
    statusPill = `<span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#163828] text-white font-mono-score">Bevestigd ${escapeHtml(plannerRow.confirmed)}</span>`;
  } else if (plannerRow.potentieel === 'GOGOGO') {
    statusPill = `<span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#1b5e3d] text-white">GOGOGO · 3/3</span>`;
  } else if (plannerRow.potentieel === 'GO') {
    statusPill = `<span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#f9f3e3] text-[#6d5120] border border-[#dec68e]">GO · 2/3</span>`;
  } else if (plannerRow.count >= 2 && !plannerRow.hasOverlap) {
    statusPill = `<span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#f5f4f0] text-[#626059] border border-[#e4e1d8]">Geen overlap</span>`;
  } else if (plannerRow.count === 1 && plannerRow.availMembers[0]) {
    statusPill = `<span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#f2f0ea] text-[#535d57]">Alleen ${escapeHtml(plannerRow.availMembers[0].shortName)}</span>`;
  } else if (plannerRow.drMembers?.length > 0) {
    statusPill = `<span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#f6f4f8] text-[#4a3761] border border-[#d9d0e3]">Driving Range</span>`;
  }

  const playerCardsHtml = members.map(m => {
    const p = plannerRow.parsed[m.key];
    const isActive = activeMember === m.key;
    const primaryVal = p.displayLabel ? p.displayLabel : 'Invullen';
    const ariaLabel = `${m.name} op ${d.dayTitle} ${d.dateShort}: ${p.summary}, klik om beschikbaarheid te bewerken`;

    return `
      <button type="button"
        data-course-edit-member="${m.key}"
        data-course-edit-date="${d.dateIso}"
        aria-label="${escapeHtml(ariaLabel)}"
        class="avail-cell-btn course-player-btn ${p.cssClass} ${isActive ? 'avail-active-member' : ''}">
        <span class="block text-[11px] opacity-80">${escapeHtml(m.name)}</span>
        <span class="block text-xs font-medium truncate mt-0.5">${escapeHtml(primaryVal)}</span>
      </button>
    `;
  }).join('');

  const infoLines = [];
  if (plannerRow.confirmed) {
    infoLines.push(`<span class="font-medium text-[#18241e]">Starttijd <span class="font-mono-score">${escapeHtml(plannerRow.confirmed)}</span></span>`);
  }
  if (plannerRow.hasOverlap && plannerRow.overlapText) {
    infoLines.push(`<span>Overlap <span class="font-mono-score font-medium text-[#18241e]">${escapeHtml(plannerRow.overlapText)}</span></span>`);
    if (plannerRow.partialPairTip) {
      infoLines.push(`<span class="text-[#755c2e]">${escapeHtml(plannerRow.partialPairTip)}</span>`);
    }
    if (plannerRow.weatherOverlap?.possible) {
      infoLines.push(`
        <span class="text-[#1b3a2d] font-medium">
          ${escapeHtml(plannerRow.weatherOverlap.label)} · score <span class="font-mono-score">${plannerRow.weatherOverlap.score}</span>
        </span>
      `);
    } else if (plannerRow.weatherOverlap && !plannerRow.weatherOverlap.possible) {
      infoLines.push(`<span class="text-[#66706a]">${escapeHtml(plannerRow.weatherOverlap.reason)}</span>`);
    }
  } else if (plannerRow.count >= 2 && !plannerRow.hasOverlap) {
    const names = (plannerRow.allAvailMembers || plannerRow.availMembers || []).map(m => m.shortName).join(' & ');
    infoLines.push(`<span class="text-[#72363a]">Geen overlappende tijden${names ? ` (${escapeHtml(names)})` : ''}</span>`);
  } else if (plannerRow.singleAvailNote) {
    infoLines.push(`<span class="text-[#66706a]">${escapeHtml(plannerRow.singleAvailNote)}</span>`);
  }

  if (plannerRow.drNote) {
    infoLines.push(`<span class="text-[#4a3761]">${escapeHtml(plannerRow.drNote)}</span>`);
  }
  if (plannerRow.bookerMember) {
    infoLines.push(`<button type="button" data-course-edit-booker="${escapeHtml(plannerRow.dateIso)}" class="inline-flex items-center gap-1 text-[#18241e] hover:underline">Booker: <strong class="font-medium">${escapeHtml(plannerRow.bookerMember.name)}</strong> <span class="text-[10px] text-[#66706a]" aria-hidden="true">${plannerRow.bookerManual ? '✎' : '🎲'}</span></button>`);
  }
  if (plannerRow.note) {
    infoLines.push(`<span class="text-[#535d57]">${escapeHtml(plannerRow.note)}</span>`);
  }

  const suggestedTee = plannerRow.weatherOverlap?.possible
    ? plannerRow.weatherOverlap.bestStartStr
    : (plannerRow.hasOverlap && plannerRow.overlapStart !== null
      ? formatDecimalHour(plannerRow.overlapStart / 60, false)
      : '');
  const confirmBtnLabel = plannerRow.confirmed
    ? 'Wijzig bevestiging'
    : (plannerRow.potentieel && plannerRow.hasOverlap ? 'Bevestig tee time' : 'Notitie');

  const bookingStatus = getCourseBookingStatus(
    activeCourse,
    d.dateIso,
    plannerRow.hasOverlap ? plannerRow.overlapEnd : null
  );
  const bookingBtnHtml = bookingStatus ? `
    <a href="${escapeHtml(bookingStatus.url)}" target="_blank" rel="noopener noreferrer"
      title="${escapeHtml(bookingStatus.rule)}"
      class="course-action-btn inline-flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#d6cfc0] bg-[#faf9f5] text-[#1b3a2d] hover:border-[#1b3a2d] transition">
      <span>Starttijden</span>
      ${bookingStatus.isMember ? `<span class="text-[10px] font-semibold text-[#1b5e3d]">(lid)</span>` : ''}
      ${!bookingStatus.isOpenNow ? `<span class="text-[10px] text-[#66706a]">(${escapeHtml(bookingStatus.openFromLabel)})</span>` : ''}
      <span aria-hidden="true">&nearr;</span>
    </a>
  ` : '';

  return `
    <div class="bg-white rounded-lg p-3.5 border border-[#e6e3db] space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-xs font-semibold text-[#18241e]">Beschikbaarheid</h3>
          ${statusPill}
        </div>
        <button type="button" data-open-planner-date="${d.dateIso}" class="course-action-btn px-2 py-1 rounded-md text-xs font-medium text-[#1b3a2d] hover:bg-[#f2f0ea] transition">
          Swingersclub &rarr;
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        ${playerCardsHtml}
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#e6e3db] text-xs text-[#535d57]">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          ${infoLines.join('<span class="text-[#cfc9bc]" aria-hidden="true">·</span>')}
        </div>
        <div class="flex flex-wrap items-center gap-1.5 shrink-0">
          ${bookingBtnHtml}
          <button type="button"
            data-course-edit-confirm="${d.dateIso}"
            data-suggested-tee="${escapeHtml(suggestedTee)}"
            class="course-action-btn shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              plannerRow.confirmed
                ? 'bg-[#163828] text-white hover:bg-[#214e39]'
                : 'border border-[#8c867b] bg-white text-[#18241e] hover:bg-[#f2f0ea]'
            }">
            ${confirmBtnLabel}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSingleCourse() {
  const course = state.courses.find(c => c.id === state.selectedCourseId) || state.courses[0];
  const days = state.analysesByCourse[course.id] || [];
  if (!days.length) return;

  const plannerData = window.SwingersPlanner?.getScheduleMapByDate?.() || null;

  let bestDay = days[0];
  days.forEach(d => { if (d.score > bestDay.score) bestDay = d; });

  // 1. Sticky Snel 7-Daags Overzicht
  const strip = $('quickDayStrip');
  if (strip) {
    strip.innerHTML = days.map(d => {
      const isSelected = d.dayIndex === state.expandedDayIndex;
      const isBest = d.dayIndex === bestDay.dayIndex;
      const badge = scoreBadgeMeta(d.score);
      const pRow = plannerData?.byDate?.[d.dateIso] || null;
      const svgIcon = weatherSvgIcon(d.code, d.precip, d.prob, 'w-4 h-4', isSelected);

      let microLineHtml = '';
      if (pRow) {
        if (pRow.confirmed) {
          microLineHtml = `<span class="mt-0.5 font-mono-score text-[10px] font-medium ${isSelected ? 'text-[#e2c891]' : 'text-[#163828]'}">✓ ${escapeHtml(pRow.confirmed)}</span>`;
        } else if (pRow.potentieel === 'GOGOGO') {
          microLineHtml = `<span class="mt-0.5 text-[10px] font-medium ${isSelected ? 'text-[#e2c891]' : 'text-[#1b4332]'}">3/3 GO</span>`;
        } else if (pRow.potentieel === 'GO') {
          microLineHtml = `<span class="mt-0.5 text-[10px] font-medium ${isSelected ? 'text-[#e2c891]' : 'text-[#755c2e]'}">2/3 GO</span>`;
        }
      }

      return `
        <button type="button" data-jumpday="${d.dayIndex}"
          class="min-w-[64px] rounded-xl px-2 py-2 text-center border transition flex flex-col items-center justify-center gap-1 ${
            isSelected
              ? 'bg-[#163828] text-white border-[#b89652]'
              : 'bg-white text-[#535d57] border-[#e4dfd3] hover:border-[#163828]/50'
          }">
          <span class="inline-flex items-center gap-1 text-[11px] font-medium">
            <span>${d.dayPill}</span>
            ${isBest ? `<span class="${isSelected ? 'text-[#e2c891]' : 'text-[#8f723d]'}" title="Beste dag" aria-hidden="true">★</span><span class="visually-hidden">(beste dag)</span>` : ''}
          </span>
          ${svgIcon}
          <span class="inline-flex items-center gap-1.5 font-mono-score text-sm font-semibold ${isSelected ? 'text-white' : 'text-[#18241e]'}">
            ${!isSelected ? `<span class="w-2 h-2 rounded-full shrink-0" style="${badge.dotStyle}" aria-hidden="true"></span>` : ''}
            <span>${d.score}</span>
          </span>
          ${microLineHtml}
        </button>
      `;
    }).join('');

    strip.querySelectorAll('button[data-jumpday]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.jumpday, 10);
        jumpToDay(idx);
      });
    });
  }

  // 2. Beste Speeldag Samenvatting (Clubhouse Focal Card)
  const banner = $('bestWeekBanner');
  if (banner) {
    const bMeta = scoreBadgeMeta(bestDay.score);
    banner.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1 min-w-0">
          <div class="inline-flex items-center gap-1.5 text-xs font-medium text-[#e2c891]">
            <svg class="w-3.5 h-3.5 shrink-0" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M6 20V4l10 3.5L6 11" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M4 20h4" stroke-linecap="round"/>
            </svg>
            <span>Beste speeldag</span>
          </div>
          <h2 class="font-serif-club text-lg sm:text-xl font-semibold text-white leading-snug">
            ${bestDay.dayTitle} ${bestDay.dateShort} — ${bestDay.teeTimeLabel}
          </h2>
          <p class="text-xs text-[#d4e2da]">
            ${bestDay.temp}°C · ${bestDay.wind} km/u ${bestDay.windDir} · ${bestDay.prob}% regen · licht tot ${bestDay.lightUntil}
          </p>
        </div>
        <div class="shrink-0">
          <div class="inline-flex flex-col items-center px-3.5 py-2 rounded-lg bg-white/10 border border-[#b89652]/50 text-white">
            <span class="font-mono-score text-xl font-semibold leading-none">${bestDay.score}</span>
            <span class="text-[11px] font-medium text-[#e2c891] mt-1">${bMeta.label}</span>
          </div>
        </div>
      </div>
    `;
  }

  // 3. 7 Dagkaarten (max 2 rustige regels ingeklapt)
  const list = $('daysList');
  if (list) {
    list.innerHTML = days.map(d => {
      const isOpen = d.dayIndex === state.expandedDayIndex;
      const badge = scoreBadgeMeta(d.score);
      const alt = findBestAlternative(d.dayIndex, course.id);
      const pRow = plannerData?.byDate?.[d.dateIso] || null;
      const collapsedStatusHtml = buildCollapsedPlannerBadgeHtml(pRow);
      const dayIconSvg = weatherSvgIcon(d.code, d.precip, d.prob, 'w-5 h-5');
      const scorePillStyle = d.score >= 82 ? `${badge.bgStyle} border-color: ${badge.hex};` : badge.tintStyle;

      return `
        <article id="day-card-${d.dayIndex}" class="bg-white rounded-xl border ${isOpen ? 'border-[#163828]' : 'border-[#e6e3db]'} overflow-hidden transition">
          <button type="button" data-toggle-day="${d.dayIndex}" aria-expanded="${isOpen}" class="day-card-toggle w-full text-left px-4 py-3.5 sm:px-5 cursor-pointer hover:bg-[#faf9f5] transition flex items-center justify-between gap-4">
            <span class="flex items-center gap-3.5 min-w-0">
              ${dayIconSvg}
              <span class="block min-w-0 space-y-1">
                <span class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span class="font-serif-club text-base font-semibold text-[#18241e]">${d.dayTitle}</span>
                  <span class="text-xs text-[#66706a]">${d.dateShort}</span>
                  ${collapsedStatusHtml}
                </span>
                <span class="block text-xs text-[#535d57]">
                  <span class="font-medium text-[#163828]">${d.teeTimeLabel}</span>
                  <span class="text-[#cfc9bc] mx-1" aria-hidden="true">·</span>
                  <span class="font-mono-score">${d.temp}°C</span>
                  <span class="text-[#cfc9bc] mx-1" aria-hidden="true">·</span>
                  <span>${d.wind} km/u ${d.windDir}</span>
                  <span class="text-[#cfc9bc] mx-1" aria-hidden="true">·</span>
                  <span>${d.prob}% regen</span>
                </span>
              </span>
            </span>

            <span class="flex items-center gap-3 shrink-0">
              <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg border font-mono-score text-sm font-semibold min-w-[2.75rem]" style="${scorePillStyle}">
                ${d.score}
              </span>
              <svg class="w-4 h-4 text-[#66706a] transition-transform ${isOpen ? 'rotate-180' : ''}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
              </svg>
            </span>
          </button>

          ${isOpen ? `
            <div class="border-t border-[#e6e3db] bg-[#faf8f3] p-4 sm:p-5 space-y-4">
              <!-- Top editoriale inzichten -->
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-1 text-xs text-[#535d57] prose-note">
                  <p class="text-[#18241e] font-medium">${d.scoreReason}</p>
                  <p class="text-[#66706a]">
                    Daglicht ${d.sunriseStr}–${d.sunsetStr}${d.twilightBonus > 0 ? `, licht tot ${d.lightUntil}` : ''}${alt ? ` · Beter op ${alt.courseName} (${alt.score})` : ''}
                  </p>
                </div>
                <button type="button" data-share-day="${d.dayIndex}" class="course-action-btn px-2.5 py-1 rounded-md text-xs font-medium text-[#1b3a2d] hover:bg-[#f2f0ea] transition shrink-0">
                  Deel dagkaart
                </button>
              </div>

              <!-- Verloop per uur & daglicht -->
              ${buildDaylightVisualHtml(d, pRow)}

              <!-- Swingersclub beschikbaarheid -->
              ${buildDayPlayersCardHtml(d, pRow, plannerData?.members, plannerData?.activeMember, course)}

              <!-- Inklapbaar Caddie- & Kledingadvies -->
              <details class="advice-disclosure bg-white rounded-lg border border-[#e6e3db] px-3.5 py-2.5">
                <summary class="flex items-center justify-between gap-2 text-xs font-medium text-[#18241e] py-0.5">
                  <span>
                    Caddie- &amp; kledingadvies
                    ${d.clothing ? `<span class="text-[#66706a] font-normal"> · ${escapeHtml(d.clothing.badge)}</span>` : ''}
                  </span>
                  <svg class="disclosure-chevron w-4 h-4 text-[#66706a] transition-transform shrink-0" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
                  </svg>
                </summary>
                <div class="mt-3 pt-3 border-t border-[#e6e3db] grid grid-cols-1 ${d.clothing ? 'md:grid-cols-2' : ''} gap-4 text-xs text-[#535d57] leading-relaxed">
                  <div class="space-y-1 advice-copy">
                    <h4 class="font-semibold text-[#18241e]">Caddie</h4>
                    <p>${d.caddieTip}</p>
                  </div>
                  ${d.clothing ? `
                    <div class="space-y-1 advice-copy">
                      <h4 class="font-semibold text-[#18241e]">Kleding</h4>
                      <p>${d.clothing.top} ${d.clothing.bottom}</p>
                      <p class="text-[#66706a]">Tas: ${d.clothing.accessories}</p>
                    </div>
                  ` : ''}
                </div>
              </details>
            </div>
          ` : ''}
        </article>
      `;
    }).join('');

    list.querySelectorAll('[data-toggle-day]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.toggleDay, 10);
        state.expandedDayIndex = state.expandedDayIndex === idx ? -1 : idx;
        renderSingleCourse();
      });
    });

    list.querySelectorAll('[data-share-day]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.shareDay, 10);
        openShareModal('day', idx);
      });
    });

    list.querySelectorAll('[data-course-edit-member]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.SwingersPlanner?.openEditor?.({
          mode: 'member',
          dateIso: btn.dataset.courseEditDate,
          memberKey: btn.dataset.courseEditMember
        });
      });
    });

    list.querySelectorAll('[data-course-edit-booker]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.SwingersPlanner?.openEditor?.({
          mode: 'booker',
          dateIso: btn.dataset.courseEditBooker
        });
      });
    });

    list.querySelectorAll('[data-course-edit-confirm]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.SwingersPlanner?.openEditor?.({
          mode: 'confirm',
          dateIso: btn.dataset.courseEditConfirm,
          suggestedTee: btn.dataset.suggestedTee || ''
        });
      });
    });

    list.querySelectorAll('[data-open-planner-date]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.SwingersPlanner?.jumpToDate?.(btn.dataset.openPlannerDate);
      });
    });
  }
}

function jumpToDay(dayIndex) {
  state.expandedDayIndex = dayIndex;
  renderSingleCourse();
  requestAnimationFrame(() => {
    const card = $(`day-card-${dayIndex}`);
    if (card) {
      const yOffset = -115;
      const y = card.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      card.classList.add('pulse-gold');
      setTimeout(() => card.classList.remove('pulse-gold'), 1200);
    }
  });
}

function renderCompareMatrix() {
  const table = $('compareTable');
  if (!table) return;
  const refDays = state.analysesByCourse[state.courses[0].id] || [];
  if (!refDays.length) return;

  const dayMaxScores = refDays.map((_, dIdx) => {
    let max = 0;
    state.courses.forEach(c => {
      const s = state.analysesByCourse[c.id]?.[dIdx]?.score ?? 0;
      if (s > max) max = s;
    });
    return max;
  });

  let thead = `<thead class="bg-[#1b3b2c] text-[#f4f1e8] border-b-2 border-[#b89652]"><tr>
    <th class="py-2.5 pl-4 pr-3 font-semibold">Golfbaan</th>
    ${refDays.map(d => `<th class="py-2.5 px-1.5 text-center font-semibold">${d.dayPill}<br><span class="font-normal text-[11px] text-[#d4e2da]">${d.dateShort}</span></th>`).join('')}
  </tr></thead>`;

  let tbody = '<tbody class="divide-y divide-[#e6e3db]">';
  state.courses.forEach(c => {
    const cDays = state.analysesByCourse[c.id] || [];
    tbody += `<tr class="hover:bg-[#faf9f5]">
      <td class="py-3 pl-4 pr-3 font-medium text-[#18241e] whitespace-nowrap">
        ${c.name}<div class="text-[11px] font-normal text-[#66706a]">${c.city}</div>
      </td>
      ${cDays.map((d, dIdx) => {
        const b = scoreBadgeMeta(d.score);
        const isHighlighted = d.score >= 82 || d.score === dayMaxScores[dIdx];
        return `<td class="py-2.5 px-1 text-center">
          <button type="button" data-pick-course="${c.id}" data-pick-day="${d.dayIndex}"
            class="w-full py-1.5 px-1.5 rounded-lg border font-mono-score text-xs transition hover:opacity-90 ${isHighlighted ? 'font-bold ring-1 ring-[#1b5e3d]/40' : 'font-medium'}" style="${b.tintStyle}">
            ${d.score}
          </button>
        </td>`;
      }).join('')}
    </tr>`;
  });
  tbody += '</tbody>';
  table.innerHTML = thead + tbody;

  table.querySelectorAll('button[data-pick-course]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedCourseId = btn.dataset.pickCourse;
      state.expandedDayIndex = parseInt(btn.dataset.pickDay, 10);
      setViewMode('single');
      jumpToDay(state.expandedDayIndex);
    });
  });
}

// ==========================================
// 5. VISUELE 2X RETINA PNG SCORECARD GENERATOR
// ==========================================
function openShareModal(mode = 'week', dayIdx = 0) {
  state.shareMode = mode;
  state.shareDayIndex = dayIdx;
  const modal = $('shareModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  updateShareModeButtons();
  renderScorecardPng();
}

function closeShareModal() {
  const modal = $('shareModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if ($('shareStatusMsg')) $('shareStatusMsg').classList.add('hidden');
}

function updateShareModeButtons() {
  document.querySelectorAll('.share-mode-btn').forEach(btn => {
    const active = btn.dataset.sharemode === state.shareMode;
    btn.className = `share-mode-btn py-1.5 px-2 rounded-md text-xs transition ${
      active ? 'font-semibold bg-white text-[#18241e] shadow-sm' : 'font-medium text-[#535d57] hover:text-[#18241e]'
    }`;
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function renderScorecardPng() {
  const course = state.courses.find(c => c.id === state.selectedCourseId) || state.courses[0];
  const days = state.analysesByCourse[course.id] || [];
  if (!days.length) return;

  const showTips = $('chkShareTips')?.checked ?? true;
  const showAlts = $('chkShareAlts')?.checked ?? true;

  const canvas = document.createElement('canvas');
  const scale = 2;
  const W = 760;
  const H = state.shareMode === 'day'
    ? 580
    : state.shareMode === 'matrix'
      ? Math.max(600, 214 + state.courses.length * 96)
      : 940;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Achtergrond
  ctx.fillStyle = '#f6f5f0';
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = '#1b3a2d';
  ctx.fillRect(0, 0, W, 118);
  ctx.fillStyle = '#8f723d';
  ctx.fillRect(0, 115, W, 3);

  ctx.fillStyle = '#e2d4b7';
  ctx.font = '600 11px Inter, sans-serif';
  ctx.fillText('GOLFWEER SCORECARD', 28, 34);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px Georgia, serif';
  const titleText = state.shareMode === 'matrix'
    ? 'Banen vergelijken'
    : state.shareMode === 'day'
      ? `${days[state.shareDayIndex].dayTitle} (${days[state.shareDayIndex].dateShort}) — ${course.name}`
      : `7-Daags Golfweer — ${course.name}`;
  ctx.fillText(titleText, 28, 68);

  ctx.fillStyle = '#d3e2d9';
  ctx.font = '500 13px Inter, sans-serif';
  ctx.fillText(`${course.city} · ${state.holes} holes (${state.holes === 9 ? '2,0' : '4,0'} uur) · ${days[0].dateShort} t/m ${days[6].dateShort}`, 28, 95);

  if (state.shareMode === 'week') {
    let best = days[0];
    days.forEach(d => { if (d.score > best.score) best = d; });

    // Beste dag highlight
    roundRectPath(ctx, 28, 136, W - 56, 74, 12);
    ctx.fillStyle = '#1b3a2d';
    ctx.fill();
    ctx.strokeStyle = '#8f723d';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#e2d4b7';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText('Beste speeldag', 44, 158);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(`${best.dayTitle} (${best.dateShort}) — ${best.teeTimeLabel}`, 44, 182);
    ctx.fillStyle = '#d3e2d9';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`Licht tot ${best.lightUntil} · ${best.temp}°C · Wind ${best.wind} km/u ${best.windDir} · Regenkans ${best.prob}%`, 44, 200);

    const bMeta = scoreBadgeMeta(best.score);
    roundRectPath(ctx, W - 118, 148, 74, 50, 10);
    ctx.fillStyle = bMeta.hex;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(best.score), W - 81, 176);
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillText(bMeta.label, W - 81, 191);
    ctx.textAlign = 'left';

    // 7 rijen
    let y = 226;
    days.forEach(d => {
      roundRectPath(ctx, 28, y, W - 56, 88, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#e6e3db';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#18241e';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillText(d.dayTitle, 44, y + 28);
      ctx.fillStyle = '#66706a';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(`${d.dateShort} · Licht tot ${d.lightUntil}`, 44, y + 48);

      ctx.fillStyle = '#1b3a2d';
      ctx.font = '600 14px Inter, sans-serif';
      ctx.fillText(d.teeTimeLabel, 215, y + 26);

      ctx.fillStyle = '#535d57';
      ctx.font = '12px Inter, sans-serif';
      let subLine = `${d.temp}°C (gevoel ${d.appTemp}°C) · Wind ${d.wind} km/u ${d.windDir} · Regen ${d.prob}%`;
      if (showTips && d.clothing) subLine += ` · ${d.clothing.badge}`;
      ctx.fillText(subLine, 215, y + 45);

      ctx.fillStyle = '#66706a';
      ctx.font = 'italic 11px Inter, sans-serif';
      ctx.fillText(d.scoreReason, 215, y + 63);

      if (showAlts) {
        const alt = findBestAlternative(d.dayIndex, course.id);
        if (alt) {
          ctx.fillStyle = '#755c2e';
          ctx.font = '600 11px Inter, sans-serif';
          ctx.fillText(`Tip: ${alt.courseName} scoort ${alt.score}/100 (+${alt.diff} pt)`, 215, y + 80);
        }
      }

      const dm = scoreBadgeMeta(d.score);
      roundRectPath(ctx, W - 114, y + 18, 70, 52, 10);
      ctx.fillStyle = dm.hex;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 21px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(d.score), W - 79, y + 45);
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText(dm.label, W - 79, y + 60);
      ctx.textAlign = 'left';

      y += 96;
    });
  } else if (state.shareMode === 'day') {
    const d = days[state.shareDayIndex] || days[0];
    const dm = scoreBadgeMeta(d.score);

    roundRectPath(ctx, 28, 138, W - 56, 390, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e6e3db';
    ctx.stroke();

    ctx.fillStyle = '#1b3a2d';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(d.teeTimeLabel, 48, 178);

    ctx.fillStyle = '#535d57';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`${d.temp}°C (gevoel ${d.appTemp}°C)  ·  Wind ${d.wind} km/u ${d.windDir}  ·  Regen ${d.prob}%  ·  Licht tot ${d.lightUntil}`, 48, 206);

    ctx.fillStyle = '#18241e';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(d.scoreReason, 48, 234);

    roundRectPath(ctx, W - 134, 154, 86, 62, 10);
    ctx.fillStyle = dm.hex;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(d.score), W - 91, 188);
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText(dm.label, W - 91, 206);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#18241e';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText('Caddie baanadvies', 48, 274);
    ctx.fillStyle = '#535d57';
    ctx.font = '13px Inter, sans-serif';
    wrapCanvasText(ctx, d.caddieTip, 48, 296, W - 96, 19);

    if (d.clothing) {
      ctx.fillStyle = '#18241e';
      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText('Kledingadvies', 48, 385);
      ctx.fillStyle = '#535d57';
      ctx.font = '13px Inter, sans-serif';
      wrapCanvasText(ctx, `${d.clothing.top} ${d.clothing.bottom}`, 48, 407, W - 96, 19);
    }
  } else {
    // Matrix mode
    let y = 142;
    const refDays = state.analysesByCourse[state.courses[0].id] || [];
    ctx.fillStyle = '#535d57';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('Golfbaan', 34, y + 18);
    refDays.forEach((rd, idx) => {
      ctx.textAlign = 'center';
      ctx.fillText(`${rd.dayPill} (${rd.dateShort})`, 265 + idx * 68, y + 18);
    });
    ctx.textAlign = 'left';
    y += 32;

    state.courses.forEach(c => {
      roundRectPath(ctx, 28, y, W - 56, 86, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#e6e3db';
      ctx.stroke();

      ctx.fillStyle = '#18241e';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.fillText(c.name, 42, y + 36);
      ctx.fillStyle = '#66706a';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(c.city, 42, y + 54);

      const cDays = state.analysesByCourse[c.id] || [];
      cDays.forEach((cd, idx) => {
        const m = scoreBadgeMeta(cd.score);
        const cx = 240 + idx * 68;
        roundRectPath(ctx, cx, y + 20, 50, 44, 8);
        ctx.fillStyle = m.hex;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(cd.score), cx + 25, y + 47);
        ctx.textAlign = 'left';
      });

      y += 96;
    });
  }

  // Footer
  ctx.fillStyle = '#66706a';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('Golfweer Planner · Open-Meteo', 28, H - 18);
  ctx.textAlign = 'right';
  ctx.fillText('Wie haakt er aan?', W - 28, H - 18);
  ctx.textAlign = 'left';

  state.lastPngDataUrl = canvas.toDataURL('image/png');
  const img = $('sharePreviewImg');
  if (img) img.src = state.lastPngDataUrl;
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
}

function buildWhatsAppTextSummary() {
  const course = state.courses.find(c => c.id === state.selectedCourseId) || state.courses[0];
  const days = state.analysesByCourse[course.id] || [];
  const lines = [
    `⛳ *Golfweer Forecast — ${course.name}*`,
    `📍 ${course.city} | ${state.holes} holes (${state.holes === 9 ? '2,0' : '4,0'}u) | ${days[0]?.dateShort} t/m ${days[6]?.dateShort}`,
    ''
  ];
  days.forEach(d => {
    const b = scoreBadgeMeta(d.score);
    lines.push(`• *${d.dayTitle} (${d.dateShort})*: *${d.score}/100* (${b.label}) — ${d.teeTimeLabel} | ${d.scoreReason}`);
  });
  lines.push('', 'Wie haakt er aan? 🏌️‍♂️');
  return lines.join('\n');
}

function copyTextFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    return true;
  } catch (e) {
    return false;
  } finally {
    ta.remove();
  }
}

// ==========================================
// 6. EVENT LISTENERS & INITIALISATIE
// ==========================================
function announceStatus(message) {
  const region = $('liveAnnouncer');
  if (!region) return;
  region.textContent = '';
  setTimeout(() => {
    region.textContent = message;
  }, 50);
}

function setViewMode(mode, shouldScrollTab = false) {
  state.viewMode = mode;
  const tabMap = {
    single: $('tabSingleView'),
    compare: $('tabCompareView'),
    planner: $('tabPlannerView')
  };

  Object.entries(tabMap).forEach(([key, btn]) => {
    if (!btn) return;
    const isSelected = key === mode;
    btn.setAttribute('aria-selected', String(isSelected));
    btn.toggleAttribute('focusgroupstart', isSelected);
    btn.tabIndex = isSelected ? 0 : -1;
    if (isSelected && shouldScrollTab) {
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });

  renderApp();
}

function setHoles(holes) {
  state.holes = holes;
  const b9 = $('btn9Holes');
  const b18 = $('btn18Holes');
  if (b9 && b18) {
    b9.setAttribute('aria-pressed', String(holes === 9));
    b18.setAttribute('aria-pressed', String(holes === 18));
  }
  recomputeAllAnalyses();
  renderApp();
}

function setPreference(prefVal) {
  state.preference = prefVal;
  if ($('prefSlider')) $('prefSlider').value = String(prefVal);
  const labels = ['Bikkel', 'Normaal', 'Mooiweer-golfer'];
  if ($('prefBadge')) $('prefBadge').textContent = labels[prefVal] || 'Normaal';
  document.querySelectorAll('[data-pref]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(parseInt(btn.dataset.pref, 10) === prefVal));
  });
  recomputeAllAnalyses();
  renderApp();
}

function init() {
  loadCourses();
  renderCourseSelector();

  $('courseSelect')?.addEventListener('change', (e) => {
    state.selectedCourseId = e.target.value;
    renderApp();
  });

  $('tabSingleView')?.addEventListener('click', () => setViewMode('single', true));
  $('tabCompareView')?.addEventListener('click', () => setViewMode('compare', true));
  $('tabPlannerView')?.addEventListener('click', () => setViewMode('planner', true));

  // Keyboard arrow-navigation fallback voor browsers zonder native focusgroup
  const tablist = document.querySelector('.club-tablist');
  if (tablist && !Object.hasOwn(HTMLElement.prototype, 'focusGroup')) {
    const tabEntries = [
      { mode: 'single', el: $('tabSingleView') },
      { mode: 'compare', el: $('tabCompareView') },
      { mode: 'planner', el: $('tabPlannerView') }
    ].filter(t => t.el);

    tablist.addEventListener('keydown', (e) => {
      const idx = tabEntries.findIndex(t => t.el === document.activeElement);
      if (idx === -1) return;
      let nextIdx = -1;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabEntries.length;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabEntries.length) % tabEntries.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = tabEntries.length - 1;
      if (nextIdx >= 0) {
        e.preventDefault();
        tabEntries[nextIdx].el.focus();
        setViewMode(tabEntries[nextIdx].mode, true);
      }
    });
  }

  // Synchroniseer tab wanneer find-in-page een hidden="until-found" panel opent
  [
    { id: 'singleCourseContainer', mode: 'single' },
    { id: 'compareCoursesContainer', mode: 'compare' },
    { id: 'plannerContainer', mode: 'planner' }
  ].forEach(({ id, mode }) => {
    $(id)?.addEventListener('beforematch', () => setViewMode(mode, true));
  });

  $('btn9Holes')?.addEventListener('click', () => setHoles(9));
  $('btn18Holes')?.addEventListener('click', () => setHoles(18));

  $('prefSlider')?.addEventListener('input', (e) => setPreference(parseInt(e.target.value, 10)));
  document.querySelectorAll('[data-pref]').forEach(btn => {
    btn.addEventListener('click', () => setPreference(parseInt(btn.dataset.pref, 10)));
  });

  $('btnRefresh')?.addEventListener('click', fetchAllWeatherData);
  $('btnRetry')?.addEventListener('click', fetchAllWeatherData);

  // Eigen baan modal
  $('btnOpenAddCourse')?.addEventListener('click', () => {
    $('addCourseModal')?.classList.remove('hidden');
    $('addCourseModal')?.classList.add('flex');
  });
  const closeAdd = () => {
    $('addCourseModal')?.classList.add('hidden');
    $('addCourseModal')?.classList.remove('flex');
  };
  $('btnCloseAddCourse')?.addEventListener('click', closeAdd);
  $('btnCancelAddCourse')?.addEventListener('click', closeAdd);

  $('addCourseForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('newCourseName').value.trim();
    const city = $('newCourseCity').value.trim();
    const lat = parseFloat($('newCourseLat').value);
    const lon = parseFloat($('newCourseLon').value);
    const wf = parseFloat($('newCourseType').value);
    const id = 'custom-' + Date.now();
    const typeLabel = wf <= 0.8 ? 'Bosbaan (veel beschutting)' : wf <= 0.95 ? 'Parkbaan (gemiddelde luwte)' : 'Open polderbaan (windgevoelig)';
    saveCustomCourse({ id, name, city, typeLabel, windFactor: wf, lat, lon });
    state.selectedCourseId = id;
    closeAdd();
    fetchAllWeatherData();
  });

  // Share modal
  $('btnOpenShare')?.addEventListener('click', () => openShareModal(state.viewMode === 'compare' ? 'matrix' : 'week', state.expandedDayIndex >= 0 ? state.expandedDayIndex : 0));
  $('btnShareMatrix')?.addEventListener('click', () => openShareModal('matrix', 0));
  $('btnCloseShare')?.addEventListener('click', closeShareModal);

  document.querySelectorAll('.share-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.shareMode = btn.dataset.sharemode;
      updateShareModeButtons();
      renderScorecardPng();
    });
  });

  $('chkShareTips')?.addEventListener('change', renderScorecardPng);
  $('chkShareAlts')?.addEventListener('change', renderScorecardPng);

  $('btnDownloadPng')?.addEventListener('click', () => {
    if (!state.lastPngDataUrl) return;
    const a = document.createElement('a');
    a.href = state.lastPngDataUrl;
    a.download = `golfweer-${state.selectedCourseId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    const st = $('shareStatusMsg');
    if (st) {
      st.textContent = 'PNG scorecard opgeslagen in je Downloads.';
      st.classList.remove('hidden');
    }
  });

  $('btnCopyText')?.addEventListener('click', () => {
    const txt = buildWhatsAppTextSummary();
    const ok = copyTextFallback(txt);
    const st = $('shareStatusMsg');
    if (st) {
      st.textContent = ok
        ? 'WhatsApp-tekst gekopieerd naar klembord!'
        : 'Kon tekst niet automatisch kopiëren.';
      st.classList.remove('hidden');
    }
  });

  $('btnShareNative')?.addEventListener('click', async () => {
    const st = $('shareStatusMsg');
    try {
      const blob = await (await fetch(state.lastPngDataUrl)).blob();
      const file = new File([blob], `golfweer-${state.selectedCourseId}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Golfweer Scorecard',
          text: 'Golfweer voor komende week ⛳'
        });
        return;
      }
    } catch (e) {}

    // Fallback wanneer preview-iframe bestand-delen blokkeert
    const a = document.createElement('a');
    a.href = state.lastPngDataUrl;
    a.download = `golfweer-${state.selectedCourseId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (st) {
      st.textContent = 'Afbeelding gedownload (of houd de kaart hierboven ingedrukt om direct te kopiëren naar WhatsApp).';
      st.classList.remove('hidden');
    }
  });

  window.GolfWeerApp = {
    state,
    scoreBadgeMeta,
    formatDecimalHour,
    copyTextFallback,
    announceStatus,
    setViewMode,
    getBookingCourses,
    getCourseBookingStatus,
    refreshSingleCourse() {
      if (Object.keys(state.analysesByCourse).length > 0) {
        renderSingleCourse();
      }
    },
    jumpToCourseDay(dayIndex) {
      setViewMode('single', true);
      jumpToDay(dayIndex);
    }
  };

  fetchAllWeatherData();
}

document.addEventListener('DOMContentLoaded', init);

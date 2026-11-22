// ==========================================
// 1. STANDAARD GOLFBAAN DATA & STATE
// ==========================================
const DEFAULT_COURSES = [
  { id: 'kromme-rijn', name: 'Golfclub Kromme Rijn', city: 'Bunnik', typeLabel: 'Bos/parkbaan (goede luwte)', windFactor: 0.85, lat: 52.0558, lon: 5.2069 },
  { id: 'amelisweerd', name: 'UGC Amelisweerd', city: 'Utrecht', typeLabel: 'Bosbaan (veel beschutting)', windFactor: 0.80, lat: 52.0672, lon: 5.1744 },
  { id: 'de-utrechtse', name: 'Golfclub De Utrechtse', city: 'Schalkwijk', typeLabel: 'Park/polderbaan (licht open)', windFactor: 1.05, lat: 52.0114, lon: 5.1636 },
  { id: 'kroonprins', name: 'Golfbaan De Kroonprins', city: 'Vianen', typeLabel: 'Open polderbaan (windgevoelig)', windFactor: 1.15, lat: 51.9839, lon: 5.0719 },
  { id: 'wilnis', name: 'Golfpark Wilnis', city: 'Wilnis', typeLabel: 'Open polderbaan (windgevoelig)', windFactor: 1.15, lat: 52.1931, lon: 4.8925 },
  { id: 'biltse-duinen', name: 'Golfbaan De Biltse Duinen', city: 'Bilthoven', typeLabel: 'Bos/heidebaan (goede luwte)', windFactor: 0.85, lat: 52.1269, lon: 5.2133 },
  { id: 'spandersbosch', name: 'Golfpark Spandersbosch', city: 'Hilversum', typeLabel: 'Bosbaan (veel beschutting)', windFactor: 0.80, lat: 52.2386, lon: 5.1464 },
  { id: 'drentsche', name: 'Drentsche Golf & Country Club', city: 'Zeijerveen', typeLabel: 'Parkbaan (gemiddelde luwte)', windFactor: 0.90, lat: 53.0176, lon: 6.5287 },
  { id: 'engelenburg', name: 'Engelenburg Golf & Country Club', city: 'Brummen', typeLabel: 'Landgoed/parkbaan (goede luwte)', windFactor: 0.85, lat: 52.0905, lon: 6.1347 }
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

/**
 * Interpoleert vloeiend een kleur op basis van de golfscore (0-100),
 * zodat 1 punt verschil slechts een subtiele kleurnuance oplevert
 * en witte tekst altijd goed leesbaar blijft.
 */
function interpolateScoreRgb(score) {
  const stops = [
    { s: 30, rgb: [159, 18, 57] },   // Dieprood / bordeaux (slecht)
    { s: 45, rgb: [190, 42, 60] },   // Warm karmozijn
    { s: 55, rgb: [194, 87, 26] },   // Terracotta / oranje
    { s: 65, rgb: [180, 116, 24] },  // Warm oker / amber
    { s: 72, rgb: [109, 131, 38] },  // Olijf- / mosgroen (overgang)
    { s: 80, rgb: [43, 122, 75] },   // Fairway groen
    { s: 92, rgb: [20, 100, 60] }    // Diep clubhuis-smaragd
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
  const label = score >= 82 ? 'TOPDAG' : score >= 68 ? 'GOED' : score >= 52 ? 'MATIG' : 'SLECHT';

  // Donkere variant voor tekst op zachte achtergrond
  const tr = Math.round(r * 0.58);
  const tg = Math.round(g * 0.58);
  const tb = Math.round(b * 0.58);

  return {
    label,
    hex,
    bgStyle: `background-color: ${hex}; color: #ffffff;`,
    softStyle: `background-color: rgba(${r}, ${g}, ${b}, 0.10); color: rgb(${tr}, ${tg}, ${tb}); border-color: rgba(${r}, ${g}, ${b}, 0.28);`,
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

function formatDecimalHour(dec, roundToQuarter = true) {
  let totalMins = Math.round(dec * 60);
  if (roundToQuarter) totalMins = Math.round(totalMins / 15) * 15;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
      sunriseDec,
      playableLightEnd,
      earliestStart,
      latestStart,
      temp: rep.temp,
      appTemp: rep.appTemp,
      wind: rep.wind,
      gusts: rep.gusts,
      windDir: rep.windDir,
      precip: rep.precip,
      prob: rep.prob,
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
function renderCourseSelector() {
  const sel = $('courseSelect');
  if (!sel) return;
  sel.innerHTML = state.courses.map(c =>
    `<option value="${c.id}" ${c.id === state.selectedCourseId ? 'selected' : ''}>${c.name} — ${c.city}</option>`
  ).join('');
  const active = state.courses.find(c => c.id === state.selectedCourseId);
  if (active && $('courseMeta')) {
    $('courseMeta').textContent = `${active.typeLabel} • Windfactor ${active.windFactor.toFixed(2)}x`;
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

function renderSingleCourse() {
  const course = state.courses.find(c => c.id === state.selectedCourseId) || state.courses[0];
  const days = state.analysesByCourse[course.id] || [];
  if (!days.length) return;

  // Beste dag van de week
  let bestDay = days[0];
  days.forEach(d => { if (d.score > bestDay.score) bestDay = d; });

  // 1. Sticky Snel 7-Daags Overzicht
  const strip = $('quickDayStrip');
  if (strip) {
    strip.innerHTML = days.map(d => {
      const isSelected = d.dayIndex === state.expandedDayIndex;
      const isBest = d.dayIndex === bestDay.dayIndex;
      const badge = scoreBadgeMeta(d.score);
      return `
        <button type="button" data-jumpday="${d.dayIndex}"
          class="min-w-[68px] rounded-xl p-2 text-center border transition flex flex-col items-center justify-between ${
            isSelected
              ? 'bg-[#163828] text-white border-[#c5a059] ring-2 ring-[#c5a059]/40 shadow-sm'
              : 'bg-white text-[#1c2822] border-[#e5dfd1] hover:border-[#163828]/40'
          }">
          <div class="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-tight">
            <span>${d.dayPill}</span>
            ${isBest ? '<span class="text-[#c5a059]">★</span>' : ''}
          </div>
          <div class="text-[10px] ${isSelected ? 'text-emerald-200' : 'text-stone-400'}">${d.dateShort}</div>
          <div class="text-base my-0.5 leading-none">${d.icon}</div>
          <div class="font-mono-score text-xs font-bold px-1.5 py-0.5 rounded" style="${badge.bgStyle}">${d.score}</div>
          <div class="text-[10px] font-mono-score mt-1 ${isSelected ? 'text-emerald-100' : 'text-stone-600'}">
            ${d.temp}° • ${d.prob}%
          </div>
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

  // 2. Clubhuis Aanrader Banner
  const banner = $('bestWeekBanner');
  if (banner) {
    const bMeta = scoreBadgeMeta(bestDay.score);
    banner.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="text-[10px] font-bold uppercase tracking-widest text-[#e7cf9b]">
            ★ Clubhuis Aanrader • Beste Speelvenster Komende 7 Dagen
          </div>
          <h2 class="font-serif-club text-xl sm:text-2xl font-bold leading-snug">
            ${bestDay.dayTitle} (${bestDay.dateShort}) op ${course.name} — ${bestDay.flexibilityLabel}: ${bestDay.teeTimeLabel.toLowerCase()}
          </h2>
          <p class="text-xs text-emerald-100/90">
            ${state.holes} holes • Licht tot ${bestDay.lightUntil} • ${bestDay.temp}°C (gevoel ${bestDay.appTemp}°C) • Wind ${bestDay.wind} km/u ${bestDay.windDir} • Regenkans ${bestDay.prob}%
          </p>
        </div>
        <div class="text-right shrink-0">
          <div class="inline-flex flex-col items-center px-3.5 py-2 rounded-xl bg-white/10 border border-[#c5a059]/60">
            <span class="font-mono-score text-2xl font-bold text-white">${bestDay.score}</span>
            <span class="text-[10px] font-bold tracking-wider uppercase text-[#e7cf9b]">${bMeta.label}</span>
          </div>
        </div>
      </div>
    `;
  }

  // 3. 7 Dagkaarten
  const list = $('daysList');
  if (list) {
    list.innerHTML = days.map(d => {
      const isOpen = d.dayIndex === state.expandedDayIndex;
      const badge = scoreBadgeMeta(d.score);
      const alt = findBestAlternative(d.dayIndex, course.id);

      return `
        <article id="day-card-${d.dayIndex}" class="bg-white rounded-2xl border ${isOpen ? 'border-[#163828] ring-1 ring-[#163828]/15' : 'border-[#e5dfd1]'} shadow-sm overflow-hidden transition">
          <!-- Kaart Header (klikbaar) -->
          <div data-toggle-day="${d.dayIndex}" class="p-4 cursor-pointer hover:bg-[#fcfbf7] transition flex items-center justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <div class="text-2xl shrink-0 mt-0.5">${d.icon}</div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-serif-club text-base sm:text-lg font-bold text-[#163828]">${d.dayTitle}</h3>
                  <span class="text-xs text-stone-500">${d.dateShort}</span>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f2efe7] text-stone-700">${d.flexibilityLabel}</span>
                </div>
                <p class="text-xs sm:text-sm font-semibold text-[#1b6b45] truncate mt-0.5">${d.teeTimeLabel}</p>

                <!-- Korte samenvatting waarom de score is zoals hij is -->
                <div class="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border" style="${badge.softStyle}">
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" style="${badge.dotStyle}"></span>
                  <span class="leading-snug"><strong class="font-semibold">Score-uitleg:</strong> ${d.scoreReason}</span>
                </div>

                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500 mt-1.5">
                  <span>🌡️ ${d.temp}°C (gevoel ${d.appTemp}°C)</span>
                  <span>💨 ${d.wind} km/u ${d.windDir}</span>
                  <span>☔ ${d.prob}% (${d.precip} mm)</span>
                  <span>🌅 Licht tot ${d.lightUntil}</span>
                </div>
                ${d.clothing ? `
                  <div class="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#163828] text-[#e7cf9b]">
                    <span>👕 ${d.clothing.badge}</span>
                  </div>
                ` : ''}
                ${alt ? `
                  <p class="text-[11px] text-amber-800 font-medium mt-1">
                    💡 Beter weer op <strong>${alt.courseName}</strong> (${alt.score}/100, +${alt.diff} pt)
                  </p>
                ` : ''}
              </div>
            </div>

            <div class="flex items-center gap-2.5 shrink-0">
              <div class="text-center px-3 py-1.5 rounded-xl min-w-[64px]" style="${badge.bgStyle}">
                <div class="font-mono-score text-lg font-bold leading-tight">${d.score}</div>
                <div class="text-[9px] font-bold tracking-wider uppercase">${badge.label}</div>
              </div>
              <span class="text-stone-400 text-xs">${isOpen ? '▲' : '▼'}</span>
            </div>
          </div>

          <!-- Uitgeklapt Detailpaneel -->
          ${isOpen ? `
            <div class="border-t border-[#efeae0] bg-[#fbfaf6] p-4 space-y-4">
              <div class="grid grid-cols-1 ${d.clothing ? 'md:grid-cols-2' : ''} gap-3">
                <!-- Caddie Baanadvies -->
                <div class="bg-white rounded-xl p-3.5 border border-[#e5dfd1]">
                  <div class="text-[11px] font-bold uppercase tracking-wider text-[#163828] mb-1">🏌️ Caddie Baanadvies</div>
                  <p class="text-xs text-stone-700 leading-relaxed">${d.caddieTip}</p>
                </div>

                <!-- Kledingadviseur (alleen vandaag & morgen) -->
                ${d.clothing ? `
                  <div class="bg-white rounded-xl p-3.5 border border-[#e5dfd1] space-y-1.5">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-[#163828]">👕 Kledingadviseur (Korte termijn)</div>
                    <p class="text-xs text-stone-700"><strong>Boven:</strong> ${d.clothing.top}</p>
                    <p class="text-xs text-stone-700"><strong>Onder:</strong> ${d.clothing.bottom}</p>
                    <p class="text-xs text-stone-700"><strong>Tas-check:</strong> ${d.clothing.accessories}</p>
                  </div>
                ` : ''}
              </div>

              <!-- Verloop per uur overdag (07:00 - 20:00) -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-stone-500">Verloop per uur (07:00 – 20:00)</span>
                  <button type="button" data-share-day="${d.dayIndex}" class="text-xs font-bold text-[#163828] hover:underline">
                    📤 Deel visuele dagkaart
                  </button>
                </div>
                <div class="grid grid-cols-7 sm:grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
                  ${d.hourRows.filter(r => r.hour >= 7 && r.hour <= 20).map(r => {
                    const hb = scoreBadgeMeta(r.score);
                    const inBest = r.hour >= Math.floor(d.bestStart) && r.hour < Math.ceil(d.bestStart + d.roundHours);
                    return `
                      <div class="rounded-lg p-1.5 text-center border ${inBest ? 'border-[#c5a059] bg-amber-50/60' : 'border-[#e5dfd1] bg-white'}">
                        <div class="font-mono-score text-[10px] text-stone-500">${String(r.hour).padStart(2, '0')}u</div>
                        <div class="font-mono-score text-xs font-bold my-0.5 px-1 rounded" style="${hb.bgStyle}">${r.score}</div>
                        <div class="text-[10px] text-stone-700 font-mono-score">${r.temp}°</div>
                        <div class="text-[9px] text-stone-400 font-mono-score">${r.prob}%</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          ` : ''}
        </article>
      `;
    }).join('');

    // Event listeners op dagkaarten
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
      setTimeout(() => card.classList.remove('pulse-gold'), 1400);
    }
  });
}

function renderCompareMatrix() {
  const table = $('compareTable');
  if (!table) return;
  const refDays = state.analysesByCourse[state.courses[0].id] || [];
  if (!refDays.length) return;

  let thead = `<thead><tr class="border-b-2 border-[#163828] text-[#163828]">
    <th class="py-2.5 pr-3 font-bold">Golfbaan</th>
    ${refDays.map(d => `<th class="py-2.5 px-1.5 text-center font-bold">${d.dayPill}<br><span class="font-normal text-[10px] text-stone-400">${d.dateShort}</span></th>`).join('')}
  </tr></thead>`;

  let tbody = '<tbody class="divide-y divide-[#efeae0]">';
  state.courses.forEach(c => {
    const cDays = state.analysesByCourse[c.id] || [];
    tbody += `<tr class="hover:bg-[#faf8f2]">
      <td class="py-2.5 pr-3 font-semibold text-[#163828] whitespace-nowrap">
        ${c.name}<div class="text-[10px] font-normal text-stone-400">${c.city}</div>
      </td>
      ${cDays.map(d => {
        const b = scoreBadgeMeta(d.score);
        return `<td class="py-2 px-1 text-center">
          <button type="button" data-pick-course="${c.id}" data-pick-day="${d.dayIndex}"
            class="w-full py-1.5 px-1 rounded-lg font-mono-score font-bold text-xs hover:opacity-90 transition" style="${b.bgStyle}">
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
    btn.className = `share-mode-btn py-1.5 px-2 rounded-lg text-xs transition ${
      active ? 'font-bold bg-[#163828] text-white' : 'font-semibold text-stone-600'
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
  ctx.fillStyle = '#f7f5ef';
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = '#163828';
  ctx.fillRect(0, 0, W, 118);
  ctx.fillStyle = '#c5a059';
  ctx.fillRect(0, 114, W, 4);

  ctx.fillStyle = '#e7cf9b';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillText('★ CLUBHUIS GOLFWEER SCORECARD', 28, 34);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Georgia, serif';
  const titleText = state.shareMode === 'matrix'
    ? 'Banen Vergelijking — Golfweer'
    : state.shareMode === 'day'
      ? `${days[state.shareDayIndex].dayTitle} (${days[state.shareDayIndex].dateShort}) — ${course.name}`
      : `7-Daags Golfweer — ${course.name}`;
  ctx.fillText(titleText, 28, 68);

  ctx.fillStyle = '#cbe3d6';
  ctx.font = '500 14px Inter, sans-serif';
  ctx.fillText(`${course.city} • ${state.holes} holes (${state.holes === 9 ? '2,0' : '4,0'} uur) • ${days[0].dateShort} t/m ${days[6].dateShort}`, 28, 95);

  if (state.shareMode === 'week') {
    let best = days[0];
    days.forEach(d => { if (d.score > best.score) best = d; });

    // Beste dag highlight
    roundRectPath(ctx, 28, 136, W - 56, 74, 12);
    ctx.fillStyle = '#163828';
    ctx.fill();
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#e7cf9b';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('★ BESTE SPEELDAG VAN DE WEEK', 44, 158);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(`${best.dayTitle} (${best.dateShort}) — ${best.teeTimeLabel}`, 44, 182);
    ctx.fillStyle = '#d1e7dd';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`Licht tot ${best.lightUntil} • ${best.temp}°C • Wind ${best.wind} km/u ${best.windDir} • Regenkans ${best.prob}%`, 44, 200);

    const bMeta = scoreBadgeMeta(best.score);
    roundRectPath(ctx, W - 118, 148, 74, 50, 10);
    ctx.fillStyle = bMeta.hex;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(best.score), W - 81, 176);
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(bMeta.label, W - 81, 191);
    ctx.textAlign = 'left';

    // 7 rijen
    let y = 226;
    days.forEach(d => {
      roundRectPath(ctx, 28, y, W - 56, 88, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#e5dfd1';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#163828';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillText(d.dayTitle, 44, y + 28);
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(`${d.dateShort} • Licht tot ${d.lightUntil}`, 44, y + 48);

      ctx.fillStyle = '#1b6b45';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(d.teeTimeLabel, 215, y + 26);

      ctx.fillStyle = '#374151';
      ctx.font = '12px Inter, sans-serif';
      let subLine = `${d.temp}°C (gevoel ${d.appTemp}°C) • Wind ${d.wind} km/u ${d.windDir} • Regen ${d.prob}%`;
      if (showTips && d.clothing) subLine += ` • ${d.clothing.badge}`;
      ctx.fillText(subLine, 215, y + 45);

      ctx.fillStyle = '#57534e';
      ctx.font = 'italic 11px Inter, sans-serif';
      ctx.fillText(`Score-uitleg: ${d.scoreReason}`, 215, y + 63);

      if (showAlts) {
        const alt = findBestAlternative(d.dayIndex, course.id);
        if (alt) {
          ctx.fillStyle = '#b45309';
          ctx.font = 'bold 11px Inter, sans-serif';
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
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.fillText(dm.label, W - 79, y + 60);
      ctx.textAlign = 'left';

      y += 96;
    });
  } else if (state.shareMode === 'day') {
    const d = days[state.shareDayIndex] || days[0];
    const dm = scoreBadgeMeta(d.score);

    roundRectPath(ctx, 28, 138, W - 56, 390, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e5dfd1';
    ctx.stroke();

    ctx.fillStyle = '#1b6b45';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(d.teeTimeLabel, 48, 178);

    ctx.fillStyle = '#374151';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`🌡️ ${d.temp}°C (gevoel ${d.appTemp}°C)   💨 Wind ${d.wind} km/u ${d.windDir}   ☔ Regenkans ${d.prob}%   🌅 Licht tot ${d.lightUntil}`, 48, 206);

    ctx.fillStyle = '#163828';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(`SCORE-UITLEG: ${d.scoreReason}`, 48, 234);

    roundRectPath(ctx, W - 134, 154, 86, 62, 12);
    ctx.fillStyle = dm.hex;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(d.score), W - 91, 188);
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(dm.label, W - 91, 206);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#163828';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText('CADDIE BAANADVIES:', 48, 274);
    ctx.fillStyle = '#374151';
    ctx.font = '13px Inter, sans-serif';
    wrapCanvasText(ctx, d.caddieTip, 48, 296, W - 96, 19);

    if (d.clothing) {
      ctx.fillStyle = '#163828';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('KLEDINGADVISEUR:', 48, 385);
      ctx.fillStyle = '#374151';
      ctx.font = '13px Inter, sans-serif';
      wrapCanvasText(ctx, `${d.clothing.top} ${d.clothing.bottom}`, 48, 407, W - 96, 19);
    }
  } else {
    // Matrix mode
    let y = 142;
    const refDays = state.analysesByCourse[state.courses[0].id] || [];
    ctx.fillStyle = '#163828';
    ctx.font = 'bold 12px Inter, sans-serif';
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
      ctx.strokeStyle = '#e5dfd1';
      ctx.stroke();

      ctx.fillStyle = '#163828';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.fillText(c.name, 42, y + 36);
      ctx.fillStyle = '#6b7280';
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
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('Golfweer Planner • Live Open-Meteo data', 28, H - 18);
  ctx.textAlign = 'right';
  ctx.fillText('Wie haakt er aan? ⛳', W - 28, H - 18);
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
    if (holes === 9) {
      b9.className = 'py-2 px-3 rounded-lg text-left bg-[#163828] text-white shadow-sm transition';
      b9.querySelector('div:last-child').className = 'text-[11px] opacity-80 font-mono-score';
      b18.className = 'py-2 px-3 rounded-lg text-left text-stone-700 hover:bg-white/60 transition';
      b18.querySelector('div:last-child').className = 'text-[11px] text-stone-500 font-mono-score';
    } else {
      b18.className = 'py-2 px-3 rounded-lg text-left bg-[#163828] text-white shadow-sm transition';
      b18.querySelector('div:last-child').className = 'text-[11px] opacity-80 font-mono-score';
      b9.className = 'py-2 px-3 rounded-lg text-left text-stone-700 hover:bg-white/60 transition';
      b9.querySelector('div:last-child').className = 'text-[11px] text-stone-500 font-mono-score';
    }
  }
  recomputeAllAnalyses();
  renderApp();
}

function setPreference(prefVal) {
  state.preference = prefVal;
  if ($('prefSlider')) $('prefSlider').value = String(prefVal);
  const labels = ['Bikkel', 'Normaal', 'Mooiweer-golfer'];
  if ($('prefBadge')) $('prefBadge').textContent = labels[prefVal] || 'Normaal';
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
    jumpToCourseDay(dayIndex) {
      setViewMode('single', true);
      jumpToDay(dayIndex);
    }
  };

  fetchAllWeatherData();
}

document.addEventListener('DOMContentLoaded', init);

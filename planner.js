// ============================================================
// SWINGERSCLUB E.V. — BESCHIKBAARHEID & TEE-TIME PLANNER
// ============================================================
(function () {
  'use strict';

  const STORAGE_KEY_ROWS = 'swingersclub_rows_v1';
  const STORAGE_KEY_META = 'swingersclub_meta_v1';

  const MEMBERS = [
    { key: 'tom', name: 'Tom 🦩', shortName: 'Tom' },
    { key: 'jeff', name: 'Jeff', shortName: 'Jeff' },
    { key: 'ed', name: 'Ed', shortName: 'Ed' }
  ];

  // Historische bevestigde boekingen uit de Google Sheet vóór 2026-11-22 (3-3-3)
  const DEFAULT_BASE_CREDITS = { tom: 3, jeff: 3, ed: 3 };

  // Actuele voorgeladen planning uit tabblad "Huidig" van Swingersclub E.v.
  const SEED_SHEET_ROWS = {
    '2026-11-23': { tom: 'x', jeff: 'hele dag', ed: '', confirmed: '', note: '' },
    '2026-11-24': { tom: 'x', jeff: 'tot 15:00', ed: '', confirmed: '', note: '' },
    '2026-11-25': { tom: 'va 20:00 DR', jeff: 'overdag', ed: '', confirmed: '', note: '' },
    '2026-11-26': { tom: 'va 20:00 DR', jeff: 'tot 16:00', ed: '', confirmed: '', note: '' },
    '2026-11-27': { tom: 'va 16:00', jeff: 'tot 16:00', ed: '', confirmed: '', note: '' },
    '2026-11-28': { tom: 'va 12:30', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-11-29': { tom: 'hele dag', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-11-30': { tom: 'x', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-12-01': { tom: 'va 20:00 DR', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-12-02': { tom: 'x', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-12-03': { tom: 'va 20:00 DR', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-12-04': { tom: 'x', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-12-05': { tom: 'x', jeff: 'hele dag', ed: '', confirmed: '', note: '' },
    '2026-12-06': { tom: 'x', jeff: 'hele dag', ed: '', confirmed: '', note: '' },
    '2026-12-07': { tom: 'x', jeff: 'tot 15:00', ed: '', confirmed: '', note: '' },
    '2026-12-08': { tom: 'va 15:00', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-12-09': { tom: 'x', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-12-10': { tom: 'x', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-12-11': { tom: 'va 16:00', jeff: 'x', ed: '', confirmed: '', note: '' },
    '2026-12-12': { tom: 'va 13:00', jeff: 'hele dag', ed: '', confirmed: '', note: '' },
    '2026-12-13': { tom: '', jeff: 'hele dag', ed: '', confirmed: '', note: '' }
  };

  const APPS_SCRIPT_CODE = `// Plak dit in Google Sheet "Swingersclub E.v." -> Extensies -> Apps Script
const SHEET_NAME = 'Huidig';
const TIMEZONE = 'Europe/Amsterdam';

function doGet() {
  try { return jsonRes({ ok: true, ...readState() }); }
  catch (err) { return jsonRes({ ok: false, error: String(err) }); }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'batchUpsert' && Array.isArray(body.rows)) {
      body.rows.forEach(upsertRow);
    } else {
      upsertRow(body);
    }
    return jsonRes({ ok: true, ...readState() });
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) });
  }
}

function jsonRes(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function fmtDate(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, TIMEZONE, 'yyyy-MM-dd');
  const s = String(v).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
}

function fmtTime(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return Utilities.formatDate(v, TIMEZONE, 'HH:mm');
  if (typeof v === 'number' && v >= 0 && v < 1) {
    const m = Math.round(v * 1440);
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  return String(v).trim();
}

function readState() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const last = sh.getLastRow();
  if (last < 2) return { rows: [], baseCredits: { tom: 0, jeff: 0, ed: 0 } };
  const vals = sh.getRange(2, 1, last - 1, Math.max(10, sh.getLastColumn())).getValues();
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const baseCredits = { tom: 0, jeff: 0, ed: 0 };
  const rows = [];
  vals.forEach(r => {
    const d = fmtDate(r[1]);
    if (!d) return;
    const confirmed = fmtTime(r[8]);
    if (d < today) {
      if (confirmed) {
        const b = String(r[7] || '').toLowerCase();
        if (b.includes('tom')) baseCredits.tom++;
        else if (b.includes('jeff')) baseCredits.jeff++;
        else if (b.includes('ed')) baseCredits.ed++;
      }
      return;
    }
    const row = {
      date: d,
      tom: String(r[2] || '').trim(),
      jeff: String(r[3] || '').trim(),
      ed: String(r[4] || '').trim(),
      confirmed,
      note: String(r[9] || '').trim()
    };
    if (row.tom || row.jeff || row.ed || row.confirmed || row.note) rows.push(row);
  });
  return { rows, baseCredits, updatedAt: new Date().toISOString() };
}

function upsertRow(item) {
  const target = fmtDate(item.date);
  if (!target) throw new Error('Ongeldige datum');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const last = sh.getLastRow();
  let rowIdx = -1;
  if (last >= 2) {
    const colB = sh.getRange(2, 2, last - 1, 1).getValues();
    for (let i = 0; i < colB.length; i++) {
      if (fmtDate(colB[i][0]) === target) { rowIdx = i + 2; break; }
    }
  }
  if (rowIdx === -1) {
    rowIdx = last + 1;
    const p = target.split('-').map(Number);
    const dt = new Date(p[0], p[1] - 1, p[2]);
    const wd = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
    sh.getRange(rowIdx, 1).setValue(wd[dt.getDay()]);
    sh.getRange(rowIdx, 2).setValue(dt);
    if (rowIdx > 2) {
      sh.getRange(rowIdx - 1, 6, 1, 3).copyTo(sh.getRange(rowIdx, 6, 1, 3), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    }
  }
  if (item.field) {
    const map = { tom: 3, jeff: 4, ed: 5, confirmed: 9, note: 10 };
    if (map[item.field]) sh.getRange(rowIdx, map[item.field]).setValue(item.value ?? '');
    return;
  }
  if (item.tom !== undefined) sh.getRange(rowIdx, 3).setValue(item.tom);
  if (item.jeff !== undefined) sh.getRange(rowIdx, 4).setValue(item.jeff);
  if (item.ed !== undefined) sh.getRange(rowIdx, 5).setValue(item.ed);
  if (item.confirmed !== undefined) sh.getRange(rowIdx, 9).setValue(item.confirmed);
  if (item.note !== undefined) sh.getRange(rowIdx, 10).setValue(item.note);
}`;

  const plannerState = {
    rowsByDate: {},
    baseCredits: { ...DEFAULT_BASE_CREDITS },
    weeksCount: 4,
    activeMember: 'all', // 'all' | 'tom' | 'jeff' | 'ed'
    filter: 'all',       // 'all' | 'go' | 'week7' | 'confirmed'
    sheetUrl: '',
    lastSyncedAt: '',
    isSyncing: false,
    editorContext: null, // { dateIso, mode: 'member' | 'confirm', memberKey?, suggestedTee? }
    activeTimeMode: null
  };

  const el = (id) => document.getElementById(id);

  // ============================================================
  // 1. DATUM- EN TIJDHULPFUNCTIES (AMSTERDAM LOKAAL)
  // ============================================================
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

  function addDaysIso(iso, deltaDays) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
    return dt.toISOString().slice(0, 10);
  }

  function parseIsoDateLocal(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  function formatDateMeta(iso, todayIso) {
    const dt = parseIsoDateLocal(iso);
    const dayOfWeek = dt.getDay(); // 0=zo, 1=ma ... 6=za
    const weekdayShort = dt.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '');
    const weekdayLong = dt.toLocaleDateString('nl-NL', { weekday: 'long' });
    const dateShort = dt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
    const isToday = iso === todayIso;
    const isTomorrow = iso === addDaysIso(todayIso, 1);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    const displayDay = isToday
      ? 'Vandaag'
      : isTomorrow
        ? 'Morgen'
        : weekdayLong.charAt(0).toUpperCase() + weekdayLong.slice(1);
    return {
      iso,
      dayOfWeek,
      weekdayShort: weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1),
      weekdayLong: weekdayLong.charAt(0).toUpperCase() + weekdayLong.slice(1),
      dateShort,
      displayDay,
      isToday,
      isTomorrow,
      isWeekend,
      isMonday
    };
  }

  function minsToHHMM(totalMins) {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMins)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function parseTimeStrToMins(str) {
    const m = String(str).match(/(\d{1,2})[:.](\d{2})/);
    if (!m) return null;
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh * 60 + mm;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ============================================================
  // 2. BESCHIKBAARHEID PARSER (100% COMPATIBEL MET GOOGLE SHEET)
  // ============================================================
  function parseAvailability(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) {
      return {
        raw: '',
        displayLabel: '',
        status: 'empty',
        available: false,
        maybe: false,
        isDR: false,
        startMins: null,
        endMins: null,
        cssClass: 'avail-empty',
        summary: 'Nog niet ingevuld'
      };
    }

    // Niet beschikbaar: 'x' / 'X' (bijv. 'x', 'x.', 'x vakantie', 'x golftrip', of los woord 'x')
    if (/^x(?:\b|[^a-z]|$)/i.test(raw) || /(?:^|[\s(,/-])x(?:$|[\s.),/-])/i.test(raw) || /^(?:kan niet|niet)$/i.test(raw)) {
      const reason = /^x/i.test(raw)
        ? raw.slice(1).replace(/^[.\s:-]+/, '').trim()
        : raw.replace(/(?:^|[\s(,/-])x(?:$|[\s.),/-])/gi, ' ').trim();
      return {
        raw,
        displayLabel: reason ? `✕ ${reason}` : '✕ Kan niet',
        status: 'unavailable',
        available: false,
        maybe: false,
        isDR: false,
        startMins: null,
        endMins: null,
        cssClass: 'avail-no',
        summary: reason ? `Kan niet (${reason})` : 'Kan niet'
      };
    }

    const timeMatches = [...raw.matchAll(/(\d{1,2}[:.]\d{2})/g)].map(m => parseTimeStrToMins(m[1])).filter(v => v !== null);
    const isDR = /\bdr\b/i.test(raw) || /driving\s*range/i.test(raw);

    // Driving Range (DR): expliciet GEEN tee time — telt niet mee voor GO / GOGOGO, overlap of Booker
    if (isDR) {
      let drStart = timeMatches[0] ?? 19 * 60;
      let drEnd = timeMatches[1] ?? Math.max(22 * 60, drStart + 90);
      if (/\btot\b/i.test(raw) && timeMatches.length === 1) {
        drStart = 9 * 60;
        drEnd = timeMatches[0];
      }
      const drWindow = timeMatches.length >= 2
        ? `${minsToHHMM(drStart)} – ${minsToHHMM(drEnd)}`
        : timeMatches.length === 1
          ? `vanaf ${minsToHHMM(drStart)}`
          : raw;
      return {
        raw,
        displayLabel: raw,
        status: 'dr',
        available: false,
        maybe: false,
        isDR: true,
        startMins: drStart,
        endMins: drEnd,
        cssClass: 'avail-dr',
        summary: `Driving Range (${drWindow}) — geen tee time`
      };
    }

    const isMaybe = /misschien/i.test(raw);

    let startMins = 9 * 60;  // 09:00 standaard (net als 9/24 in sheet)
    let endMins = 20 * 60;   // 20:00 standaard (net als 20/24 in sheet)
    let isFullDay = false;

    if (/tussen/i.test(raw) && timeMatches.length >= 2) {
      startMins = timeMatches[0];
      endMins = timeMatches[1];
    } else if (timeMatches.length >= 2 && /[-–]|tot|en/i.test(raw)) {
      startMins = timeMatches[0];
      endMins = timeMatches[1];
    } else if (/(^|\b)(va|vanaf|na)\b/i.test(raw) && timeMatches.length >= 1) {
      startMins = timeMatches[0];
      endMins = 20 * 60;
    } else if (/\btot\b/i.test(raw) && timeMatches.length >= 1) {
      startMins = 9 * 60;
      endMins = timeMatches[0];
    } else if (/ochtend/i.test(raw)) {
      startMins = 9 * 60;
      endMins = 12 * 60;
    } else if (/middag/i.test(raw)) {
      startMins = 12 * 60;
      endMins = 20 * 60;
    } else if (/hele\s*dag|overdag|ja/i.test(raw)) {
      startMins = 9 * 60;
      endMins = 20 * 60;
      isFullDay = true;
    } else if (timeMatches.length === 1) {
      startMins = timeMatches[0];
      endMins = 20 * 60;
    } else {
      // Bijv. "misschien" zonder tijd -> 09:00 - 20:00 (identiek aan sheet)
      startMins = 9 * 60;
      endMins = 20 * 60;
    }

    let cssClass = 'avail-partial';
    if (isMaybe) cssClass = 'avail-maybe';
    else if (isFullDay) cssClass = 'avail-yes';

    const labelWindow = `${minsToHHMM(startMins)} – ${minsToHHMM(endMins)}${isMaybe ? ' (misschien)' : ''}`;

    return {
      raw,
      displayLabel: raw,
      status: isMaybe ? 'maybe' : 'available',
      available: true,
      maybe: isMaybe,
      isDR: false,
      startMins,
      endMins,
      cssClass,
      summary: labelWindow
    };
  }

  // ============================================================
  // 3. OVERLAP, WEER-TEE-TIME & EERLIJKE BOOKER-ENGINE
  // ============================================================
  function getLiveWeatherMap() {
    const app = window.GolfWeerApp;
    if (!app || !app.state) return { byDate: {}, course: null, holes: 9 };
    const course = app.state.courses.find(c => c.id === app.state.selectedCourseId) || app.state.courses[0];
    const days = course ? (app.state.analysesByCourse[course.id] || []) : [];
    const byDate = {};
    days.forEach(d => {
      if (d.dateIso) byDate[d.dateIso] = d;
    });
    return { byDate, course, holes: app.state.holes || 9 };
  }

  /**
   * Berekent de beste afslag binnen de overlappende beschikbaarheid van de spelers,
   * rekening houdend met live uurlijkse golfscores en schemerlicht (Licht tot HH:MM).
   */
  function computeWeatherTeeTimeInOverlap(overlapStartMins, overlapEndMins, weatherDay) {
    if (!weatherDay || !weatherDay.hourRows) return null;
    const roundHours = weatherDay.roundHours || 2.0;
    const ovStartDec = overlapStartMins / 60;
    const ovEndDec = overlapEndMins / 60;

    const earliest = Math.max(
      Math.ceil(ovStartDec * 4) / 4,
      weatherDay.earliestStart ?? Math.ceil((weatherDay.sunriseDec || 8) * 4) / 4
    );
    const maxFinish = Math.min(ovEndDec, weatherDay.playableLightEnd || 20);
    const latest = Math.floor((maxFinish - roundHours) * 4) / 4;

    if (latest < earliest - 0.001) {
      if (ovStartDec >= (weatherDay.playableLightEnd || 20) - roundHours) {
        return {
          possible: false,
          reason: `Te laat voor ${roundHours === 2 ? '9' : '18'} holes vóór donker (licht tot ${weatherDay.lightUntil})`
        };
      }
      return {
        possible: false,
        reason: `Overlap te kort voor ${roundHours === 2 ? '9' : '18'} holes (${roundHours}u nodig)`
      };
    }

    const candidates = [];
    const steps = Math.round(roundHours * 4);
    for (let st = earliest; st <= latest + 0.001; st += 0.25) {
      let sum = 0;
      let minStep = 100;
      for (let k = 0; k < steps; k++) {
        const t = st + k * 0.25;
        const h0 = Math.min(23, Math.floor(t));
        const h1 = Math.min(23, h0 + 1);
        const frac = t - h0;
        const interp = weatherDay.hourRows[h0].score * (1 - frac) + weatherDay.hourRows[h1].score * frac;
        sum += interp;
        if (interp < minStep) minStep = interp;
      }
      const score = Math.round((sum / steps) * 0.8 + minStep * 0.2);
      candidates.push({ start: st, score });
    }

    let best = candidates[0];
    candidates.forEach(c => { if (c.score > best.score) best = c; });

    const threshold = best.score - 5;
    const bestIdx = candidates.findIndex(c => c.start === best.start);
    let left = bestIdx;
    let right = bestIdx;
    while (left > 0 && candidates[left - 1].score >= threshold) left--;
    while (right < candidates.length - 1 && candidates[right + 1].score >= threshold) right++;

    const fmt = (dec) => window.GolfWeerApp.formatDecimalHour(dec, true);
    const startMinStr = fmt(candidates[left].start);
    const startMaxStr = fmt(candidates[right].start);
    const bestStartStr = fmt(best.start);
    const label = candidates[right].start - candidates[left].start >= 0.5
      ? `Start ${startMinStr} – ${startMaxStr}`
      : `Afslag ${bestStartStr}`;

    return {
      possible: true,
      bestStartStr,
      label,
      score: best.score,
      lightUntil: weatherDay.lightUntil
    };
  }

  function buildComputedSchedule() {
    const todayIso = getAmsterdamTodayIso();
    const totalDays = plannerState.weeksCount * 7;
    const { byDate: weatherByDate, course, holes } = getLiveWeatherMap();
    const roundMins = holes === 18 ? 240 : 120;

    // Verzamel alle datums (komende N weken + eventuele latere ingevulde datums)
    const dateSet = new Set();
    for (let i = 0; i < totalDays; i++) {
      dateSet.add(addDaysIso(todayIso, i));
    }
    Object.keys(plannerState.rowsByDate).forEach(d => {
      if (d >= todayIso) dateSet.add(d);
    });
    const dates = [...dateSet].sort();

    // Eerlijke booker-rotatie bijhouden (chronologisch vanaf baseCredits)
    const runningCredits = { ...plannerState.baseCredits };
    const computedRows = [];

    for (const dateIso of dates) {
      const rawRow = plannerState.rowsByDate[dateIso] || { tom: '', jeff: '', ed: '', confirmed: '', note: '' };
      const parsed = {
        tom: parseAvailability(rawRow.tom),
        jeff: parseAvailability(rawRow.jeff),
        ed: parseAvailability(rawRow.ed)
      };

      // Alleen spelers die echt voor een Tee time beschikbaar zijn (exclusief leeg, 'x' en 'DR')
      const availMembers = MEMBERS.filter(m => parsed[m.key].available);
      const drMembers = MEMBERS.filter(m => parsed[m.key].isDR);
      const count = availMembers.length;
      const hasMaybe = availMembers.some(m => parsed[m.key].maybe);

      // Potentieel voor een Tee time (GOGOGO = 3, GO = 2; DR telt niet mee)
      let potentieel = '';
      if (count === 3) potentieel = 'GOGOGO';
      else if (count === 2) potentieel = 'GO';

      // Overlap berekening voor mogelijke Tee times
      let overlapStart = null;
      let overlapEnd = null;
      let overlapText = '';
      let singleAvailNote = '';
      let hasOverlap = false;
      let partialPairTip = '';

      if (count === 1) {
        const solo = availMembers[0];
        singleAvailNote = `Alleen ${solo.shortName} (${minsToHHMM(parsed[solo.key].startMins)} – ${minsToHHMM(parsed[solo.key].endMins)})`;
      } else if (count >= 2) {
        const starts = availMembers.map(m => parsed[m.key].startMins);
        const ends = availMembers.map(m => parsed[m.key].endMins);
        const mS = Math.max(...starts);
        const mE = Math.min(...ends);

        if (mS >= mE) {
          overlapText = 'Geen overlap';
          // Als 3 spelers kunnen maar er geen 3-way overlap is, check of 2 spelers wél overlappen!
          if (count === 3) {
            const pairs = [[0, 1], [0, 2], [1, 2]];
            for (const [i, j] of pairs) {
              const a = availMembers[i];
              const b = availMembers[j];
              const pS = Math.max(parsed[a.key].startMins, parsed[b.key].startMins);
              const pE = Math.min(parsed[a.key].endMins, parsed[b.key].endMins);
              if (pS < pE) {
                partialPairTip = `Wel overlap ${a.shortName} & ${b.shortName}: ${minsToHHMM(pS)} – ${minsToHHMM(pE)}`;
                break;
              }
            }
          }
        } else {
          overlapStart = mS;
          overlapEnd = mE;
          overlapText = `${minsToHHMM(mS)} – ${minsToHHMM(mE)}`;
          hasOverlap = true;
        }
      }

      // Optionele losse Driving Range notitie (altijd los van Tee times)
      let drNote = '';
      if (drMembers.length >= 2) {
        drNote = `DR: ${drMembers.map(m => m.shortName).join(' & ')} (geen tee time)`;
      } else if (drMembers.length === 1) {
        drNote = `DR: ${drMembers[0].shortName} (${parsed[drMembers[0].key].raw}, geen tee time)`;
      }

      const confirmed = String(rawRow.confirmed || '').trim();
      const note = String(rawRow.note || '').trim();

      // Booker bepalen (alleen wanneer er daadwerkelijk een Tee time mogelijk of bevestigd is)
      let bookerMember = null;
      if (potentieel && (hasOverlap || confirmed)) {
        const sortedCandidates = [...availMembers].sort((a, b) => {
          const diff = (runningCredits[a.key] || 0) - (runningCredits[b.key] || 0);
          return diff !== 0 ? diff : MEMBERS.indexOf(a) - MEMBERS.indexOf(b);
        });
        bookerMember = sortedCandidates[0] || null;
      }

      // Verhoog booker-teller zodra een dag een bevestigde starttijd heeft
      if (confirmed && bookerMember) {
        runningCredits[bookerMember.key] = (runningCredits[bookerMember.key] || 0) + 1;
      }

      // Live Golfweer & optimale starttijd binnen overlap (voor de eerste 7 dagen)
      const weatherDay = weatherByDate[dateIso] || null;
      let weatherOverlap = null;
      if (weatherDay && hasOverlap && count >= 2) {
        weatherOverlap = computeWeatherTeeTimeInOverlap(overlapStart, overlapEnd, weatherDay);
      }

      const shortWindowWarning = hasOverlap && count >= 2 && (overlapEnd - overlapStart) < roundMins;
      const dateMeta = formatDateMeta(dateIso, todayIso);

      computedRows.push({
        dateIso,
        dateMeta,
        rawRow,
        parsed,
        availMembers,
        drMembers,
        count,
        hasMaybe,
        potentieel,
        hasOverlap,
        overlapStart,
        overlapEnd,
        overlapText,
        singleAvailNote,
        drNote,
        partialPairTip,
        shortWindowWarning,
        bookerMember,
        confirmed,
        note,
        weatherDay,
        weatherOverlap,
        course,
        holes
      });
    }

    return {
      rows: computedRows,
      finalCredits: runningCredits,
      course,
      holes,
      todayIso
    };
  }

  // ============================================================
  // 4. OPSLAG (LOCALSTORAGE) & GOOGLE APPS SCRIPT SYNC
  // ============================================================
  function loadLocalData() {
    let savedRows = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ROWS);
      if (raw) savedRows = JSON.parse(raw);
    } catch (e) {}

    if (savedRows && typeof savedRows === 'object' && Object.keys(savedRows).length > 0) {
      plannerState.rowsByDate = savedRows;
    } else {
      plannerState.rowsByDate = JSON.parse(JSON.stringify(SEED_SHEET_ROWS));
    }

    try {
      const meta = JSON.parse(localStorage.getItem(STORAGE_KEY_META) || '{}');
      if (meta.sheetUrl) plannerState.sheetUrl = meta.sheetUrl;
      if (meta.lastSyncedAt) plannerState.lastSyncedAt = meta.lastSyncedAt;
      if (meta.activeMember) plannerState.activeMember = meta.activeMember;
      if (meta.weeksCount && meta.weeksCount >= 2) plannerState.weeksCount = meta.weeksCount;
      if (meta.baseCredits) plannerState.baseCredits = { ...DEFAULT_BASE_CREDITS, ...meta.baseCredits };
    } catch (e) {}
  }

  function saveLocalData() {
    try {
      localStorage.setItem(STORAGE_KEY_ROWS, JSON.stringify(plannerState.rowsByDate));
      localStorage.setItem(STORAGE_KEY_META, JSON.stringify({
        sheetUrl: plannerState.sheetUrl,
        lastSyncedAt: plannerState.lastSyncedAt,
        activeMember: plannerState.activeMember,
        weeksCount: plannerState.weeksCount,
        baseCredits: plannerState.baseCredits
      }));
    } catch (e) {}
  }

  function showPlannerStatus(msg, tone = 'success') {
    const banner = el('plannerStatusBanner');
    if (banner) {
      const tones = {
        success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
        info: 'bg-amber-50 text-amber-900 border-amber-200',
        error: 'bg-rose-50 text-rose-900 border-rose-200'
      };
      banner.className = `text-xs font-medium rounded-xl px-3.5 py-2.5 border ${tones[tone] || tones.info}`;
      banner.textContent = msg;
      banner.classList.remove('hidden');
      clearTimeout(banner._hideTimer);
      banner._hideTimer = setTimeout(() => banner.classList.add('hidden'), 5000);
    }
    window.GolfWeerApp?.announceStatus?.(msg);
  }

  function updateSyncPillUi() {
    const pill = el('plannerSyncPill');
    const syncNowBtn = el('btnPlannerSyncNow');
    if (!pill) return;

    if (plannerState.isSyncing) {
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Synchroniseren...`;
      pill.className = 'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200';
      return;
    }

    if (plannerState.sheetUrl) {
      const timeLabel = plannerState.lastSyncedAt
        ? new Date(plannerState.lastSyncedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
        : '';
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Google Sheet live${timeLabel ? ` (${timeLabel})` : ''}`;
      pill.className = 'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200';
      if (syncNowBtn) syncNowBtn.classList.remove('hidden');
    } else {
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Lokaal opgeslagen`;
      pill.className = 'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f2efe7] text-stone-700 border border-[#e5dfd1]';
      if (syncNowBtn) syncNowBtn.classList.add('hidden');
    }
  }

  async function pullFromGoogleSheet(silent = false) {
    if (!plannerState.sheetUrl) return false;
    plannerState.isSyncing = true;
    updateSyncPillUi();
    try {
      const res = await fetch(plannerState.sheetUrl, { method: 'GET', redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Onbekende fout uit Google Sheet');

      if (data.baseCredits) {
        plannerState.baseCredits = {
          tom: Number(data.baseCredits.tom) || 0,
          jeff: Number(data.baseCredits.jeff) || 0,
          ed: Number(data.baseCredits.ed) || 0
        };
      }
      if (Array.isArray(data.rows)) {
        const nextMap = {};
        data.rows.forEach(r => {
          if (r.date) {
            nextMap[r.date] = {
              tom: r.tom || '',
              jeff: r.jeff || '',
              ed: r.ed || '',
              confirmed: r.confirmed || '',
              note: r.note || ''
            };
          }
        });
        plannerState.rowsByDate = nextMap;
      }
      plannerState.lastSyncedAt = new Date().toISOString();
      saveLocalData();
      plannerState.isSyncing = false;
      updateSyncPillUi();
      renderPlanner();
      if (!silent) showPlannerStatus('Planning live opgehaald uit Google Sheet "Swingersclub E.v."!', 'success');
      return true;
    } catch (err) {
      plannerState.isSyncing = false;
      updateSyncPillUi();
      if (!silent) showPlannerStatus(`Kon niet synchroniseren met Google Sheet: ${err.message}`, 'error');
      return false;
    }
  }

  async function pushUpdateToGoogleSheet(payload) {
    if (!plannerState.sheetUrl) return;
    plannerState.isSyncing = true;
    updateSyncPillUi();
    try {
      // Content-Type: text/plain voorkomt CORS preflight bij Google Apps Script Web Apps
      const res = await fetch(plannerState.sheetUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Opslaan in Sheet mislukt');

      plannerState.lastSyncedAt = new Date().toISOString();
      saveLocalData();
      plannerState.isSyncing = false;
      updateSyncPillUi();
    } catch (err) {
      plannerState.isSyncing = false;
      updateSyncPillUi();
      showPlannerStatus(`Lokaal opgeslagen, maar Sheet-sync gaf een fout: ${err.message}`, 'error');
    }
  }

  // ============================================================
  // 5. UI RENDERING VAN HET SWINGERSCLUB TABBLAD
  // ============================================================
  function renderPlanner() {
    const schedule = buildComputedSchedule();
    const { rows, finalCredits, course, holes } = schedule;
    const scoreMetaFn = window.GolfWeerApp?.scoreBadgeMeta;

    updateSyncPillUi();

    // Update tab-badge met aantal komende GO / GOGOGO / Confirmed dagen met geldige overlap
    const badgeEl = el('plannerBadgeCount');
    const actionableCount = rows.filter(r => r.confirmed || (r.potentieel && r.hasOverlap)).length;
    if (badgeEl) {
      if (actionableCount > 0) {
        badgeEl.textContent = String(actionableCount);
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    // Hint welke baan/holes gebruikt wordt voor de 7-daagse weer-integratie
    const hintEl = el('plannerCourseWeatherHint');
    if (hintEl && course) {
      hintEl.innerHTML = `Eerste 7 dagen gekoppeld aan <strong>${escapeHtml(course.name)}</strong> (${holes} holes) • Tik op een cel om beschikbaarheid of bevestigde tee time aan te passen.`;
    }

    // 1. Eerlijke Booker-rotatie teller
    const creditsBar = el('bookerCreditsBar');
    if (creditsBar) {
      const minCredits = Math.min(finalCredits.tom, finalCredits.jeff, finalCredits.ed);
      creditsBar.innerHTML = MEMBERS.map(m => {
        const count = finalCredits[m.key] || 0;
        const isNext = count === minCredits;
        return `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
            isNext
              ? 'bg-[#163828] text-white border-[#c5a059] font-bold'
              : 'bg-white text-stone-700 border-[#e5dfd1] font-semibold'
          }">
            <span>${m.name}</span>
            <span class="font-mono-score text-[11px] ${isNext ? 'text-[#e7cf9b]' : 'text-stone-500'}">${count}&times;</span>
          </span>
        `;
      }).join('');
    }

    // 2. Actieve speler knoppen bijwerken
    const picker = el('activeMemberPicker');
    if (picker) {
      picker.querySelectorAll('button[data-member]').forEach(btn => {
        const active = btn.dataset.member === plannerState.activeMember;
        btn.className = active
          ? 'py-1.5 px-1 rounded-lg font-bold bg-[#163828] text-white transition'
          : 'py-1.5 px-1 rounded-lg font-semibold text-stone-700 hover:text-[#163828] transition';
      });
    }

    // 3. Komende Mogelijkheden / Kansrijke Tee Times Banner
    const highlightsEl = el('plannerHighlights');
    if (highlightsEl) {
      const highlights = rows.filter(r => r.confirmed || (r.potentieel && r.hasOverlap)).slice(0, 6);
      if (highlights.length === 0) {
        highlightsEl.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-[#e7cf9b]">⛳ Komende Tee-Time Mogelijkheden</div>
              <h3 class="font-serif-club text-lg font-bold mt-0.5">Nog geen overlappende GO / GOGOGO dagen gevonden</h3>
              <p class="text-xs text-emerald-100/85 mt-0.5">Vul hieronder beschikbaarheid in voor Tom 🦩, Jeff en Ed om direct mogelijke tee times te zien.</p>
            </div>
          </div>
        `;
      } else {
        highlightsEl.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-[#e7cf9b]">★ Komende Tee-Time Mogelijkheden</div>
              <p class="text-xs text-emerald-100/85">Dagen met 2 of 3 beschikbare spelers en overlappende tijden (inclusief live weer binnen 7 dagen)</p>
            </div>
            <span class="font-mono-score text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 border border-[#c5a059]/50 text-[#e7cf9b]">
              ${highlights.length} ${highlights.length === 1 ? 'optie' : 'opties'}
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            ${highlights.map(r => {
              const statusBadge = r.confirmed
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-[#163828]">BEVESTIGD ${escapeHtml(r.confirmed)}</span>`
                : r.potentieel === 'GOGOGO'
                  ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c5a059] text-[#163828]">GOGOGO (3/3)</span>`
                  : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">GO (2/3)</span>`;

              const playersText = r.availMembers.map(m => m.name + (r.parsed[m.key].maybe ? '?' : '')).join(' · ');
              let weatherSnippet = '';
              if (r.weatherDay && scoreMetaFn) {
                if (r.weatherOverlap && r.weatherOverlap.possible) {
                  const bm = scoreMetaFn(r.weatherOverlap.score);
                  weatherSnippet = `
                    <div class="mt-2 pt-2 border-t border-white/15 flex items-center justify-between gap-2 text-[11px]">
                      <span class="text-emerald-100">${r.weatherDay.icon} ${escapeHtml(r.weatherOverlap.label)}</span>
                      <span class="font-mono-score font-bold px-1.5 py-0.5 rounded text-[10px]" style="${bm.bgStyle}">${r.weatherOverlap.score}</span>
                    </div>
                  `;
                } else if (r.weatherOverlap && !r.weatherOverlap.possible) {
                  weatherSnippet = `<div class="mt-2 pt-2 border-t border-white/15 text-[11px] text-amber-200">🌙 ${escapeHtml(r.weatherOverlap.reason)}</div>`;
                }
              }

              return `
                <button type="button" data-focus-date="${r.dateIso}"
                  class="text-left rounded-xl p-3 bg-white/10 hover:bg-white/15 border ${r.confirmed ? 'border-emerald-300/80' : 'border-[#c5a059]/45'} transition flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-serif-club font-bold text-sm text-white">${r.dateMeta.displayDay} ${r.dateMeta.dateShort}</span>
                      ${statusBadge}
                    </div>
                    <div class="font-mono-score text-xs font-bold text-[#e7cf9b] mt-1">${escapeHtml(r.overlapText)}</div>
                    <div class="text-[11px] text-emerald-100/90 mt-1">${escapeHtml(playersText)}</div>
                    ${r.bookerMember ? `<div class="text-[10px] text-emerald-200/85 mt-0.5">Booker: <strong>${escapeHtml(r.bookerMember.name)}</strong></div>` : ''}
                    ${r.note ? `<div class="text-[10px] text-amber-200 mt-0.5 truncate">📝 ${escapeHtml(r.note)}</div>` : ''}
                  </div>
                  ${weatherSnippet}
                </button>
              `;
            }).join('')}
          </div>
        `;

        highlightsEl.querySelectorAll('button[data-focus-date]').forEach(btn => {
          btn.addEventListener('click', () => {
            const tr = document.querySelector(`tr[data-planner-date="${btn.dataset.focusDate}"]`);
            if (tr) {
              tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
              tr.classList.add('pulse-gold');
              setTimeout(() => tr.classList.remove('pulse-gold'), 1400);
            }
          });
        });
      }
    }

    // 4. Filter rijen voor tabel
    const filteredRows = rows.filter(r => {
      if (plannerState.filter === 'go') return Boolean(r.potentieel);
      if (plannerState.filter === 'week7') return Boolean(r.weatherDay);
      if (plannerState.filter === 'confirmed') return Boolean(r.confirmed);
      return true;
    });

    const tbody = el('plannerTableBody');
    if (!tbody) return;

    if (filteredRows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="p-6 text-center text-stone-500">
            Geen dagen gevonden voor dit filter. Kies <strong>Alle dagen</strong> om de hele planning te zien.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filteredRows.map((r, idx) => {
      const rowClasses = [
        r.dateMeta.isWeekend ? 'planner-row-weekend' : '',
        r.confirmed ? 'planner-row-confirmed' : '',
        r.dateMeta.isToday ? 'planner-row-today' : '',
        (r.dateMeta.isMonday && idx > 0) ? 'planner-week-sep' : ''
      ].filter(Boolean).join(' ');

      // Live weer-badge in datumkolom voor eerste 7 dagen
      let dateWeatherChip = '';
      if (r.weatherDay && scoreMetaFn) {
        const bm = scoreMetaFn(r.weatherDay.score);
        dateWeatherChip = `
          <button type="button" data-jump-weather-day="${r.weatherDay.dayIndex}"
            class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono-score font-bold hover:opacity-90 transition"
            style="${bm.bgStyle}">
            <span>${r.weatherDay.icon} ${r.weatherDay.score}</span>
            <span class="opacity-85 font-normal">• ${r.weatherDay.temp}°</span>
          </button>
        `;
      }

      // 3 speler-cellen
      const memberCells = MEMBERS.map(m => {
        const p = r.parsed[m.key];
        const isActive = plannerState.activeMember === m.key;
        const label = p.displayLabel ? escapeHtml(p.displayLabel) : '+ Invullen';
        const ariaLabel = `${m.name} op ${r.dateMeta.weekdayLong} ${r.dateMeta.dateShort}: ${p.summary}, klik om te bewerken`;
        return `
          <td>
            <button type="button"
              data-edit-member="${m.key}"
              data-edit-date="${r.dateIso}"
              aria-label="${escapeHtml(ariaLabel)}"
              class="avail-cell-btn ${p.cssClass} ${isActive ? 'avail-active-member' : ''}">
              <span class="block truncate">${label}</span>
            </button>
          </td>
        `;
      }).join('');

      // Potentieel badge (kolom F)
      let potHtml = `<span class="text-stone-300 font-mono-score">—</span>`;
      if (r.potentieel === 'GOGOGO') {
        potHtml = `
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold tracking-wide bg-[#14643c] text-white shadow-sm">
            GOGOGO
          </span>
          ${r.hasMaybe ? '<div class="text-[9px] text-sky-700 font-semibold mt-0.5">o.v.b. misschien</div>' : ''}
        `;
      } else if (r.potentieel === 'GO') {
        potHtml = `
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold tracking-wide bg-[#c5a059] text-[#163828]">
            GO
          </span>
          ${r.hasMaybe ? '<div class="text-[9px] text-sky-700 font-semibold mt-0.5">o.v.b. misschien</div>' : ''}
        `;
      } else if (r.drMembers.length >= 2) {
        potHtml = `
          <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#f3e8ff] text-[#581c87] border border-[#d8b4fe]">
            DR (${r.drMembers.length})
          </span>
        `;
      }

      // Tee time & Weer cel (kolom G + live overlap-weer)
      let teeParts = [];
      if (r.overlapText) {
        const isNoOverlap = !r.hasOverlap;
        teeParts.push(`
          <div class="font-mono-score text-xs font-bold ${isNoOverlap ? 'text-rose-700' : 'text-[#163828]'}">
            ${escapeHtml(r.overlapText)}
          </div>
        `);
        if (r.partialPairTip) {
          teeParts.push(`<div class="text-[10px] text-amber-800 font-medium">${escapeHtml(r.partialPairTip)}</div>`);
        }
        if (r.shortWindowWarning) {
          teeParts.push(`<div class="text-[10px] text-amber-700 font-semibold">⚠ Kort venster (&lt; ${r.holes === 18 ? '4' : '2'}u)</div>`);
        }
        if (r.weatherOverlap && r.weatherOverlap.possible && scoreMetaFn) {
          teeParts.push(`
            <div class="inline-flex flex-wrap items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
              <span>⛳ ${escapeHtml(r.weatherOverlap.label)}</span>
              <span class="font-mono-score font-bold px-1 rounded text-white" style="background-color:${scoreMetaFn(r.weatherOverlap.score).hex}">${r.weatherOverlap.score}</span>
              <span class="text-stone-500 font-normal">(licht tot ${r.weatherOverlap.lightUntil})</span>
            </div>
          `);
        } else if (r.weatherOverlap && !r.weatherOverlap.possible) {
          teeParts.push(`<div class="text-[10px] text-amber-800 font-medium">🌙 ${escapeHtml(r.weatherOverlap.reason)}</div>`);
        }
      } else if (r.singleAvailNote) {
        teeParts.push(`<div class="text-[11px] text-stone-400 font-medium">${escapeHtml(r.singleAvailNote)}</div>`);
      }
      if (r.drNote) {
        teeParts.push(`<div class="text-[10px] text-purple-800 font-medium">${escapeHtml(r.drNote)}</div>`);
      }

      const teeHtml = teeParts.length > 0
        ? `<div class="space-y-1">${teeParts.join('')}</div>`
        : `<span class="text-stone-300">—</span>`;

      // Booker cel (kolom H)
      const bookerHtml = r.bookerMember
        ? `<span class="inline-flex items-center px-2 py-1 rounded-lg bg-[#f2efe7] border border-[#d6cfc0] text-[#163828] font-bold text-[11px] whitespace-nowrap">${escapeHtml(r.bookerMember.name)}</span>`
        : `<span class="text-stone-300">—</span>`;

      // Confirmed cel (kolom I + notitie J)
      const suggestedTee = r.weatherOverlap?.possible
        ? r.weatherOverlap.bestStartStr
        : (r.hasOverlap && r.overlapStart !== null ? minsToHHMM(r.overlapStart) : '');
      const confirmAria = `Bevestigde starttijd en notitie voor ${r.dateMeta.weekdayLong} ${r.dateMeta.dateShort}: ${r.confirmed || 'niet bevestigd'}`;
      const confirmHtml = `
        <button type="button"
          data-edit-confirm="${r.dateIso}"
          data-suggested-tee="${escapeHtml(suggestedTee)}"
          aria-label="${escapeHtml(confirmAria)}"
          class="avail-cell-btn ${r.confirmed ? 'bg-[#163828] text-white border-[#c5a059] font-bold' : 'avail-empty'}">
          ${r.confirmed
            ? `<span class="font-mono-score block">✓ ${escapeHtml(r.confirmed)}</span>`
            : `<span class="block text-[11px]">${r.potentieel ? '+ Bevestig' : '+ Notitie'}</span>`}
          ${r.note ? `<span class="block text-[10px] ${r.confirmed ? 'text-[#e7cf9b]' : 'text-stone-600'} truncate mt-0.5">📝 ${escapeHtml(r.note)}</span>` : ''}
        </button>
      `;

      return `
        <tr data-planner-date="${r.dateIso}" class="${rowClasses}">
          <th scope="row">
            <div class="flex items-center justify-between gap-1">
              <div>
                <div class="text-xs font-bold text-[#163828]">${r.dateMeta.displayDay}</div>
                <div class="text-[11px] text-stone-500 font-normal">${r.dateMeta.dateShort}${r.dateMeta.isWeekend ? ' • Weekend' : ''}</div>
              </div>
              ${r.dateMeta.isToday ? '<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#c5a059] text-[#163828]">Nu</span>' : ''}
            </div>
            ${dateWeatherChip}
          </th>
          ${memberCells}
          <td>${potHtml}</td>
          <td>${teeHtml}</td>
          <td>${bookerHtml}</td>
          <td>${confirmHtml}</td>
        </tr>
      `;
    }).join('');

    // Cell event listeners
    tbody.querySelectorAll('button[data-edit-member]').forEach(btn => {
      btn.addEventListener('click', () => {
        openAvailEditor({
          mode: 'member',
          dateIso: btn.dataset.editDate,
          memberKey: btn.dataset.editMember
        });
      });
    });

    tbody.querySelectorAll('button[data-edit-confirm]').forEach(btn => {
      btn.addEventListener('click', () => {
        openAvailEditor({
          mode: 'confirm',
          dateIso: btn.dataset.editConfirm,
          suggestedTee: btn.dataset.suggestedTee || ''
        });
      });
    });

    tbody.querySelectorAll('button[data-jump-weather-day]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.jumpWeatherDay, 10);
        window.GolfWeerApp?.jumpToCourseDay?.(dayIdx);
      });
    });
  }

  // ============================================================
  // 6. NATIVE <dialog> EDITORS + LIGHT-DISMISS FALLBACK
  // ============================================================
  function attachDialogLightDismissFallback() {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    document.querySelectorAll('dialog[closedby="any"]').forEach(dialog => {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && outside(e, dialog)) dialog.close();
      });
    });
  }

  function updateRawParsePreview() {
    const raw = el('availRawInput')?.value || '';
    const preview = el('availParsePreview');
    if (!preview) return;
    const p = parseAvailability(raw);
    if (p.status === 'empty') {
      preview.textContent = 'Resultaat: leeg (telt niet mee voor GO / GOGOGO).';
    } else if (p.status === 'unavailable') {
      preview.textContent = `Resultaat: ${p.summary} — kan niet (telt niet mee).`;
    } else if (p.status === 'dr') {
      preview.textContent = `Resultaat: ${p.summary} (telt niet mee voor GO / GOGOGO of Booker).`;
    } else {
      preview.textContent = `Resultaat: beschikbaar voor Tee time — ${p.summary}`;
    }
  }

  function applyTimeBuilderToInput() {
    const mode = plannerState.activeTimeMode;
    const startVal = el('availTimeStart')?.value || '13:00';
    const endVal = el('availTimeEnd')?.value || '16:00';
    const input = el('availRawInput');
    if (!input || !mode) return;

    if (mode === 'va') input.value = `va ${startVal}`;
    else if (mode === 'tot') input.value = `tot ${endVal}`;
    else if (mode === 'tussen') input.value = `tussen ${startVal} en ${endVal}`;
    else if (mode === 'dr') input.value = `va ${startVal} DR`;
    updateRawParsePreview();
  }

  function openAvailEditor(ctx) {
    const dialog = el('availEditorDialog');
    if (!dialog) return;

    plannerState.editorContext = ctx;
    plannerState.activeTimeMode = null;

    const todayIso = getAmsterdamTodayIso();
    const dateMeta = formatDateMeta(ctx.dateIso, todayIso);
    const existing = plannerState.rowsByDate[ctx.dateIso] || { tom: '', jeff: '', ed: '', confirmed: '', note: '' };

    const memberFields = el('availMemberFields');
    const confirmFields = el('availConfirmFields');
    const titleEl = el('availEditorTitle');
    const subEl = el('availEditorSubtitle');

    if (ctx.mode === 'member') {
      const member = MEMBERS.find(m => m.key === ctx.memberKey);
      if (titleEl) titleEl.textContent = `${member ? member.name : ''} — Beschikbaarheid`;
      if (subEl) subEl.textContent = `${dateMeta.weekdayLong} ${dateMeta.dateShort} (${ctx.dateIso})`;
      memberFields?.classList.remove('hidden');
      confirmFields?.classList.add('hidden');
      el('timeBuilderInputs')?.classList.add('hidden');

      const input = el('availRawInput');
      if (input) {
        input.value = existing[ctx.memberKey] || '';
      }
      updateRawParsePreview();
    } else {
      if (titleEl) titleEl.textContent = 'Bevestigde Tee Time & Notitie';
      if (subEl) subEl.textContent = `${dateMeta.weekdayLong} ${dateMeta.dateShort} (${ctx.dateIso})`;
      memberFields?.classList.add('hidden');
      confirmFields?.classList.remove('hidden');

      const confirmInput = el('confirmTimeInput');
      const noteInput = el('confirmNoteInput');
      const suggestBtn = el('btnUseSuggestedTee');
      const bookerHint = el('confirmBookerHint');

      if (confirmInput) confirmInput.value = existing.confirmed || '';
      if (noteInput) noteInput.value = existing.note || '';

      if (suggestBtn) {
        if (ctx.suggestedTee) {
          suggestBtn.textContent = `Gebruik ${ctx.suggestedTee}`;
          suggestBtn.dataset.tee = ctx.suggestedTee;
          suggestBtn.classList.remove('hidden');
        } else {
          suggestBtn.classList.add('hidden');
        }
      }

      if (bookerHint) {
        const schedule = buildComputedSchedule();
        const row = schedule.rows.find(r => r.dateIso === ctx.dateIso);
        bookerHint.textContent = row && row.bookerMember
          ? `Booker volgens eerlijke rotatie: ${row.bookerMember.name} (telt +1 zodra starttijd is ingevuld).`
          : 'Vul een bevestigde starttijd in zodra de tee time geboekt is.';
      }
    }

    dialog.showModal();
    if (ctx.mode === 'confirm') {
      el('confirmTimeInput')?.focus();
    } else {
      el('availRawInput')?.focus();
    }
  }

  function openSheetSyncDialog() {
    const dialog = el('sheetSyncDialog');
    if (!dialog) return;
    const urlInput = el('sheetWebAppUrl');
    const preview = el('appsScriptPreview');
    const statusBox = el('sheetSyncModalStatus');
    if (urlInput) urlInput.value = plannerState.sheetUrl || '';
    if (preview) preview.textContent = APPS_SCRIPT_CODE;
    if (statusBox) statusBox.classList.add('hidden');
    dialog.showModal();
  }

  function showSyncModalMessage(msg, tone = 'info') {
    const box = el('sheetSyncModalStatus');
    if (!box) return;
    const tones = {
      success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      info: 'bg-amber-50 text-amber-900 border-amber-200',
      error: 'bg-rose-50 text-rose-900 border-rose-200'
    };
    box.className = `rounded-xl px-3 py-2 text-xs font-medium border ${tones[tone] || tones.info}`;
    box.textContent = msg;
    box.classList.remove('hidden');
  }

  // ============================================================
  // 7. WHATSAPP PLANNING OVERZICHT DELEN
  // ============================================================
  function buildPlannerWhatsAppText() {
    const { rows, finalCredits, course, holes } = buildComputedSchedule();
    const lines = [
      '⛳ *Swingersclub E.v. — Planning & Tee Times*',
      course ? `📍 Weercheck: ${course.name} (${holes} holes)` : '',
      ''
    ].filter(l => l !== null);

    const confirmedRows = rows.filter(r => r.confirmed);
    if (confirmedRows.length > 0) {
      lines.push('*✅ Bevestigde Tee Times:*');
      confirmedRows.forEach(r => {
        const players = r.availMembers.map(m => m.name).join(', ');
        lines.push(`• *${r.dateMeta.displayDay} ${r.dateMeta.dateShort}* om *${r.confirmed}* (${players})${r.note ? ' — ' + r.note : ''}`);
      });
      lines.push('');
    }

    const openGoRows = rows.filter(r => !r.confirmed && r.potentieel && r.hasOverlap).slice(0, 8);
    if (openGoRows.length > 0) {
      lines.push('*🗓️ Kansrijke opties (GO / GOGOGO):*');
      openGoRows.forEach(r => {
        const players = r.availMembers.map(m => m.name + (r.parsed[m.key].maybe ? '?' : '')).join(', ');
        let extra = '';
        if (r.weatherOverlap?.possible) {
          extra = ` | Weer ${r.weatherOverlap.score}/100 (${r.weatherOverlap.label})`;
        } else if (r.weatherDay) {
          extra = ` | Weer ${r.weatherDay.score}/100`;
        }
        const bookerTxt = r.bookerMember ? ` | Booker: ${r.bookerMember.name}` : '';
        lines.push(`• *${r.dateMeta.displayDay} ${r.dateMeta.dateShort}* [${r.potentieel}] ${r.overlapText} (${players})${extra}${bookerTxt}`);
      });
      lines.push('');
    }

    lines.push(`📊 Boek-teller: Tom 🦩 ${finalCredits.tom}× | Jeff ${finalCredits.jeff}× | Ed ${finalCredits.ed}×`);
    lines.push('Vul je beschikbaarheid aan in de planner! 🏌️‍♂️');
    return lines.join('\n');
  }

  // ============================================================
  // 8. INITIALISATIE & EVENT LISTENERS
  // ============================================================
  function initPlanner() {
    loadLocalData();
    attachDialogLightDismissFallback();

    // Actieve speler markering
    el('activeMemberPicker')?.querySelectorAll('button[data-member]').forEach(btn => {
      btn.addEventListener('click', () => {
        plannerState.activeMember = btn.dataset.member;
        saveLocalData();
        renderPlanner();
      });
    });

    // Dagfilter
    el('plannerFilterSelect')?.addEventListener('change', (e) => {
      plannerState.filter = e.target.value;
      renderPlanner();
    });

    // Extra week toevoegen
    el('btnPlannerAddWeek')?.addEventListener('click', () => {
      plannerState.weeksCount = Math.min(12, plannerState.weeksCount + 1);
      saveLocalData();
      renderPlanner();
      showPlannerStatus(`Extra week toegevoegd (nu ${plannerState.weeksCount} weken zichtbaar).`, 'info');
    });

    // Deel via WhatsApp
    el('btnPlannerShareWA')?.addEventListener('click', async () => {
      const text = buildPlannerWhatsAppText();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          showPlannerStatus('Swingersclub WhatsApp-overzicht gekopieerd naar klembord!', 'success');
          return;
        }
      } catch (e) {}
      const ok = window.GolfWeerApp?.copyTextFallback?.(text);
      showPlannerStatus(
        ok ? 'Swingersclub WhatsApp-overzicht gekopieerd naar klembord!' : 'Kon overzicht niet automatisch kopiëren.',
        ok ? 'success' : 'error'
      );
    });

    // Google Sheet koppeling knoppen
    el('btnOpenSheetSync')?.addEventListener('click', openSheetSyncDialog);
    el('btnPlannerSyncNow')?.addEventListener('click', () => pullFromGoogleSheet(false));
    el('btnCloseSyncDialog')?.addEventListener('click', () => el('sheetSyncDialog')?.close());

    el('btnCopyAppsScript')?.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
          showSyncModalMessage('Apps Script gekopieerd! Plak dit in Extensies → Apps Script in de Google Sheet.', 'success');
          return;
        }
      } catch (e) {}
      const ok = window.GolfWeerApp?.copyTextFallback?.(APPS_SCRIPT_CODE);
      showSyncModalMessage(ok ? 'Apps Script gekopieerd!' : 'Kopiëren mislukt — selecteer het script handmatig.', ok ? 'success' : 'error');
    });

    el('btnSaveAndSyncUrl')?.addEventListener('click', async () => {
      const url = (el('sheetWebAppUrl')?.value || '').trim();
      if (!url || !/^https:\/\/script\.google\.com\/macros\/s\//i.test(url)) {
        showSyncModalMessage('Vul een geldige Google Apps Script Web-app URL in (begint met https://script.google.com/macros/s/...).', 'error');
        return;
      }
      plannerState.sheetUrl = url;
      saveLocalData();
      showSyncModalMessage('Verbinding testen en planning ophalen...', 'info');
      const ok = await pullFromGoogleSheet(true);
      if (ok) {
        showSyncModalMessage('Gekoppeld! Alle wijzigingen synchroniseren nu live met tabblad "Huidig".', 'success');
        setTimeout(() => el('sheetSyncDialog')?.close(), 900);
      } else {
        showSyncModalMessage('Verbinding mislukt. Controleer of de Web-app is gedeployed met toegang "Iedereen".', 'error');
      }
    });

    el('btnDisconnectSheet')?.addEventListener('click', () => {
      plannerState.sheetUrl = '';
      plannerState.lastSyncedAt = '';
      saveLocalData();
      updateSyncPillUi();
      if (el('sheetWebAppUrl')) el('sheetWebAppUrl').value = '';
      showSyncModalMessage('Google Sheet-koppeling verbroken. De planner werkt nu lokaal in je browser.', 'info');
    });

    el('btnResetSeedData')?.addEventListener('click', () => {
      plannerState.rowsByDate = JSON.parse(JSON.stringify(SEED_SHEET_ROWS));
      plannerState.baseCredits = { ...DEFAULT_BASE_CREDITS };
      saveLocalData();
      renderPlanner();
      showSyncModalMessage('Planning hersteld naar de laatste voorgeladen Sheet-snapshot.', 'success');
    });

    // Beschikbaarheid Editor Dialog events
    el('btnCloseAvailDialog')?.addEventListener('click', () => el('availEditorDialog')?.close());
    el('btnCancelAvailDialog')?.addEventListener('click', () => el('availEditorDialog')?.close());
    el('availRawInput')?.addEventListener('input', updateRawParsePreview);

    document.querySelectorAll('button[data-quick-avail]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = el('availRawInput');
        if (input) {
          input.value = btn.dataset.quickAvail;
          plannerState.activeTimeMode = null;
          el('timeBuilderInputs')?.classList.add('hidden');
          updateRawParsePreview();
          input.focus();
        }
      });
    });

    document.querySelectorAll('button[data-time-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.timeMode;
        plannerState.activeTimeMode = mode;
        const wrap = el('timeBuilderInputs');
        const endWrap = el('availTimeEndWrap');
        const startInput = el('availTimeStart');
        const endInput = el('availTimeEnd');
        wrap?.classList.remove('hidden');

        if (mode === 'va') {
          startInput.parentElement.classList.remove('hidden');
          endWrap.classList.add('hidden');
          if (!startInput.value || startInput.value === '20:00') startInput.value = '13:00';
        } else if (mode === 'tot') {
          startInput.parentElement.classList.add('hidden');
          endWrap.classList.remove('hidden');
          if (!endInput.value) endInput.value = '15:00';
        } else if (mode === 'tussen') {
          startInput.parentElement.classList.remove('hidden');
          endWrap.classList.remove('hidden');
          if (!startInput.value) startInput.value = '10:00';
          if (!endInput.value) endInput.value = '14:00';
        } else if (mode === 'dr') {
          startInput.parentElement.classList.remove('hidden');
          endWrap.classList.add('hidden');
          startInput.value = '20:00';
        }
        applyTimeBuilderToInput();
      });
    });

    el('availTimeStart')?.addEventListener('change', applyTimeBuilderToInput);
    el('availTimeEnd')?.addEventListener('change', applyTimeBuilderToInput);

    el('btnUseSuggestedTee')?.addEventListener('click', (e) => {
      const tee = e.currentTarget.dataset.tee;
      if (tee && el('confirmTimeInput')) el('confirmTimeInput').value = tee;
    });

    el('btnClearConfirmTime')?.addEventListener('click', () => {
      if (el('confirmTimeInput')) el('confirmTimeInput').value = '';
    });

    // Opslaan vanuit editor dialog
    el('availEditorForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const ctx = plannerState.editorContext;
      if (!ctx) return;

      const current = plannerState.rowsByDate[ctx.dateIso] || { tom: '', jeff: '', ed: '', confirmed: '', note: '' };

      if (ctx.mode === 'member') {
        const val = (el('availRawInput')?.value || '').trim();
        current[ctx.memberKey] = val;
        plannerState.rowsByDate[ctx.dateIso] = current;
        saveLocalData();
        el('availEditorDialog')?.close();
        renderPlanner();

        const m = MEMBERS.find(x => x.key === ctx.memberKey);
        showPlannerStatus(`${m ? m.name : ''} op ${ctx.dateIso} bijgewerkt${val ? `: "${val}"` : ' (leeggemaakt)'}.`, 'success');

        pushUpdateToGoogleSheet({
          action: 'updateCell',
          date: ctx.dateIso,
          field: ctx.memberKey,
          value: val
        });
      } else {
        const confirmedVal = (el('confirmTimeInput')?.value || '').trim();
        const noteVal = (el('confirmNoteInput')?.value || '').trim();
        current.confirmed = confirmedVal;
        current.note = noteVal;
        plannerState.rowsByDate[ctx.dateIso] = current;
        saveLocalData();
        el('availEditorDialog')?.close();
        renderPlanner();

        showPlannerStatus(
          confirmedVal ? `Tee time op ${ctx.dateIso} bevestigd om ${confirmedVal}!` : `Notitie voor ${ctx.dateIso} bijgewerkt.`,
          'success'
        );

        pushUpdateToGoogleSheet({
          action: 'upsertRow',
          date: ctx.dateIso,
          confirmed: confirmedVal,
          note: noteVal
        });
      }
    });

    // Publieke hook voor app.js
    window.SwingersPlanner = {
      render: renderPlanner,
      onWeatherOrSettingsUpdated: renderPlanner
    };

    renderPlanner();
    if (plannerState.sheetUrl) {
      pullFromGoogleSheet(true);
    }
  }

  document.addEventListener('DOMContentLoaded', initPlanner);
})();

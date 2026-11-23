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
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'batchUpsert' && Array.isArray(body.rows)) {
      body.rows.forEach(upsertRow);
    } else {
      upsertRow(body);
    }
    SpreadsheetApp.flush();
    return jsonRes({ ok: true, ...readState() });
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
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

function readState() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const last = sh.getLastRow();
  if (last < 2) return { rows: [], baseCredits: { tom: 0, jeff: 0, ed: 0 } };
  const numCols = Math.max(10, sh.getLastColumn());
  const rawDates = sh.getRange(2, 2, last - 1, 1).getValues();
  const displayRows = sh.getRange(2, 1, last - 1, numCols).getDisplayValues();
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const baseCredits = { tom: 0, jeff: 0, ed: 0 };
  const rows = [];
  for (let i = 0; i < displayRows.length; i++) {
    const d = fmtDate(rawDates[i][0]);
    if (!d) continue;
    const r = displayRows[i];
    const confirmed = String(r[8] || '').trim();
    if (d < today) {
      if (confirmed) {
        const b = String(r[7] || '').toLowerCase();
        if (b.includes('tom')) baseCredits.tom++;
        else if (b.includes('jeff')) baseCredits.jeff++;
        else if (b.includes('ed')) baseCredits.ed++;
      }
      continue;
    }
    const row = {
      date: d,
      tom: String(r[2] || '').trim(),
      jeff: String(r[3] || '').trim(),
      ed: String(r[4] || '').trim(),
      booker: String(r[7] || '').trim(),
      confirmed,
      note: String(r[9] || '').trim()
    };
    if (row.tom || row.jeff || row.ed || row.booker || row.confirmed || row.note) rows.push(row);
  }
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
    const map = { tom: 3, jeff: 4, ed: 5, booker: 8, confirmed: 9, note: 10 };
    if (map[item.field]) sh.getRange(rowIdx, map[item.field]).setValue(item.value ?? '');
    return;
  }
  if (item.tom !== undefined) sh.getRange(rowIdx, 3).setValue(item.tom);
  if (item.jeff !== undefined) sh.getRange(rowIdx, 4).setValue(item.jeff);
  if (item.ed !== undefined) sh.getRange(rowIdx, 5).setValue(item.ed);
  if (item.booker !== undefined) sh.getRange(rowIdx, 8).setValue(item.booker);
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

  function normalizeBookerKey(val) {
    const s = String(val || '').trim().toLowerCase();
    if (!s) return '';
    if (s.includes('tom')) return 'tom';
    if (s.includes('jeff')) return 'jeff';
    if (s.includes('ed')) return 'ed';
    return '';
  }

  function memberNameByKey(key) {
    const m = MEMBERS.find(x => x.key === key);
    return m ? m.name : '';
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

    // Eerlijke booker-verdeling bijhouden (chronologisch vanaf baseCredits)
    const runningCredits = { ...plannerState.baseCredits };
    const computedRows = [];
    let dirtyBookerLock = false;

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

      // Overlap & Potentieel berekening: alleen GO / GOGOGO als er daadwerkelijk overlap is!
      let potentieel = '';
      let playingMembers = availMembers;
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

        if (mS < mE) {
          overlapStart = mS;
          overlapEnd = mE;
          overlapText = `${minsToHHMM(mS)} – ${minsToHHMM(mE)}`;
          hasOverlap = true;
          potentieel = count === 3 ? 'GOGOGO' : 'GO';
          playingMembers = availMembers;
        } else if (count === 3) {
          // Geen 3-way overlap: check of er wél een koppel van 2 spelers overlapt
          let bestPair = null;
          const pairs = [[0, 1, 2], [0, 2, 1], [1, 2, 0]];
          for (const [i, j, k] of pairs) {
            const a = availMembers[i];
            const b = availMembers[j];
            const c = availMembers[k];
            const pS = Math.max(parsed[a.key].startMins, parsed[b.key].startMins);
            const pE = Math.min(parsed[a.key].endMins, parsed[b.key].endMins);
            if (pS < pE && (!bestPair || (pE - pS) > (bestPair.end - bestPair.start))) {
              bestPair = { a, b, excluded: c, start: pS, end: pE };
            }
          }
          if (bestPair) {
            overlapStart = bestPair.start;
            overlapEnd = bestPair.end;
            overlapText = `${minsToHHMM(bestPair.start)} – ${minsToHHMM(bestPair.end)}`;
            hasOverlap = true;
            potentieel = 'GO';
            playingMembers = [bestPair.a, bestPair.b];
            partialPairTip = `Alleen ${bestPair.a.shortName} & ${bestPair.b.shortName} (${bestPair.excluded.shortName} overlapt niet)`;
          } else {
            overlapText = 'Geen overlap';
          }
        } else {
          // 2 spelers zonder overlap -> geen GO
          overlapText = 'Geen overlap';
        }
      }

      const hasMaybe = playingMembers.some(m => parsed[m.key].maybe);

      // Optionele losse Driving Range notitie (altijd los van Tee times)
      let drNote = '';
      if (drMembers.length >= 2) {
        drNote = `DR: ${drMembers.map(m => m.shortName).join(' & ')} (geen tee time)`;
      } else if (drMembers.length === 1) {
        drNote = `DR: ${drMembers[0].shortName} (${parsed[drMembers[0].key].raw}, geen tee time)`;
      }

      const confirmed = String(rawRow.confirmed || '').trim();
      const note = String(rawRow.note || '').trim();

      // Booker bepalen: eerlijk op basis van minste vorige boekingen, bij gelijke stand RANDOM geloot
      // uit de aanwezige spelers en direct vastgelegd. Handmatige keuze blijft behouden zolang die speler aanwezig is.
      let bookerMember = null;
      let bookerManual = false;
      let bookerFairPool = [];
      const creditsSnapshot = { ...runningCredits };

      if ((potentieel && hasOverlap) || (confirmed && availMembers.length > 0)) {
        const candidates = (potentieel && hasOverlap) ? playingMembers : availMembers;
        const minCredits = Math.min(...candidates.map(m => runningCredits[m.key] || 0));
        bookerFairPool = candidates.filter(m => (runningCredits[m.key] || 0) === minCredits);

        const savedKey = normalizeBookerKey(rawRow.booker);
        const savedManual = Boolean(rawRow.bookerManual);

        if (savedManual && savedKey && candidates.some(m => m.key === savedKey)) {
          // Handmatig gekozen booker die nog steeds aanwezig is
          bookerMember = candidates.find(m => m.key === savedKey);
          bookerManual = true;
        } else if (savedKey && bookerFairPool.some(m => m.key === savedKey)) {
          // Eerder (eerlijk & random) vastgelegde booker die nog steeds in de eerlijke poule zit
          bookerMember = bookerFairPool.find(m => m.key === savedKey);
          bookerManual = false;
        } else if (bookerFairPool.length > 0) {
          // Willekeurig loten uit de aanwezige spelers met de minste eerdere boekingen en direct vastleggen
          const picked = bookerFairPool[Math.floor(Math.random() * bookerFairPool.length)];
          bookerMember = picked;
          bookerManual = false;
          if (!plannerState.rowsByDate[dateIso]) {
            plannerState.rowsByDate[dateIso] = { tom: '', jeff: '', ed: '', booker: '', bookerManual: false, confirmed: '', note: '' };
          }
          plannerState.rowsByDate[dateIso].booker = picked.key;
          plannerState.rowsByDate[dateIso].bookerManual = false;
          dirtyBookerLock = true;
        }
      } else if (rawRow.booker || rawRow.bookerManual) {
        // Geen overlap / geen tee time meer -> oude booker wissen
        if (plannerState.rowsByDate[dateIso]) {
          plannerState.rowsByDate[dateIso].booker = '';
          plannerState.rowsByDate[dateIso].bookerManual = false;
          dirtyBookerLock = true;
        }
      }

      // Verhoog booker-teller zodra een dag een bevestigde starttijd heeft
      if (confirmed && bookerMember) {
        runningCredits[bookerMember.key] = (runningCredits[bookerMember.key] || 0) + 1;
      }

      // Live Golfweer & optimale starttijd binnen overlap (voor de eerste 7 dagen)
      const weatherDay = weatherByDate[dateIso] || null;
      let weatherOverlap = null;
      if (weatherDay && hasOverlap && playingMembers.length >= 2) {
        weatherOverlap = computeWeatherTeeTimeInOverlap(overlapStart, overlapEnd, weatherDay);
      }

      const shortWindowWarning = hasOverlap && playingMembers.length >= 2 && (overlapEnd - overlapStart) < roundMins;
      const dateMeta = formatDateMeta(dateIso, todayIso);

      computedRows.push({
        dateIso,
        dateMeta,
        rawRow,
        parsed,
        availMembers: playingMembers,
        allAvailMembers: availMembers,
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
        bookerManual,
        bookerFairPool,
        creditsBeforeDay: creditsSnapshot,
        confirmed,
        note,
        weatherDay,
        weatherOverlap,
        course,
        holes
      });
    }

    if (dirtyBookerLock) {
      saveLocalData();
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
        success: 'bg-[#f1f6f3] text-[#1b4332] border-[#c7dcd0]',
        info: 'bg-[#faf7ef] text-[#5c4518] border-[#e3d6b8]',
        error: 'bg-[#faf4f4] text-[#592629] border-[#dfc5c7]'
      };
      banner.className = `text-xs font-medium rounded-lg px-3.5 py-2.5 border ${tones[tone] || tones.info}`;
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
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[#8f723d] animate-pulse" aria-hidden="true"></span> Sync...`;
      pill.className = 'inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#faf7ef] text-[#5c4518] border border-[#e3d6b8]';
      return;
    }

    if (plannerState.sheetUrl) {
      const timeLabel = plannerState.lastSyncedAt
        ? new Date(plannerState.lastSyncedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
        : '';
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[#1f573d]" aria-hidden="true"></span> Live${timeLabel ? ` · ${timeLabel}` : ''}`;
      pill.className = 'inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#f1f6f3] text-[#1b4332] border border-[#c7dcd0]';
      if (syncNowBtn) syncNowBtn.classList.remove('hidden');
    } else {
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[#8f723d]" aria-hidden="true"></span> Lokaal`;
      pill.className = 'inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#f2f0ea] text-[#535d57] border border-[#e6e3db]';
      if (syncNowBtn) syncNowBtn.classList.add('hidden');
    }
  }

  function applyRemoteState(data) {
    if (data.baseCredits) {
      plannerState.baseCredits = {
        tom: Number(data.baseCredits.tom) || 0,
        jeff: Number(data.baseCredits.jeff) || 0,
        ed: Number(data.baseCredits.ed) || 0
      };
    }
    if (Array.isArray(data.rows)) {
      const prevMap = plannerState.rowsByDate || {};
      const nextMap = {};
      data.rows.forEach(r => {
        if (r.date) {
          const prev = prevMap[r.date] || {};
          const remoteBooker = normalizeBookerKey(r.booker);
          const bookerKey = remoteBooker || normalizeBookerKey(prev.booker);
          nextMap[r.date] = {
            tom: r.tom || '',
            jeff: r.jeff || '',
            ed: r.ed || '',
            booker: bookerKey,
            bookerManual: Boolean(prev.bookerManual && (!remoteBooker || remoteBooker === normalizeBookerKey(prev.booker))),
            confirmed: r.confirmed || '',
            note: r.note || ''
          };
        }
      });
      plannerState.rowsByDate = nextMap;
    }
    plannerState.lastSyncedAt = new Date().toISOString();
    saveLocalData();
  }

  function maybeAutoPullFromSheet() {
    if (!plannerState.sheetUrl || plannerState.isSyncing) return;
    const lastMs = plannerState.lastSyncedAt ? Date.parse(plannerState.lastSyncedAt) : 0;
    if (Date.now() - lastMs > 20000) {
      pullFromGoogleSheet(true);
    }
  }

  function importSheetUrlFromLocation() {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashStr = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
      const hashParams = new URLSearchParams(hashStr);
      const candidate = (searchParams.get('sheet') || hashParams.get('sheet') || '').trim();
      if (candidate && /^https:\/\/script\.google\.com\/macros\/s\//i.test(candidate)) {
        plannerState.sheetUrl = candidate;
        saveLocalData();
        // Schoon de URL op zodat de /exec-URL niet zichtbaar blijft in de adresbalk
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history?.replaceState?.({}, document.title, cleanUrl);
        return true;
      }
    } catch (e) {}
    return false;
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

      applyRemoteState(data);
      plannerState.isSyncing = false;
      updateSyncPillUi();
      renderPlanner();
      window.GolfWeerApp?.refreshSingleCourse?.();
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

      applyRemoteState(data);
      plannerState.isSyncing = false;
      updateSyncPillUi();
      renderPlanner();
      window.GolfWeerApp?.refreshSingleCourse?.();
    } catch (err) {
      plannerState.isSyncing = false;
      updateSyncPillUi();
      showPlannerStatus(`Lokaal opgeslagen, maar Sheet-sync gaf een fout: ${err.message}`, 'error');
    }
  }

  function renderBookingLinksHtml(dateIso, overlapEndMins, variant = 'compact') {
    const app = window.GolfWeerApp;
    const courses = app?.getBookingCourses?.() || [];
    if (!courses.length) return '';

    const items = courses
      .map(c => app.getCourseBookingStatus(c, dateIso, overlapEndMins))
      .filter(Boolean);
    if (!items.length) return '';

    const primaryItems = items.filter(i => i.primary);
    const secondaryItems = items.filter(i => !i.primary);

    const renderModalItem = (item) => {
      const metaBits = [];
      if (item.isMember) metaBits.push('lid');
      if (item.weatherScore !== null) metaBits.push(`weer ${item.weatherScore}`);
      if (!item.isOpenNow) metaBits.push(item.openFromLabel);
      else if (item.guestNote) metaBits.push(item.guestNote);
      else if (item.advanceDays) metaBits.push(`nu open (${item.advanceDays}d)`);
      else metaBits.push(item.system);

      return `
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"
          title="${escapeHtml(item.rule)}"
          class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-[#e6e3db] bg-white hover:border-[#163828] transition text-[#18241e]">
          <div class="min-w-0">
            <div class="text-xs font-medium truncate">${escapeHtml(item.shortName)}</div>
            <div class="text-[10px] ${!item.isOpenNow || item.guestNote ? 'text-[#755c2e]' : item.isMember ? 'text-[#1b5e3d]' : 'text-[#66706a]'} truncate">${escapeHtml(metaBits.join(' · '))}</div>
          </div>
          <span class="text-xs text-[#1b3a2d] shrink-0" aria-hidden="true">&nearr;</span>
        </a>
      `;
    };

    if (variant === 'modal') {
      return `
        <div class="text-[11px] font-medium text-[#535d57]">Check vrije starttijden</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          ${primaryItems.map(renderModalItem).join('')}
        </div>
        ${secondaryItems.length ? `
          <details class="pt-1">
            <summary class="text-[11px] font-medium text-[#535d57] hover:text-[#18241e] cursor-pointer select-none">
              Overige banen (${secondaryItems.length})
            </summary>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
              ${secondaryItems.map(renderModalItem).join('')}
            </div>
          </details>
        ` : ''}
      `;
    }

    const renderCompactPill = (item) => {
      const suffixBits = [];
      if (item.isMember) suffixBits.push('lid');
      if (item.weatherScore !== null) suffixBits.push(String(item.weatherScore));
      if (!item.isOpenNow) suffixBits.push(item.openFromLabel);
      else if (item.guestNote) suffixBits.push(item.guestNote);
      const suffix = suffixBits.length ? ` · ${suffixBits.join(', ')}` : '';
      return `
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"
          title="${escapeHtml(item.rule)}"
          class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border text-[10px] font-medium transition ${
            !item.isOpenNow
              ? 'bg-[#f6f5f0] border-[#e6e3db] text-[#66706a] hover:border-[#8c867b]'
              : item.isMember
                ? 'bg-[#f1f6f3] border-[#c7dcd0] text-[#1b4332] hover:border-[#163828]'
                : 'bg-[#faf9f5] border-[#d6cfc0] text-[#1b3a2d] hover:border-[#163828] hover:bg-[#f1f6f3]'
          }">
          <span>${escapeHtml(item.shortName)}</span>${suffix ? `<span class="font-mono-score opacity-80">${escapeHtml(suffix)}</span>` : ''}<span aria-hidden="true">↗</span>
        </a>
      `;
    };

    // Compacte snelkoppelingen onderaan een GO/GOGOGO kaart (4 thuisbanen + uitklapbaar voor overige 5)
    return `
      <div class="pt-2 border-t border-[#efede6] space-y-1.5">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-[10px] font-medium text-[#66706a] mr-0.5">Boek:</span>
          ${primaryItems.map(renderCompactPill).join('')}
        </div>
        ${secondaryItems.length ? `
          <details class="text-[10px]">
            <summary class="text-[#66706a] hover:text-[#18241e] cursor-pointer select-none inline-block">
              + Overige banen (${secondaryItems.length})
            </summary>
            <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
              ${secondaryItems.map(renderCompactPill).join('')}
            </div>
          </details>
        ` : ''}
      </div>
    `;
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
      hintEl.textContent = `${course.name} · ${holes} holes`;
    }

    // 1. Eerlijke Booker-rotatie teller
    const creditsBar = el('bookerCreditsBar');
    if (creditsBar) {
      const minCredits = Math.min(finalCredits.tom, finalCredits.jeff, finalCredits.ed);
      creditsBar.innerHTML = `<span class="text-[#66706a] mr-1">Beurt:</span>` + MEMBERS.map(m => {
        const count = finalCredits[m.key] || 0;
        const isNext = count === minCredits;
        return `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${
            isNext
              ? 'bg-white text-[#18241e] border-[#163828] font-semibold'
              : 'bg-[#f6f5f0] text-[#535d57] border-[#e6e3db] font-medium'
          }">
            <span>${m.name}</span>
            <span class="font-mono-score text-[11px] ${isNext ? 'text-[#163828]' : 'text-[#66706a]'}">${count}&times;</span>
          </span>
        `;
      }).join('');
    }

    // 2. Actieve speler knoppen bijwerken
    const picker = el('activeMemberPicker');
    if (picker) {
      picker.querySelectorAll('button[data-member]').forEach(btn => {
        const active = btn.dataset.member === plannerState.activeMember;
        btn.className = 'seg-btn';
        btn.setAttribute('aria-pressed', String(active));
      });
    }

    // 3. Komende Mogelijkheden / Kansrijke Tee Times
    const highlightsEl = el('plannerHighlights');
    if (highlightsEl) {
      const highlights = rows.filter(r => r.confirmed || (r.potentieel && r.hasOverlap)).slice(0, 6);
      if (highlights.length === 0) {
        highlightsEl.classList.add('hidden');
        highlightsEl.innerHTML = '';
      } else {
        highlightsEl.classList.remove('hidden');
        highlightsEl.innerHTML = `
          <div class="flex items-center justify-between px-1">
            <h3 class="text-xs font-medium text-[#535d57]">Komende opties · <span class="font-mono-score">${highlights.length}</span></h3>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            ${highlights.map(r => {
              const statusBadge = r.confirmed
                ? `<span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#163828] text-white font-mono-score">Bevestigd ${escapeHtml(r.confirmed)}</span>`
                : r.potentieel === 'GOGOGO'
                  ? `<span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#1b5e3d] text-white">GOGOGO</span>`
                  : `<span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f9f3e3] text-[#6d5120] border border-[#dec68e]">GO</span>`;

              const playersText = r.availMembers.map(m => m.shortName + (r.parsed[m.key].maybe ? '?' : '')).join(' · ');
              const metaParts = [];
              if (r.bookerMember) metaParts.push(`Booker: ${escapeHtml(r.bookerMember.shortName)}`);
              if (r.weatherDay && r.weatherOverlap?.possible) {
                metaParts.push(`Weer ${r.weatherOverlap.score} · ${escapeHtml(r.weatherOverlap.label)}`);
              } else if (r.weatherOverlap && !r.weatherOverlap.possible) {
                metaParts.push(escapeHtml(r.weatherOverlap.reason));
              }
              if (r.note) metaParts.push(escapeHtml(r.note));

              const bookingLinksHtml = renderBookingLinksHtml(
                r.dateIso,
                r.hasOverlap ? r.overlapEnd : null,
                'compact'
              );

              return `
                <div class="rounded-xl p-3.5 bg-white border border-[#e6e3db] hover:border-[#163828]/50 transition flex flex-col justify-between gap-2.5 ${r.confirmed ? 'border-l-[3px] border-l-[#163828]' : 'border-l-[3px] border-l-[#b89652]'}">
                  <button type="button" data-focus-date="${r.dateIso}" class="text-left space-y-1.5 w-full cursor-pointer">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-serif-club font-semibold text-sm text-[#18241e]">${r.dateMeta.displayDay} ${r.dateMeta.dateShort}</span>
                      ${statusBadge}
                    </div>
                    <div class="text-xs text-[#535d57]">
                      <span class="font-mono-score font-medium text-[#18241e]">${escapeHtml(r.overlapText)}</span>
                      <span class="text-[#cfc9bc] mx-1" aria-hidden="true">·</span>
                      <span>${escapeHtml(playersText)}</span>
                    </div>
                    ${metaParts.length ? `<div class="text-[11px] text-[#66706a] truncate">${metaParts.join(' · ')}</div>` : ''}
                  </button>
                  ${bookingLinksHtml}
                </div>
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
              setTimeout(() => tr.classList.remove('pulse-gold'), 1200);
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
          <td colspan="8" class="p-6 text-center text-[#66706a]">
            Geen dagen gevonden voor dit filter. Kies <strong>Alle dagen</strong> om de planning te zien.
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
            class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-mono-score font-medium hover:opacity-85 transition"
            style="${bm.tintStyle}">
            <span>${r.weatherDay.score}</span>
            <span aria-hidden="true">·</span>
            <span>${r.weatherDay.temp}°</span>
          </button>
        `;
      }

      // 3 speler-cellen
      const memberCells = MEMBERS.map(m => {
        const p = r.parsed[m.key];
        const isActive = plannerState.activeMember === m.key;
        const label = p.displayLabel ? escapeHtml(p.displayLabel) : '+';
        const ariaLabel = `${m.name} op ${r.dateMeta.weekdayLong} ${r.dateMeta.dateShort}: ${p.summary}, klik om te bewerken`;
        return `
          <td>
            <button type="button"
              data-edit-member="${m.key}"
              data-edit-date="${r.dateIso}"
              aria-label="${escapeHtml(ariaLabel)}"
              class="avail-cell-btn ${p.cssClass} ${isActive ? 'avail-active-member' : ''}">
              <span class="block truncate ${!p.displayLabel ? 'text-center' : ''}">${label}</span>
            </button>
          </td>
        `;
      }).join('');

      // Potentieel badge (kolom Status)
      let potHtml = `<span class="text-[#918b80] font-mono-score">—</span>`;
      if (r.potentieel === 'GOGOGO') {
        potHtml = `
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1b5e3d] text-white">
            GOGOGO
          </span>
          ${r.hasMaybe ? '<div class="text-[10px] text-[#2a4354] mt-0.5">o.v.b.</div>' : ''}
        `;
      } else if (r.potentieel === 'GO') {
        potHtml = `
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#f9f3e3] text-[#6d5120] border border-[#dec68e]">
            GO
          </span>
          ${r.hasMaybe ? '<div class="text-[10px] text-[#2a4354] mt-0.5">o.v.b.</div>' : ''}
        `;
      } else if (r.drMembers.length >= 2) {
        potHtml = `
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f6f4f8] text-[#4a3761] border border-[#d9d0e3]">
            DR (${r.drMembers.length})
          </span>
        `;
      }

      // Tee time & Weer cel
      let teeParts = [];
      if (r.overlapText) {
        const isNoOverlap = !r.hasOverlap;
        teeParts.push(`
          <div class="font-mono-score text-xs font-medium ${isNoOverlap ? 'text-[#72363a]' : 'text-[#18241e]'}">
            ${escapeHtml(r.overlapText)}
          </div>
        `);
        if (r.partialPairTip) {
          teeParts.push(`<div class="text-[11px] text-[#755c2e]">${escapeHtml(r.partialPairTip)}</div>`);
        }
        if (r.shortWindowWarning) {
          teeParts.push(`<div class="text-[11px] text-[#755c2e]">Kort venster (&lt; ${r.holes === 18 ? '4' : '2'}u)</div>`);
        }
        if (r.weatherOverlap && r.weatherOverlap.possible && scoreMetaFn) {
          teeParts.push(`
            <div class="text-[11px] text-[#163828] font-medium">
              ${escapeHtml(r.weatherOverlap.label)} · <span class="font-mono-score">${r.weatherOverlap.score}</span>
            </div>
          `);
        } else if (r.weatherOverlap && !r.weatherOverlap.possible) {
          teeParts.push(`<div class="text-[11px] text-[#66706a]">${escapeHtml(r.weatherOverlap.reason)}</div>`);
        }
      } else if (r.singleAvailNote) {
        teeParts.push(`<div class="text-[11px] text-[#66706a]">${escapeHtml(r.singleAvailNote)}</div>`);
      }
      if (r.drNote) {
        teeParts.push(`<div class="text-[11px] text-[#4a3761]">${escapeHtml(r.drNote)}</div>`);
      }

      const teeHtml = teeParts.length > 0
        ? `<div class="space-y-0.5">${teeParts.join('')}</div>`
        : `<span class="text-[#918b80]">—</span>`;

      // Booker cel (klikbaar om handmatig aan te passen of opnieuw te loten)
      const bookerAria = r.bookerMember
        ? `Booker op ${r.dateMeta.weekdayLong} ${r.dateMeta.dateShort}: ${r.bookerMember.name} (${r.bookerManual ? 'handmatig gekozen' : 'eerlijk geloot'}), klik om te wijzigen`
        : '';
      const bookerHtml = r.bookerMember
        ? `
          <button type="button"
            data-edit-booker="${r.dateIso}"
            aria-label="${escapeHtml(bookerAria)}"
            class="avail-cell-btn bg-[#faf9f5] border-[#e6e3db] hover:border-[#163828] text-[#18241e] font-medium whitespace-nowrap flex items-center justify-between gap-1.5">
            <span class="truncate">${escapeHtml(r.bookerMember.name)}</span>
            <span class="text-[10px] text-[#66706a] shrink-0" aria-hidden="true">${r.bookerManual ? '✎' : '🎲'}</span>
          </button>
        `
        : `<span class="text-[#918b80]">—</span>`;

      // Confirmed cel
      const suggestedTee = r.weatherOverlap?.possible
        ? r.weatherOverlap.bestStartStr
        : (r.hasOverlap && r.overlapStart !== null ? minsToHHMM(r.overlapStart) : '');
      const confirmAria = `Bevestigde starttijd en notitie voor ${r.dateMeta.weekdayLong} ${r.dateMeta.dateShort}: ${r.confirmed || 'niet bevestigd'}`;
      const confirmHtml = `
        <button type="button"
          data-edit-confirm="${r.dateIso}"
          data-suggested-tee="${escapeHtml(suggestedTee)}"
          aria-label="${escapeHtml(confirmAria)}"
          class="avail-cell-btn ${r.confirmed ? 'bg-[#163828] text-white font-medium' : 'avail-empty'}">
          ${r.confirmed
            ? `<span class="font-mono-score block">✓ ${escapeHtml(r.confirmed)}</span>`
            : `<span class="block text-[11px] ${!r.potentieel ? 'text-center' : ''}">${r.potentieel ? 'Bevestig' : '+'}</span>`}
          ${r.note ? `<span class="block text-[10px] ${r.confirmed ? 'text-[#d3e2d9]' : 'text-[#535d57]'} truncate mt-0.5">${escapeHtml(r.note)}</span>` : ''}
        </button>
      `;

      return `
        <tr data-planner-date="${r.dateIso}" class="${rowClasses}">
          <th scope="row">
            <div class="flex items-baseline justify-between gap-1.5">
              <div>
                <div class="text-xs font-semibold text-[#18241e]">${r.dateMeta.displayDay}</div>
                <div class="text-[11px] text-[#66706a] font-normal">${r.dateMeta.dateShort}</div>
              </div>
              ${r.dateMeta.isToday ? '<span class="text-[10px] font-medium text-[#755c2e]">Nu</span>' : ''}
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

    tbody.querySelectorAll('button[data-edit-booker]').forEach(btn => {
      btn.addEventListener('click', () => {
        openAvailEditor({
          mode: 'booker',
          dateIso: btn.dataset.editBooker
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

  function renderBookerModalOptions() {
    const ctx = plannerState.editorContext;
    const container = el('bookerMemberOptions');
    const explainEl = el('bookerModalExplain');
    const badgeEl = el('bookerModeBadge');
    const rerollBtn = el('btnRerollBooker');
    if (!ctx || ctx.mode !== 'booker' || !container) return;

    const candidates = ctx.candidates || [];
    const fairPool = ctx.fairPool || [];
    const credits = ctx.creditsBeforeDay || {};
    const selectedKey = ctx.selectedBookerKey || '';
    const isManual = Boolean(ctx.selectedBookerManual);

    if (explainEl) {
      const fairNames = fairPool.map(m => m.name).join(' & ');
      explainEl.textContent = fairPool.length > 1
        ? `Gelijke stand bij de aanwezigen (${fairNames}). De booker wordt willekeurig uit hen geloot en vastgelegd, of kies hieronder zelf een aanwezige speler.`
        : `Op basis van de eerdere boekingen is ${fairNames || 'deze speler'} aan de beurt. Je kunt de booker hieronder handmatig wijzigen naar een andere aanwezige speler.`;
    }

    if (badgeEl) {
      badgeEl.textContent = isManual ? 'Handmatig gekozen' : 'Eerlijk & random geloot';
    }

    if (rerollBtn) {
      rerollBtn.disabled = fairPool.length === 0;
    }

    container.innerHTML = MEMBERS.map(m => {
      const isPresent = candidates.some(c => c.key === m.key);
      const isSelected = m.key === selectedKey;
      const isFair = fairPool.some(c => c.key === m.key);
      const cCount = credits[m.key] || 0;

      if (!isPresent) {
        return `
          <button type="button" disabled
            class="px-2.5 py-2.5 rounded-lg border border-[#e6e3db] bg-[#f6f5f0] text-[#918b80] text-center opacity-65 cursor-not-allowed">
            <div class="font-medium text-xs">${escapeHtml(m.name)}</div>
            <div class="text-[10px] mt-0.5">Niet aanwezig</div>
          </button>
        `;
      }

      return `
        <button type="button" data-pick-booker="${m.key}" aria-pressed="${String(isSelected)}"
          class="px-2.5 py-2.5 rounded-lg border text-center transition cursor-pointer ${
            isSelected
              ? 'bg-[#163828] text-white border-[#163828] font-semibold'
              : 'bg-white text-[#18241e] border-[#d6cfc0] hover:border-[#163828]'
          }">
          <div class="text-xs">${escapeHtml(m.name)}</div>
          <div class="font-mono-score text-[10px] mt-0.5 ${isSelected ? 'text-[#d3e2d9]' : 'text-[#66706a]'}">
            ${cCount}&times; geboekt${isFair ? ' · aan de beurt' : ''}
          </div>
        </button>
      `;
    }).join('');

    container.querySelectorAll('button[data-pick-booker]').forEach(btn => {
      btn.addEventListener('click', () => {
        ctx.selectedBookerKey = btn.dataset.pickBooker;
        ctx.selectedBookerManual = true;
        renderBookerModalOptions();
      });
    });
  }

  function openAvailEditor(ctx) {
    const dialog = el('availEditorDialog');
    if (!dialog) return;

    plannerState.editorContext = ctx;
    plannerState.activeTimeMode = null;

    const todayIso = getAmsterdamTodayIso();
    const dateMeta = formatDateMeta(ctx.dateIso, todayIso);
    const existing = plannerState.rowsByDate[ctx.dateIso] || { tom: '', jeff: '', ed: '', booker: '', bookerManual: false, confirmed: '', note: '' };

    const memberFields = el('availMemberFields');
    const confirmFields = el('availConfirmFields');
    const bookerFields = el('availBookerFields');
    const titleEl = el('availEditorTitle');
    const subEl = el('availEditorSubtitle');

    memberFields?.classList.add('hidden');
    confirmFields?.classList.add('hidden');
    bookerFields?.classList.add('hidden');

    if (ctx.mode === 'member') {
      const member = MEMBERS.find(m => m.key === ctx.memberKey);
      if (titleEl) titleEl.textContent = `${member ? member.name : ''} — Beschikbaarheid`;
      if (subEl) subEl.textContent = `${dateMeta.weekdayLong} ${dateMeta.dateShort} (${ctx.dateIso})`;
      memberFields?.classList.remove('hidden');
      el('timeBuilderInputs')?.classList.add('hidden');

      const input = el('availRawInput');
      if (input) {
        input.value = existing[ctx.memberKey] || '';
      }
      updateRawParsePreview();
    } else if (ctx.mode === 'booker') {
      const schedule = buildComputedSchedule();
      const row = schedule.rows.find(r => r.dateIso === ctx.dateIso);
      const candidates = row
        ? ((row.potentieel && row.hasOverlap) ? row.availMembers : row.allAvailMembers)
        : [];
      ctx.candidates = candidates;
      ctx.fairPool = row ? row.bookerFairPool : [];
      ctx.creditsBeforeDay = row ? row.creditsBeforeDay : {};
      ctx.selectedBookerKey = row?.bookerMember?.key || '';
      ctx.selectedBookerManual = Boolean(row?.bookerManual);

      if (titleEl) titleEl.textContent = 'Booker kiezen of loten';
      if (subEl) subEl.textContent = `${dateMeta.weekdayLong} ${dateMeta.dateShort} (${ctx.dateIso})`;
      bookerFields?.classList.remove('hidden');
      renderBookerModalOptions();
    } else {
      if (titleEl) titleEl.textContent = 'Bevestigde Tee Time & Notitie';
      if (subEl) subEl.textContent = `${dateMeta.weekdayLong} ${dateMeta.dateShort} (${ctx.dateIso})`;
      confirmFields?.classList.remove('hidden');

      const confirmInput = el('confirmTimeInput');
      const noteInput = el('confirmNoteInput');
      const suggestBtn = el('btnUseSuggestedTee');
      const bookerHint = el('confirmBookerHint');
      const bookingLinksEl = el('confirmBookingLinks');

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

      const schedule = buildComputedSchedule();
      const row = schedule.rows.find(r => r.dateIso === ctx.dateIso);

      if (bookingLinksEl) {
        const html = renderBookingLinksHtml(ctx.dateIso, row?.hasOverlap ? row.overlapEnd : null, 'modal');
        if (html) {
          bookingLinksEl.innerHTML = html;
          bookingLinksEl.classList.remove('hidden');
        } else {
          bookingLinksEl.classList.add('hidden');
        }
      }

      if (bookerHint) {
        bookerHint.textContent = row && row.bookerMember
          ? `Booker: ${row.bookerMember.name} (${row.bookerManual ? 'handmatig gekozen' : 'eerlijk & willekeurig geloot'}) — telt +1 bij bevestiging.`
          : 'Vul een bevestigde starttijd in zodra de tee time geboekt is.';
      }
    }

    dialog.showModal();
    if (ctx.mode === 'confirm') {
      el('confirmTimeInput')?.focus();
    } else if (ctx.mode === 'booker') {
      el('bookerMemberOptions')?.querySelector('button:not([disabled])')?.focus();
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
    const shareConnectBtn = el('btnCopyShareConnectLink');
    if (urlInput) urlInput.value = plannerState.sheetUrl || '';
    if (preview) preview.textContent = APPS_SCRIPT_CODE;
    if (statusBox) statusBox.classList.add('hidden');
    if (shareConnectBtn) {
      shareConnectBtn.classList.toggle('hidden', !plannerState.sheetUrl);
    }
    dialog.showModal();
  }

  function showSyncModalMessage(msg, tone = 'info') {
    const box = el('sheetSyncModalStatus');
    if (!box) return;
    const tones = {
      success: 'bg-[#f1f6f3] text-[#1b4332] border-[#c7dcd0]',
      info: 'bg-[#faf7ef] text-[#5c4518] border-[#e3d6b8]',
      error: 'bg-[#faf4f4] text-[#592629] border-[#dfc5c7]'
    };
    box.className = `rounded-lg px-3 py-2 text-xs font-medium border ${tones[tone] || tones.info}`;
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
        window.GolfWeerApp?.refreshSingleCourse?.();
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
        el('btnCopyShareConnectLink')?.classList.remove('hidden');
        showSyncModalMessage('Gekoppeld! Alle wijzigingen synchroniseren nu live met tabblad "Huidig". Gebruik eventueel de koppel-link hieronder voor Tom & Ed.', 'success');
      } else {
        showSyncModalMessage('Verbinding mislukt. Controleer of de Web-app is gedeployed met toegang "Iedereen".', 'error');
      }
    });

    el('btnCopyShareConnectLink')?.addEventListener('click', async () => {
      if (!plannerState.sheetUrl) return;
      const base = window.location.origin && window.location.origin !== 'null'
        ? window.location.origin + window.location.pathname
        : window.location.href.split(/[?#]/)[0];
      const shareUrl = `${base}#sheet=${encodeURIComponent(plannerState.sheetUrl)}`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          showSyncModalMessage('Directe koppel-link gekopieerd! Als Tom of Ed deze link opent, is hun browser meteen gekoppeld aan de Google Sheet.', 'success');
          return;
        }
      } catch (e) {}
      const ok = window.GolfWeerApp?.copyTextFallback?.(shareUrl);
      showSyncModalMessage(ok ? 'Directe koppel-link gekopieerd!' : 'Kon link niet automatisch kopiëren.', ok ? 'success' : 'error');
    });

    el('btnDisconnectSheet')?.addEventListener('click', () => {
      plannerState.sheetUrl = '';
      plannerState.lastSyncedAt = '';
      saveLocalData();
      updateSyncPillUi();
      if (el('sheetWebAppUrl')) el('sheetWebAppUrl').value = '';
      el('btnCopyShareConnectLink')?.classList.add('hidden');
      showSyncModalMessage('Google Sheet-koppeling verbroken. De planner werkt nu lokaal in je browser.', 'info');
    });

    el('btnResetSeedData')?.addEventListener('click', () => {
      plannerState.rowsByDate = JSON.parse(JSON.stringify(SEED_SHEET_ROWS));
      plannerState.baseCredits = { ...DEFAULT_BASE_CREDITS };
      saveLocalData();
      renderPlanner();
      window.GolfWeerApp?.refreshSingleCourse?.();
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

    el('btnRerollBooker')?.addEventListener('click', () => {
      const ctx = plannerState.editorContext;
      if (!ctx || ctx.mode !== 'booker') return;
      const pool = ctx.fairPool || [];
      if (pool.length === 0) return;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      ctx.selectedBookerKey = picked.key;
      ctx.selectedBookerManual = false;
      renderBookerModalOptions();
    });

    // Opslaan vanuit editor dialog
    el('availEditorForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const ctx = plannerState.editorContext;
      if (!ctx) return;

      const current = plannerState.rowsByDate[ctx.dateIso] || { tom: '', jeff: '', ed: '', booker: '', bookerManual: false, confirmed: '', note: '' };

      if (ctx.mode === 'member') {
        const prevBooker = normalizeBookerKey(current.booker);
        const val = (el('availRawInput')?.value || '').trim();
        current[ctx.memberKey] = val;
        plannerState.rowsByDate[ctx.dateIso] = current;
        saveLocalData();
        el('availEditorDialog')?.close();
        renderPlanner();
        window.GolfWeerApp?.refreshSingleCourse?.();

        const updatedBooker = normalizeBookerKey(plannerState.rowsByDate[ctx.dateIso]?.booker);
        const m = MEMBERS.find(x => x.key === ctx.memberKey);
        showPlannerStatus(`${m ? m.name : ''} op ${ctx.dateIso} bijgewerkt${val ? `: "${val}"` : ' (leeggemaakt)'}.`, 'success');

        const payload = {
          action: 'upsertRow',
          date: ctx.dateIso,
          [ctx.memberKey]: val
        };
        if (updatedBooker !== prevBooker) {
          payload.booker = memberNameByKey(updatedBooker);
        }
        pushUpdateToGoogleSheet(payload);
      } else if (ctx.mode === 'booker') {
        const chosenKey = normalizeBookerKey(ctx.selectedBookerKey);
        if (!chosenKey) return;
        current.booker = chosenKey;
        current.bookerManual = Boolean(ctx.selectedBookerManual);
        plannerState.rowsByDate[ctx.dateIso] = current;
        saveLocalData();
        el('availEditorDialog')?.close();
        renderPlanner();
        window.GolfWeerApp?.refreshSingleCourse?.();

        const chosenName = memberNameByKey(chosenKey);
        showPlannerStatus(
          `Booker op ${ctx.dateIso} vastgelegd op ${chosenName}${current.bookerManual ? ' (handmatig)' : ' (eerlijk geloot)'}.`,
          'success'
        );

        pushUpdateToGoogleSheet({
          action: 'updateCell',
          date: ctx.dateIso,
          field: 'booker',
          value: chosenName
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
        window.GolfWeerApp?.refreshSingleCourse?.();

        showPlannerStatus(
          confirmedVal ? `Tee time op ${ctx.dateIso} bevestigd om ${confirmedVal}!` : `Notitie voor ${ctx.dateIso} bijgewerkt.`,
          'success'
        );

        const lockedBooker = normalizeBookerKey(plannerState.rowsByDate[ctx.dateIso]?.booker);
        const payload = {
          action: 'upsertRow',
          date: ctx.dateIso,
          confirmed: confirmedVal,
          note: noteVal
        };
        if (confirmedVal && lockedBooker) {
          payload.booker = memberNameByKey(lockedBooker);
        }
        pushUpdateToGoogleSheet(payload);
      }
    });

    // Publieke hook voor app.js
    window.SwingersPlanner = {
      render: renderPlanner,
      getScheduleMapByDate() {
        const schedule = buildComputedSchedule();
        const byDate = {};
        schedule.rows.forEach(r => {
          byDate[r.dateIso] = r;
        });
        return {
          byDate,
          members: MEMBERS,
          activeMember: plannerState.activeMember
        };
      },
      openEditor(ctx) {
        openAvailEditor(ctx);
      },
      jumpToDate(dateIso) {
        if (plannerState.filter !== 'all') {
          plannerState.filter = 'all';
          const filterSelect = el('plannerFilterSelect');
          if (filterSelect) filterSelect.value = 'all';
        }
        window.GolfWeerApp?.setViewMode?.('planner', true);
        requestAnimationFrame(() => {
          const tr = document.querySelector(`tr[data-planner-date="${dateIso}"]`);
          if (tr) {
            tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
            tr.classList.add('pulse-gold');
            setTimeout(() => tr.classList.remove('pulse-gold'), 1400);
          }
        });
      },
      onWeatherOrSettingsUpdated() {
        renderPlanner();
        if (window.GolfWeerApp?.state?.viewMode === 'planner') {
          maybeAutoPullFromSheet();
        }
      }
    };

    // Automatisch koppelen wanneer iemand een gedeelde #sheet=... link opent
    const connectedFromUrl = importSheetUrlFromLocation();

    // Automatisch verversen wanneer je terugkeert naar dit browsertabblad
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        maybeAutoPullFromSheet();
      }
    });

    renderPlanner();
    window.GolfWeerApp?.refreshSingleCourse?.();
    if (plannerState.sheetUrl) {
      pullFromGoogleSheet(!connectedFromUrl);
      if (connectedFromUrl) {
        window.GolfWeerApp?.setViewMode?.('planner', true);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', initPlanner);
})();

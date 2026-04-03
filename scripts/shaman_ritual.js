/**
 * Shaman Communication Ritual + Attunement (dnd5e): post–long-rest prompt, ritual UI, spell cleanup & grants.
 * Does not patch or import the dnd5e system long-rest dialog.
 */
const MODULE_ID = "falcrests-machinations-of-madness";

const COMMUNICATION_TABLE_UUID =
  "Compendium.falcrests-machinations-of-madness.fmom-tables.RollTable.IZ3HqEVGkahHijNE";
const ATTUNEMENT_TABLE_UUID =
  "Compendium.falcrests-machinations-of-madness.fmom-tables.RollTable.xR1WacOCNocTsB6G";

/** Shaman class (fmom-classes); `system.sourceItem` on ritual spells uses `class:<identifier>` from this definition. */
const SHAMAN_CLASS_COMPENDIUM_UUID =
  "Compendium.falcrests-machinations-of-madness.fmom-classes.Item.S0y9DnvEzFLo4AsO";

/**
 * @type {{ id: string, label: string, spell: string|null, d4: number }[]}
 */
const ATTUNEMENT_MOODS = [
  { id: "peaceful", label: "Peaceful", spell: "Healing Word", d4: 1 },
  { id: "aggressive", label: "Aggressive", spell: "Guiding Bolt", d4: 2 },
  { id: "chaotic", label: "Chaotic", spell: null, d4: 3 },
  { id: "sorrowful", label: "Sorrowful", spell: "Bane", d4: 4 }
];

const ATTUNEMENT_MOOD_BY_ID = Object.fromEntries(ATTUNEMENT_MOODS.map((m) => [m.id, m]));
const ATTUNEMENT_BRACKET_LABELS = new Set(ATTUNEMENT_MOODS.map((m) => m.label));
ATTUNEMENT_BRACKET_LABELS.add("Attunement");

/** @type {RegExp}
 * Prepared mood spell phrase (UUID link in feature/table text). */
const ATTUNEMENT_PREPARED_SPELL_RE =
  /additionally,?\s+you have the spell\s+@UUID\[([^\]]+)\]\{[^}]*\}\s+prepared(?:\s+for this period)?/i;
/** @type {RegExp}
 * Once-per-period spell phrase. */
const ATTUNEMENT_ONCE_SPELL_RE =
  /you can cast\s+@UUID\[([^\]]+)\]\{[^}]*\}\s+once(?:\s+during this period)?/i;

const PHB_SPELL = "Compendium.dnd-players-handbook.spells.Item";

/** @type {{ id: string, label: string, spells: string[] }[]} */
const SPIRITS = [
  {
    id: "whisperer",
    label: "Whisperer",
    spells: [
      `${PHB_SPELL}.phbsplIdentify00`,
      `${PHB_SPELL}.phbsplAugury0000`,
      `${PHB_SPELL}.phbsplClairvoyan`,
      `${PHB_SPELL}.phbsplDivination`,
      `${PHB_SPELL}.phbsplLegendLore`
    ]
  },
  {
    id: "ashen",
    label: "Ashen",
    spells: [
      `${PHB_SPELL}.phbsplBurningHan`,
      `${PHB_SPELL}.phbsplScorchingR`,
      `${PHB_SPELL}.phbsplFireball00`,
      `${PHB_SPELL}.phbsplWallofFire`,
      `${PHB_SPELL}.phbsplFlameStrik`
    ]
  },
  {
    id: "frostbinder",
    label: "Frostbinder",
    spells: [
      `${PHB_SPELL}.phbsplArmorofAga`,
      `${PHB_SPELL}.phbsplHoldPerson`,
      `${PHB_SPELL}.phbsplCounterspe`,
      `${PHB_SPELL}.phbsplIceStorm00`,
      `${PHB_SPELL}.phbsplConeofCold`
    ]
  },
  {
    id: "gravekeeper",
    label: "Gravekeeper",
    spells: [
      `${PHB_SPELL}.phbsplRayofSickn`,
      `${PHB_SPELL}.phbsplMelfsAcidA`,
      `${PHB_SPELL}.phbsplBestowCurs`,
      `${PHB_SPELL}.phbsplBlight0000`,
      `${PHB_SPELL}.phbsplCloudkill0`
    ]
  },
  {
    id: "stormcaller",
    label: "Stormcaller",
    spells: [
      `${PHB_SPELL}.phbsplThunderwav`,
      `${PHB_SPELL}.phbsplMistyStep0`,
      `${PHB_SPELL}.phbsplCallLightn`,
      `${PHB_SPELL}.phbsplFreedomofM`,
      `${PHB_SPELL}.phbsplDestructiv`
    ]
  },
  {
    id: "hollow-one",
    label: "Hollow One",
    spells: [
      `${PHB_SPELL}.phbsplFogCloud00`,
      `${PHB_SPELL}.phbsplDarkness00`,
      `${PHB_SPELL}.phbsplFear000000`,
      `${PHB_SPELL}.phbsplGreaterInv`,
      `${PHB_SPELL}.phbsplWallofForc`
    ]
  },
  {
    id: "many-faced-one",
    label: "Many-Faced One",
    spells: [
      `${PHB_SPELL}.phbsplDisguiseSe`,
      `${PHB_SPELL}.phbsplDetectThou`,
      `${PHB_SPELL}.phbsplMajorImage`,
      `${PHB_SPELL}.phbsplHallucinat`,
      `${PHB_SPELL}.phbsplMislead000`
    ]
  },
  {
    id: "beastmother",
    label: "Beastmother",
    spells: [
      `${PHB_SPELL}.phbsplSpeakwithA`,
      `${PHB_SPELL}.phbsplBarkskin00`,
      `${PHB_SPELL}.phbsplConjureAni`,
      `${PHB_SPELL}.phbsplDominateBe`,
      `${PHB_SPELL}.phbsplTreeStride`
    ]
  },
  {
    id: "warden",
    label: "Warden",
    spells: [
      `${PHB_SPELL}.phbsplCureWounds`,
      `${PHB_SPELL}.phbsplLesserRest`,
      `${PHB_SPELL}.phbsplRevivify00`,
      `${PHB_SPELL}.phbsplAuraofLife`,
      `${PHB_SPELL}.phbsplMassCureWo`
    ]
  },
  {
    id: "dawnseeker",
    label: "Dawnseeker",
    spells: [
      `${PHB_SPELL}.phbsplBless00000`,
      `${PHB_SPELL}.phbsplSpiritualW`,
      `${PHB_SPELL}.phbsplDaylight00`,
      `${PHB_SPELL}.phbsplBanishment`,
      `${PHB_SPELL}.phbsplGreaterRes`
    ]
  }
];

const SPIRIT_BY_ID = Object.fromEntries(SPIRITS.map((s) => [s.id, s]));
const SPIRIT_BRACKET_LABELS = new Set(SPIRITS.map((s) => s.label));
/** Longest labels first so e.g. "Many-Faced One" wins over "One". */
const SPIRITS_BY_LABEL_LEN = [...SPIRITS].sort((a, b) => b.label.length - a.label.length);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * @param {Actor} actor
 * @returns {Item|null}
 */
function getShamanClassItem(actor) {
  if (!actor?.items) return null;
  const fromMap = actor.classes?.shaman;
  if (fromMap) return fromMap;
  for (const item of actor.items) {
    if (item.type !== "class") continue;
    const ident = item.identifier || foundry.utils.slugify(item.name ?? "");
    if (ident === "shaman") return item;
  }
  return null;
}

/**
 * @param {unknown} entry
 * @returns {number}
 */
function numericFromScaleEntry(entry) {
  if (entry == null) return 0;
  if (typeof entry === "number" && Number.isFinite(entry)) return Math.max(0, Math.floor(entry));
  if (typeof entry === "object") {
    const v = /** @type {{ value?: unknown, total?: unknown }} */ (entry).value;
    if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
    const t = /** @type {{ value?: unknown, total?: unknown }} */ (entry).total;
    if (typeof t === "number" && Number.isFinite(t)) return Math.max(0, Math.floor(t));
  }
  return 0;
}

/**
 * Highest leveled spell slot the actor currently has (>0 max). Honors half / full / Staff Bearer via prepared data.
 * @param {Actor} actor
 * @returns {number}
 */
function getMaxLeveledSpellSlot(actor) {
  let max = 0;
  for (let lvl = 1; lvl <= 9; lvl++) {
    const slot = actor.system?.spells?.[`spell${lvl}`];
    const m = Number(slot?.max ?? 0);
    if (Number.isFinite(m) && m > 0) max = lvl;
  }
  return max;
}

/**
 * @param {string} text
 * @returns {string|null}
 */
function spiritIdFromTableText(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const rollNum = Number.parseInt(trimmed, 10);
  if (rollNum >= 1 && rollNum <= SPIRITS.length) return SPIRITS[rollNum - 1].id;

  const lower = trimmed.toLowerCase();
  for (const s of SPIRITS_BY_LABEL_LEN) {
    if (lower.includes(s.label.toLowerCase())) return s.id;
    if (lower.includes(s.id.replace(/-/g, " "))) return s.id;
    if (lower.includes(s.id.replace(/-/g, ""))) return s.id;
  }
  return null;
}

const NAME_BRACKET_RE = /^(.+?)\s*\[([^\]]+)\]\s*$/;

/**
 * @param {Actor} actor
 * @returns {Item|null}
 */
function findActorAttunementRitualFeature(actor) {
  if (!actor?.items) return null;
  const exact = /^\s*attunement\s+ritual\s*$/i;
  for (const item of actor.items) {
    if (item.type !== "feat" && item.type !== "feature") continue;
    if (exact.test(String(item.name ?? "").trim())) return item;
  }
  for (const item of actor.items) {
    if (item.type !== "feat" && item.type !== "feature") continue;
    const n = String(item.name ?? "");
    if (/attunement/i.test(n) && /ritual/i.test(n)) return item;
  }
  return null;
}

/**
 * @param {ActiveEffect} effect
 * @param {Item|null} attunementFeature feat on the same actor
 * @param {Actor} actor
 * @returns {boolean}
 */
function effectOriginReferencesAttunementFeature(effect, attunementFeature, actor) {
  if (!attunementFeature?.id) return false;
  const o = String(effect.origin ?? "");
  if (!o) return false;
  const fu = String(attunementFeature.uuid ?? "");
  if (fu && (o === fu || o.startsWith(`${fu}.`))) return true;
  if (!o.includes(`.Item.${attunementFeature.id}`)) return false;
  if (actor?.id && !o.includes(actor.id)) return false;
  return true;
}

/**
 * @param {ActiveEffect} effect
 * @param {Item|null} attunementFeature
 * @param {Actor} actor
 * @returns {boolean}
 */
function actorEffectIsFromAttunementRitual(effect, attunementFeature, actor) {
  if (effect.getFlag(MODULE_ID, "attunementEffect")) return true;
  if (attunementFeature) return effectOriginReferencesAttunementFeature(effect, attunementFeature, actor);
  return false;
}

/**
 * Remove every ActiveEffect on the actor granted from this ritual (module flag or origin on the Attunement Ritual feature item).
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function removeAllAttunementRitualEffects(actor) {
  const feature = findActorAttunementRitualFeature(actor);
  const ids = actor.effects
    .filter((e) => actorEffectIsFromAttunementRitual(e, feature, actor))
    .map((e) => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

/**
 * Remove every prior attunement-mood spell ([Peaceful], [Sorrowful], legacy [Attunement], etc.).
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function deleteAttunementBracketSpells(actor) {
  const toDelete = [];
  for (const item of actor.items) {
    if (item.type !== "spell") continue;
    if (item.getFlag(MODULE_ID, "attunementMoodSpell")) {
      toDelete.push(item.id);
      continue;
    }
    const m = item.name?.match(NAME_BRACKET_RE);
    if (!m) continue;
    const inner = m[2].trim();
    if (ATTUNEMENT_BRACKET_LABELS.has(inner)) toDelete.push(item.id);
  }
  if (toDelete.length) await actor.deleteEmbeddedDocuments("Item", toDelete);
}

/**
 * Normalize effect names for comparison (braille padding, spacing).
 * @param {string} name
 * @returns {string}
 */
function attunementEffectNameKey(name) {
  return String(name ?? "")
    .replace(/\u2800/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * @param {Item} feature
 * @param {string} behaviourName
 * @returns {ActiveEffect|undefined}
 */
function findAttunementFeatureEffectByBehaviourName(feature, behaviourName) {
  const key = attunementEffectNameKey(behaviourName);
  return [...(feature.effects ?? [])].find((e) => attunementEffectNameKey(e.name) === key);
}

/**
 * New ActiveEffect embedded on the Attunement Ritual item (editable, reused next rest). Starts disabled until attunement resolves.
 * @param {Item} feature
 * @param {Actor} actor
 * @param {string} name
 * @returns {object}
 */
function placeholderAttunementEffectOnFeature(feature, actor, name) {
  return {
    name,
    img: feature.img || actor.img || "icons/svg/aura.svg",
    transfer: false,
    disabled: true,
    duration: {},
    changes: []
  };
}

/**
 * Disable every ActiveEffect embedded on the actor's Attunement Ritual feature (ritual start).
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function disableAllAttunementFeatureEmbeddedEffects(actor) {
  const feature = findActorAttunementRitualFeature(actor);
  if (!feature?.effects?.size) return;
  const updates = [...feature.effects].map((e) => ({ _id: e.id, disabled: true }));
  await feature.updateEmbeddedDocuments("ActiveEffect", updates);
}

/**
 * @param {Actor} actor
 * @returns {Item|null}
 */
function attunementFeatureFromActor(actor) {
  const f = findActorAttunementRitualFeature(actor);
  if (!f?.id) return null;
  return actor.items.get(f.id) ?? f;
}

/**
 * Remove duplicate embedded effects on the feat that share the same normalized name (keep the first).
 * @param {Item} feature
 * @param {string} behaviourName
 * @returns {Promise<Item|null>}
 */
async function dedupeAttunementFeatureEffectsNamed(feature, behaviourName) {
  const key = attunementEffectNameKey(behaviourName);
  const same = [...(feature.effects ?? [])].filter((e) => attunementEffectNameKey(e.name) === key);
  if (same.length <= 1) return feature;
  const removeIds = same.slice(1).map((e) => e.id);
  await feature.deleteEmbeddedDocuments("ActiveEffect", removeIds);
  const actor = feature.parent;
  return actor?.items?.get(feature.id) ?? feature;
}

/**
 * Strip prior module-cloned attunement effects from the actor (legacy); only toggle embedded effects on the Attunement Ritual feature — dnd5e applies those to the sheet once.
 * @param {Actor} actor
 * @param {string} behaviourEffectName e.g. Peaceful, Melinara's Dominance (from table / outcome)
 * @returns {Promise<void>}
 */
async function applyAttunementRitualEffectByBehaviourName(actor, behaviourEffectName) {
  await removeAllAttunementRitualEffects(actor);

  const want = String(behaviourEffectName ?? "").trim();
  if (!want) return;

  let feature = attunementFeatureFromActor(actor);
  if (!feature) {
    ui.notifications.warn("Attunement Ritual feature not found on this actor.");
    return;
  }

  feature = (await dedupeAttunementFeatureEffectsNamed(feature, want)) ?? feature;
  feature = attunementFeatureFromActor(actor) ?? feature;

  let match = findAttunementFeatureEffectByBehaviourName(feature, want);

  if (!match) {
    await feature.createEmbeddedDocuments("ActiveEffect", [
      placeholderAttunementEffectOnFeature(feature, actor, want)
    ]);
    feature = attunementFeatureFromActor(actor);
    if (!feature) return;
    match = findAttunementFeatureEffectByBehaviourName(feature, want);
  }

  if (!match) {
    ui.notifications.error("Attunement: could not create or find Active Effect on the Attunement Ritual feature.");
    return;
  }

  const disableUpdates = [...feature.effects].map((e) => ({
    _id: e.id,
    disabled: e.id !== match.id
  }));
  if (disableUpdates.length) await feature.updateEmbeddedDocuments("ActiveEffect", disableUpdates);
}

/**
 * @param {string} s
 * @returns {string}
 */
function normalizeAttunementText(s) {
  return String(s ?? "")
    .replace(/\u2800/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} html
 * @returns {string}
 */
function htmlToPlainForAttunement(html) {
  return normalizeAttunementText(String(html ?? "").replace(/<[^>]*>/g, "\n"));
}

/**
 * @param {string} text
 * @returns {string}
 */
function attunementTitleLineFromText(text) {
  const normalized = normalizeAttunementText(htmlToPlainForAttunement(text));
  const lines = normalized.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^\d+$/.test(line)) continue;
    if (/^when you\b/i.test(line)) continue;
    if (line.length < 2) continue;
    return line;
  }
  return "Attunement";
}

/**
 * @param {string} blob
 * @returns {string|null} peaceful | aggressive | chaotic | sorrowful
 */
function matchStandardEffectMoodId(blob) {
  const lower = normalizeAttunementText(blob).toLowerCase();
  if (lower.includes("peaceful")) return "peaceful";
  if (lower.includes("aggressive")) return "aggressive";
  if (lower.includes("chaotic")) return "chaotic";
  if (lower.includes("sorrowful")) return "sorrowful";
  return null;
}

/**
 * @param {TableResult} r
 * @returns {number}
 */
function tableResultRangeLow(r) {
  const range = r.range;
  if (Array.isArray(range) && range.length >= 1) {
    const lo = Number(range[0]);
    return Number.isFinite(lo) ? lo : 0;
  }
  if (range && typeof range === "object") {
    const lo = Number(/** @type {{ min?: unknown }} */ (range).min);
    return Number.isFinite(lo) ? lo : 0;
  }
  return 0;
}

/**
 * @param {RollTable|null} table
 * @param {number|null} rollTotal
 * @returns {string|null}
 */
function effectMoodFromDiceFallback(rollTotal, table) {
  if (!table?.results?.size) return null;
  if (table.results.size !== 4) return null;
  const d = Number(rollTotal);
  if (!Number.isFinite(d) || d < 1 || d > 4) return null;
  const sorted = [...table.results].sort((a, b) => tableResultRangeLow(a) - tableResultRangeLow(b));
  const r = sorted[d - 1];
  if (!r) return null;
  const plain = htmlToPlainForAttunement(r.text ?? "");
  const byKeyword = matchStandardEffectMoodId(plain);
  if (byKeyword) return byKeyword;
  const staticOrder = /** @type {const} */ (["peaceful", "aggressive", "chaotic", "sorrowful"]);
  return staticOrder[d - 1] ?? null;
}

/**
 * @param {string} blob
 * @param {number|null} rollTotal
 * @param {RollTable|null} table
 * @returns {string|null}
 */
function resolveAttunementEffectMoodId(blob, rollTotal, table) {
  const id = matchStandardEffectMoodId(blob);
  if (id) return id;
  return effectMoodFromDiceFallback(rollTotal, table);
}

/**
 * @param {string} html
 * @returns {string|null}
 */
function extractPreparedSpellUuid(html) {
  const m = String(html ?? "").match(ATTUNEMENT_PREPARED_SPELL_RE);
  return m?.[1]?.trim() ?? null;
}

/**
 * @param {string} html
 * @returns {string|null}
 */
function extractOnceSpellUuid(html) {
  const m = String(html ?? "").match(ATTUNEMENT_ONCE_SPELL_RE);
  return m?.[1]?.trim() ?? null;
}

/**
 * @typedef {{ bracketLabel: string, effectMoodId: string|null, preparedSpellUuid: string|null, onceSpellUuid: string|null }} AttunementOutcome
 */

/**
 * @param {string} resultHtml
 * @param {number|null} rollTotal
 * @param {RollTable|null} table
 * @returns {AttunementOutcome}
 */
function parseAttunementOutcomeFromResultText(resultHtml, rollTotal, table) {
  const plain = htmlToPlainForAttunement(resultHtml);
  const bracketLabel = attunementTitleLineFromText(resultHtml);
  const effectMoodId = resolveAttunementEffectMoodId(plain + "\n" + resultHtml, rollTotal, table);
  return {
    bracketLabel,
    effectMoodId,
    preparedSpellUuid: extractPreparedSpellUuid(resultHtml),
    onceSpellUuid: extractOnceSpellUuid(resultHtml)
  };
}

/**
 * Attunement Ritual item: behaviour column + effect column (spell phrases live in effect HTML).
 * @param {string} behaviourLabel plain text from 2nd column
 * @param {string} effectHtml HTML from 3rd column
 * @param {number|null} rollTotal
 * @returns {AttunementOutcome}
 */
function parseAttunementOutcomeFromHtmlRow(behaviourLabel, effectHtml, rollTotal) {
  const plain = htmlToPlainForAttunement(effectHtml);
  const effectMoodId = resolveAttunementEffectMoodId(
    `${plain}\n${behaviourLabel}`,
    rollTotal,
    null
  );
  return {
    bracketLabel: behaviourLabel,
    effectMoodId,
    preparedSpellUuid: extractPreparedSpellUuid(effectHtml),
    onceSpellUuid: extractOnceSpellUuid(effectHtml)
  };
}

/**
 * @param {string} cellPlain
 * @returns {{ low: number, high: number }|null}
 */
function parseAttunementRollColumnRange(cellPlain) {
  const t = normalizeAttunementText(cellPlain);
  const rangeMatch = t.match(/^(\d+)\s*[\u2013\u2014-]\s*(\d+)/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { low: Math.min(a, b), high: Math.max(a, b) };
    }
  }
  const numMatch = t.match(/^(\d+)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isFinite(n)) return { low: n, high: n };
  }
  return null;
}

/**
 * @param {HTMLTableRowElement} tr
 * @returns {HTMLTableCellElement[]}
 */
function attunementTableRowCells(tr) {
  return [...tr.querySelectorAll("td, th")];
}

/**
 * Parse the prose table in the Attunement Ritual feature description (Roll / Behaviour / Effect columns).
 * @param {string} html
 * @returns {{ rows: { rollLow: number, rollHigh: number, label: string, effectHtml: string }[], rollFormula: string, maxRoll: number }|null}
 */
function parseAttunementDescriptionTable(html) {
  if (!html || typeof html !== "string" || !html.includes("<table")) return null;
  let doc;
  try {
    doc = new DOMParser().parseFromString(`<div id="fmom-att-root">${html}</div>`, "text/html");
  } catch {
    return null;
  }
  const root = doc.getElementById("fmom-att-root");
  const table = root?.querySelector("table");
  if (!table) return null;

  const trs = [...table.querySelectorAll("tr")];
  if (trs.length < 2) return null;

  let startIdx = 0;
  const headCells = attunementTableRowCells(trs[0]);
  if (headCells.length >= 3) {
    const c0 = normalizeAttunementText(headCells[0].textContent ?? "").toLowerCase();
    const c1 = normalizeAttunementText(headCells[1].textContent ?? "").toLowerCase();
    const looksHeader = /roll/.test(c0) && (/behaviou?r/.test(c1) || /behavior/.test(c1));
    if (looksHeader) startIdx = 1;
  }

  /** @type {{ rollLow: number, rollHigh: number, label: string, effectHtml: string }[]} */
  const rows = [];
  for (let i = startIdx; i < trs.length; i++) {
    const tds = attunementTableRowCells(trs[i]);
    if (tds.length < 3) continue;
    const rollPlain = normalizeAttunementText(tds[0].textContent ?? "");
    const range = parseAttunementRollColumnRange(rollPlain);
    if (!range) continue;

    const behaviourPlain = normalizeAttunementText(tds[1].textContent ?? "");
    const label =
      behaviourPlain
        .split(/[\n\r]+/)
        .map((l) => l.trim())
        .filter(Boolean)[0] || "Attunement";

    const effectHtml = tds[2].innerHTML.trim();
    rows.push({ rollLow: range.low, rollHigh: range.high, label, effectHtml });
  }

  if (!rows.length) return null;

  const maxRoll = Math.max(...rows.map((r) => r.rollHigh));
  let rollFormula = `1d${maxRoll}`;

  if (startIdx > 0 && trs[0]) {
    const h0 = normalizeAttunementText(attunementTableRowCells(trs[0])[0]?.textContent ?? "");
    const fm = h0.match(/1d(\d+)/i);
    if (fm) {
      const n = Number(fm[1]);
      if (Number.isFinite(n) && n >= maxRoll) rollFormula = `1d${n}`;
    }
  }

  return { rows, rollFormula, maxRoll };
}

/**
 * @param {{ rollLow: number, rollHigh: number, label: string, effectHtml: string }[]} parsedRows
 * @returns {AttunementDebugRow[]}
 */
function htmlParsedRowsToDebugRows(parsedRows) {
  return parsedRows.map((r, idx) => ({
    resultId: `html-${idx}`,
    rangeLabel: r.rollLow === r.rollHigh ? String(r.rollLow) : `${r.rollLow}–${r.rollHigh}`,
    label: r.label,
    text: r.effectHtml,
    debugRollTotal: r.rollLow,
    rollLow: r.rollLow,
    rollHigh: r.rollHigh
  }));
}

/**
 * @param {AttunementDebugRow[]} rows
 * @param {number} total
 * @returns {AttunementDebugRow|null}
 */
function findAttunementRowForDiceTotal(rows, total) {
  const t = Number(total);
  if (!Number.isFinite(t)) return null;
  return rows.find((r) => {
    const lo = r.rollLow ?? r.debugRollTotal;
    const hi = r.rollHigh ?? r.debugRollTotal;
    return t >= lo && t <= hi;
  }) ?? null;
}

/**
 * Evaluate a simple formula (e.g. 1d8).
 * Do not use {@link Roll#evaluateSync} with `strict: false` for dice — Foundry treats random terms as 0, so chat shows total 0.
 * v13+: {@link Roll#evaluate} returns a Promise. Older: `evaluate({ async: true })`.
 * @param {string} formula e.g. 1d8
 * @param {object} rollData
 * @returns {Promise<Roll>}
 */
async function evaluateAttunementDiceRoll(formula, rollData) {
  const f = String(formula);
  const d = rollData;

  let roll = new Roll(f, d);
  try {
    await Promise.resolve(roll.evaluate());
  } catch {
    roll = new Roll(f, d);
    await Promise.resolve(roll.evaluate({ async: true }));
    return roll;
  }

  if (!Number.isFinite(roll.total) || roll.total < 1) {
    const r2 = new Roll(f, d);
    await Promise.resolve(r2.evaluate({ async: true }));
    return r2;
  }

  return roll;
}

/**
 * @typedef {{ resultId: string, rangeLabel: string, label: string, text: string, debugRollTotal: number, rollLow?: number, rollHigh?: number, legacyMoodId?: string }} AttunementDebugRow
 */

/**
 * @returns {AttunementDebugRow[]}
 */
function legacyAttunementDebugRows() {
  return ATTUNEMENT_MOODS.map((m) => ({
    resultId: `legacy:${m.id}`,
    rangeLabel: String(m.d4),
    label: m.label,
    text: `<p><strong>${m.label}</strong></p>`,
    debugRollTotal: m.d4,
    rollLow: m.d4,
    rollHigh: m.d4,
    legacyMoodId: m.id
  }));
}

/**
 * @param {RollTable} table
 * @returns {AttunementDebugRow[]}
 */
function buildAttunementDebugRowsFromTable(table) {
  const sorted = [...table.results].sort((a, b) => tableResultRangeLow(a) - tableResultRangeLow(b));
  return sorted.map((r) => {
    const text = r.text ?? "";
    const lo = tableResultRangeLow(r);
    let hi = lo;
    const range = r.range;
    if (Array.isArray(range) && range.length >= 2) {
      const t = Number(range[1]);
      if (Number.isFinite(t)) hi = t;
    } else if (range && typeof range === "object" && "max" in range) {
      const t = Number(/** @type {{ max?: unknown }} */ (range).max);
      if (Number.isFinite(t)) hi = t;
    }
    const rangeLabel = lo === hi ? String(lo) : `${lo}–${hi}`;
    return {
      resultId: r.id,
      rangeLabel,
      label: attunementTitleLineFromText(text),
      text,
      debugRollTotal: lo,
      rollLow: lo,
      rollHigh: hi
    };
  });
}

/**
 * @typedef {"html"|"rolltable"|"legacy"} AttunementConfigSource
 */

/**
 * Resolve attunement rows from the character's Attunement Ritual feature: embedded HTML table first, else RollTable.
 * @param {Actor} actor
 * @returns {Promise<{ source: AttunementConfigSource, uuid: string|null, table: RollTable|null, rows: AttunementDebugRow[], rollFormula: string }>}
 */
async function resolveAttunementRollTable(actor) {
  const feature = findActorAttunementRitualFeature(actor);
  const desc = String(
    foundry.utils.getProperty(feature, "system.description.value") ??
      foundry.utils.getProperty(feature, "description") ??
      ""
  );

  const parsed = parseAttunementDescriptionTable(desc);
  if (parsed?.rows?.length) {
    return {
      source: "html",
      uuid: null,
      table: null,
      rows: htmlParsedRowsToDebugRows(parsed.rows),
      rollFormula: parsed.rollFormula
    };
  }

  let table = null;
  try {
    table = await fromUuid(ATTUNEMENT_TABLE_UUID);
  } catch {
    /* ignore */
  }
  if (table?.documentName === "RollTable") {
    return {
      source: "rolltable",
      uuid: ATTUNEMENT_TABLE_UUID,
      table,
      rows: buildAttunementDebugRowsFromTable(table),
      rollFormula: normalizeAttunementRollFormula(String(table.formula ?? "1d4"))
    };
  }

  return {
    source: "legacy",
    uuid: ATTUNEMENT_TABLE_UUID,
    table: null,
    rows: legacyAttunementDebugRows(),
    rollFormula: "1d4"
  };
}

/**
 * @param {string} f
 * @returns {string}
 */
function normalizeAttunementRollFormula(f) {
  const s = String(f ?? "").trim();
  if (!s) return "1d4";
  if (/^1d\d+/i.test(s)) return s;
  if (/^d\d+/i.test(s)) return `1${s}`;
  return s;
}

/**
 * @param {object} itemData spell `toObject()` data
 * @param {number} max
 */
function applySpellLimitedUsesForPeriod(itemData, max) {
  const sys = itemData.system ?? (itemData.system = {});
  const u = sys.uses;
  if (u && typeof u === "object") {
    if ("max" in u) /** @type {{ max?: number }} */ (u).max = max;
    if ("value" in u) /** @type {{ value?: number }} */ (u).value = max;
    if ("spent" in u) /** @type {{ spent?: number }} */ (u).spent = 0;
    if ("recovery" in u && !/** @type {{ recovery?: string }} */ (u).recovery) {
      /** @type {{ recovery?: string }} */ (u).recovery = "lr";
    }
    return;
  }
  sys.uses = { max, spent: 0, recovery: "lr" };
}

/**
 * @param {Actor} actor
 * @param {object} opts
 * @param {string} opts.spellUuid
 * @param {string} opts.bracketLabel
 * @param {number} opts.maxSpellLevel
 * @param {Item|undefined|null} opts.shamanClassItem
 * @param {boolean} [opts.limitedUse]
 * @returns {Promise<boolean>}
 */
async function grantAttunementMoodSpell(actor, opts) {
  const { spellUuid, bracketLabel, maxSpellLevel, shamanClassItem, limitedUse = false } = opts;
  const src = await fetchSpellItem(spellUuid);
  if (!src) {
    ui.notifications.warn(`Could not load spell: ${spellUuid}`);
    return false;
  }
  const level = Number(src.system?.level ?? 0);
  if (level > maxSpellLevel) return false;

  const cls = await resolveShamanClassItemForSpells(actor, shamanClassItem);
  if (!cls) {
    ui.notifications.warn("Could not resolve Shaman class for ritual spell metadata.");
    return false;
  }

  const data = src.toObject();
  data.name = `${src.name} [${bracketLabel}]`;
  applyCommunicationRitualSpellMetadata(data, cls);
  foundry.utils.setProperty(data, `flags.${MODULE_ID}.attunementMoodSpell`, true);
  if (limitedUse) applySpellLimitedUsesForPeriod(data, 1);

  await actor.createEmbeddedDocuments("Item", [data]);
  return true;
}

/**
 * @param {string} uuid
 * @returns {Promise<string>}
 */
async function displayNameForSpellUuid(uuid) {
  const doc = await fetchSpellItem(uuid);
  return doc?.name ? String(doc.name) : uuid;
}

/**
 * Remove prior spirit-tagged spells and prior attunement-bracket spells.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function deletePriorRitualSpells(actor) {
  const toDelete = [];
  for (const item of actor.items) {
    if (item.type !== "spell") continue;
    const m = item.name?.match(NAME_BRACKET_RE);
    if (!m) continue;
    const inner = m[2].trim();
    if (SPIRIT_BRACKET_LABELS.has(inner) || ATTUNEMENT_BRACKET_LABELS.has(inner)) {
      toDelete.push(item.id);
    }
  }
  if (toDelete.length) {
    await actor.deleteEmbeddedDocuments("Item", toDelete);
  }
}

/**
 * @param {string} uuid
 * @returns {Promise<Item|null>}
 */
async function fetchSpellItem(uuid) {
  try {
    return await fromUuid(uuid);
  } catch {
    return null;
  }
}

/**
 * dnd5e 5.x `system.sourceItem` key (`class:identifier`) for multiclass spell bookkeeping.
 * @param {Item} classItem
 * @returns {string}
 */
function shamanSpellSourceItemKey(classItem) {
  const type = classItem?.type ?? "class";
  const ident =
    classItem?.identifier || foundry.utils.slugify(classItem?.name ?? "") || "shaman";
  return `${type}:${ident}`;
}

/**
 * Tag ritual-granted spells for the Shaman class: source item, prepared, Wisdom DC/attack.
 * @param {object} itemData spell `toObject()` data
 * @param {Item} shamanClassItem class item on the actor (or compendium definition)
 */
function applyCommunicationRitualSpellMetadata(itemData, shamanClassItem) {
  if (!shamanClassItem || shamanClassItem.type !== "class") return;
  const preparedVal = CONFIG.DND5E?.spellPreparationStates?.prepared?.value ?? 1;
  const method =
    shamanClassItem.spellcasting?.type ??
    foundry.utils.getProperty(shamanClassItem, "system.spellcasting.type") ??
    "spell";
  foundry.utils.setProperty(itemData, "system.sourceItem", shamanSpellSourceItemKey(shamanClassItem));
  foundry.utils.setProperty(itemData, "system.method", method);
  foundry.utils.setProperty(itemData, "system.prepared", preparedVal);
  foundry.utils.setProperty(itemData, "system.ability", "wis");
  if (itemData.system && "preparation" in itemData.system) delete itemData.system.preparation;
}

/**
 * @param {Actor} actor
 * @param {Item|undefined|null} shamanClassItem
 * @returns {Promise<Item|null>}
 */
async function resolveShamanClassItemForSpells(actor, shamanClassItem) {
  if (shamanClassItem?.type === "class") return shamanClassItem;
  const onSheet = getShamanClassItem(actor);
  if (onSheet) return onSheet;
  try {
    const doc = await fromUuid(SHAMAN_CLASS_COMPENDIUM_UUID);
    return doc?.type === "class" ? doc : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} name
 * @returns {Promise<string|null>}
 */
async function phbSpellUuidByName(name) {
  const pack = game.packs.get("dnd-players-handbook.spells");
  if (!pack) return null;
  await pack.getIndex({ fields: ["name", "type"] });
  const entry = pack.index.find((i) => i.name === name && i.type === "spell");
  return entry?.uuid ?? null;
}

/**
 * @param {Actor} actor
 * @param {string} baseName
 * @param {string} bracketLabel
 * @param {string} spellUuid
 * @param {number} maxSpellLevel
 * @param {Item|undefined|null} shamanClassItem
 * @returns {Promise<boolean>}
 */
async function grantPreparedSpell(actor, baseName, bracketLabel, spellUuid, maxSpellLevel, shamanClassItem) {
  const src = await fetchSpellItem(spellUuid);
  if (!src) {
    ui.notifications.warn(`Could not load spell: ${spellUuid}`);
    return false;
  }
  const level = Number(src.system?.level ?? 0);
  if (level > maxSpellLevel) return false;

  const cls = await resolveShamanClassItemForSpells(actor, shamanClassItem);
  if (!cls) {
    ui.notifications.warn("Could not resolve Shaman class for ritual spell metadata.");
    return false;
  }

  const data = src.toObject();
  data.name = `${baseName} [${bracketLabel}]`;
  applyCommunicationRitualSpellMetadata(data, cls);
  await actor.createEmbeddedDocuments("Item", [data]);
  return true;
}

/**
 * @param {Actor} actor
 * @param {string[]} spiritIds
 * @param {number} maxSpellLevel
 * @param {Item|undefined|null} shamanClassItem
 * @returns {Promise<number>}
 */
async function grantSpiritSpellsV2(actor, spiritIds, maxSpellLevel, shamanClassItem) {
  const cls = await resolveShamanClassItemForSpells(actor, shamanClassItem);
  if (!cls) {
    ui.notifications.warn("Could not resolve Shaman class for ritual spell metadata.");
    return 0;
  }

  let n = 0;
  for (const sid of spiritIds) {
    const def = SPIRIT_BY_ID[sid];
    if (!def) continue;
    for (const uuid of def.spells) {
      const src = await fetchSpellItem(uuid);
      if (!src) {
        ui.notifications.warn(`Could not load spell: ${uuid}`);
        continue;
      }
      const level = Number(src.system?.level ?? 0);
      if (level > maxSpellLevel) continue;
      const data = src.toObject();
      data.name = `${src.name} [${def.label}]`;
      applyCommunicationRitualSpellMetadata(data, cls);
      await actor.createEmbeddedDocuments("Item", [data]);
      n++;
    }
  }
  return n;
}

/**
 * Public chat card summarizing communication ritual outcomes for the table.
 * @param {ShamanRitualApplication} app
 * @param {number} spiritSpellsGranted count from {@link grantSpiritSpellsV2}
 */
async function postCommunicationRitualSummaryToChat(app, spiritSpellsGranted) {
  if (!game.user?.id) return;

  const actor = game.actors.get(app.actor.id) ?? app.actor;
  const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
  const activeIds = app._activeSpiritIds?.length ? app._activeSpiritIds : [...new Set([...app._guaranteedPick, ...app._rolledSpiritIds])];
  const activeLabels = activeIds.map((id) => SPIRIT_BY_ID[id]?.label ?? id).filter(Boolean);

  const lines = [
    `<div class="fmom-communication-ritual-summary">`,
    `<h4>Communication Ritual</h4>`,
    `<p><strong>${esc(actor.name)}</strong> finishes the long-rest rite; the circle is sealed for the day.</p>`
  ];

  if (app.guaranteed > 0) {
    const chosen = [...app._guaranteedPick].map((id) => SPIRIT_BY_ID[id]?.label ?? id);
    lines.push(`<p><strong>Spirits called (enhanced):</strong> ${chosen.map(esc).join(", ")}</p>`);
  }

  if (app.rollCount > 0) {
    const rolled = app._rolledSpiritIds.map((id) => SPIRIT_BY_ID[id]?.label ?? id);
    lines.push(`<p><strong>Spirits communed:</strong> ${rolled.map(esc).join(", ")}</p>`);
  }

  if (app.doAttunement && (app._attunementDisplayLabel || app._attunementMoodId)) {
    const moodLabel = app._attunementDisplayLabel || ATTUNEMENT_MOOD_BY_ID[app._attunementMoodId]?.label || app._attunementMoodId;
    const spellLine = app._attunementSpellSummary?.trim();
    if (spellLine) {
      lines.push(`<p><strong>Attunement:</strong> ${esc(moodLabel)}. <strong>Mood spell:</strong> ${esc(spellLine)}.</p>`);
    } else {
      lines.push(
        `<p><strong>Attunement:</strong> ${esc(moodLabel)}. <strong>Mood spell:</strong> none (wild or no linked spell).</p>`
      );
    }
  }

  lines.push(`</div>`);
  const content = lines.join("\n");

  try {
    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      flags: { [MODULE_ID]: { communicationRitualSummary: true } }
    });
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to post communication ritual chat summary`, err);
  }
}

// ---------------------------------------------------------------------------
// Applications (UI)
// ---------------------------------------------------------------------------

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Post–long-rest: styled prompt to run or skip the ritual.
 */
class ShamanRitualPromptApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @type {boolean} */
  _settled = false;

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: "div",
    id: "fmom-shaman-ritual-prompt",
    classes: ["fmom-shaman-ritual-prompt"],
    position: { width: 480, height: 620 },
    window: {
      icon: "fa-solid fa-moon",
      title: "Communication Ritual",
      resizable: false
    },
    actions: {
      skipRitual: ShamanRitualPromptApplication.#onSkip,
      runRitual: ShamanRitualPromptApplication.#onRun
    }
  };

  /** @inheritDoc */
  static PARTS = {
    body: {
      root: true,
      template: `modules/${MODULE_ID}/templates/shaman-ritual-prompt.hbs`
    }
  };

  /**
   * @param {object} opts
   * @param {Actor} opts.actor
   * @param {(v: boolean) => void} opts.onChoice
   */
  constructor(opts) {
    super(opts);
    this._settled = false;
    this.addEventListener(
      "close",
      () => {
        if (!this._settled) {
          this._settled = true;
          this.options.onChoice?.(false);
        }
      },
      { once: true }
    );
  }

  /** @inheritDoc */
  async _prepareContext(_options) {
    const a = this.options.actor;
    const defTok = typeof CONST !== "undefined" ? CONST.DEFAULT_TOKEN : "";
    const img = a?.img && (!defTok || a.img !== defTok) ? a.img : "";
    return {
      actorName: foundry.utils.escapeHTML(a?.name ?? "Traveler"),
      actorImg: img
    };
  }

  /** @param {boolean} value */
  #settle(value) {
    if (this._settled) return;
    this._settled = true;
    this.options.onChoice?.(value);
    this.close();
  }

  static #onSkip() {
    /** @type {ShamanRitualPromptApplication} */
    const app = this;
    app.#settle(false);
  }

  static #onRun() {
    /** @type {ShamanRitualPromptApplication} */
    const app = this;
    app.#settle(true);
  }
}

class ShamanRitualApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @type {"choose"|"roll"|"attune"|"done"} */
  _step = "choose";

  /** @type {Set<string>} */
  _guaranteedPick = new Set();

  /** @type {string[]} */
  _rolledSpiritIds = [];

  /** @type {boolean} */
  _rollsComplete = false;

  /** @type {boolean} */
  _attuneDone = false;

  /** @type {string} */
  _attuneHtml = "";

  /** @type {number|null} */
  _attunementRollTotal = null;

  /** @type {string|null} */
  _attunementMoodId = null;

  /** @type {string} */
  _attunementDisplayLabel = "";

  /** @type {string} */
  _attunementSpellSummary = "";

  /** @type {Promise<{ uuid: string, table: RollTable|null, rows: AttunementDebugRow[] }>|null} */
  _attunementCfgPromise = null;

  /** @type {string[]} */
  _activeSpiritIds = [];

  /** When true, communion and attunement table rolls are skipped; results are chosen manually. */
  _debugManualTest = false;

  /** @type {string[]} Parallel to roll slots; spirit ids or "" */
  _debugRollPicks = [];

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: "div",
    id: "fmom-shaman-ritual",
    classes: ["fmom-shaman-ritual"],
    position: { width: 560, height: 640 },
    window: {
      icon: "fa-solid fa-moon",
      title: "Communication Ritual",
      resizable: true
    },
    actions: {
      toggleSpirit: ShamanRitualApplication.#onToggleSpirit,
      confirmChoose: ShamanRitualApplication.#onConfirmChoose,
      rollSpirits: ShamanRitualApplication.#onRollSpirits,
      nextAfterRoll: ShamanRitualApplication.#onNextAfterRoll,
      rollAttunement: ShamanRitualApplication.#onRollAttunement,
      finishRitual: ShamanRitualApplication.#onFinishRitual,
      closeApp: ShamanRitualApplication.#onCloseApp,
      confirmDebugRolls: ShamanRitualApplication.#onConfirmDebugRolls,
      pickDebugAttunement: ShamanRitualApplication.#onPickDebugAttunement
    }
  };

  /** @inheritDoc */
  static PARTS = {
    body: {
      root: true,
      template: `modules/${MODULE_ID}/templates/shaman-ritual.hbs`,
      scrollY: [".fmom-sr__body"]
    }
  };

  /**
   * @param {object} opts
   * @param {Actor} opts.actor
   * @param {Item} opts.shamanClass
   * @param {number} opts.guaranteed
   * @param {number} opts.rollCount
   * @param {number} opts.shamanLevel
   * @param {boolean} opts.doAttunement
   */
  constructor(opts) {
    super(opts);
    this._guaranteedPick = new Set();
    this._rolledSpiritIds = [];
    this._rollsComplete = false;
    this._attuneDone = false;
    this._attuneHtml = "";
    this._attunementRollTotal = null;
    this._attunementMoodId = null;
    this._attunementDisplayLabel = "";
    this._attunementSpellSummary = "";
    this._attunementCfgPromise = null;
    this._activeSpiritIds = [];
    this._debugManualTest = false;
    this._debugRollPicks = [];

    const g = Math.max(0, Number(opts.guaranteed) || 0);
    const rc = Math.max(0, Number(opts.rollCount) || 0);
    const doA = opts.doAttunement === true;
    if (g === 0) {
      this._step = "roll";
      if (rc === 0) {
        this._rollsComplete = true;
        // Stay on roll (with Continue) unless attunement is next; "done" skips #finishRitual and never grants spirit spells.
        this._step = doA ? "attune" : "roll";
      }
    }

    /** @private */
    this._fmomDebugChangeBound = false;
  }

  get actor() {
    return this.options.actor;
  }

  get shamanClass() {
    return this.options.shamanClass;
  }

  get guaranteed() {
    return Math.max(0, Number(this.options.guaranteed) || 0);
  }

  get rollCount() {
    return Math.max(0, Number(this.options.rollCount) || 0);
  }

  get shamanLevel() {
    return Math.max(0, Number(this.options.shamanLevel) || 0);
  }

  get doAttunement() {
    return this.options.doAttunement === true;
  }

  /**
   * Cached attunement config: HTML table in the Attunement Ritual feature, else compendium RollTable, else legacy d4 list.
   * @returns {Promise<{ source: AttunementConfigSource, uuid: string|null, table: RollTable|null, rows: AttunementDebugRow[], rollFormula: string }>}
   */
  _getAttunementTableConfig() {
    if (!this._attunementCfgPromise) {
      const actor = game.actors.get(this.actor.id) ?? this.actor;
      this._attunementCfgPromise = resolveAttunementRollTable(actor);
    }
    return this._attunementCfgPromise;
  }

  _ensureDebugRollPicks() {
    const n = this.rollCount;
    const next = Array.from({ length: n }, (_, i) => this._debugRollPicks[i] ?? "");
    this._debugRollPicks = next;
  }

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this._fmomDebugChangeBound) {
      const el = this.element;
      if (el) {
        this._fmomDebugChangeBound = true;
        el.addEventListener("change", (ev) => ShamanRitualApplication.#onRootChange(this, ev));
      }
    }
  }

  /** @inheritDoc */
  async _prepareContext(_options) {
    const g = this.guaranteed;
    const rc = this.rollCount;
    const step = this._step;
    const guaranteedLabels = [...this._guaranteedPick].map((id) => SPIRIT_BY_ID[id]?.label ?? id);
    const rolledLabels = this._rolledSpiritIds.map((id) => SPIRIT_BY_ID[id]?.label ?? id);

    const title =
      step === "choose"
        ? "Enhanced Communication"
        : step === "roll"
          ? "Communication Ritual"
          : step === "attune"
            ? "Attunement Ritual"
            : "Complete";

    const subtitle =
      step === "roll"
        ? "Roll for additional active spirits (duplicates re-rolled until unique)."
        : step === "attune"
          ? "Level 9+ Shaman: discern the spirits’ mood."
          : "";

    const spirits = SPIRITS.map((s) => ({
      id: s.id,
      label: s.label,
      selected: this._guaranteedPick.has(s.id),
      disabled: !this._guaranteedPick.has(s.id) && this._guaranteedPick.size >= g && g > 0
    }));

    const selectedCount = this._guaranteedPick.size;
    const chooseValid = g === 0 || selectedCount === g;

    const order = [];
    if (g > 0) order.push("choose");
    order.push("roll");
    if (this.doAttunement) order.push("attune");
    order.push("done");

    let stepIdx = order.indexOf(step);
    if (stepIdx < 0) stepIdx = 0;

    /** @type {Record<string, string>} */
    const stepLabels = { choose: "Call", roll: "Commune", attune: "Attune", done: "Seal" };
    const progressSteps = order.map((id, i) => ({
      id,
      label: stepLabels[id] ?? id,
      state: i < stepIdx ? "complete" : i === stepIdx ? "current" : "upcoming"
    }));

    const counterPct = g > 0 ? Math.min(100, Math.round((selectedCount / g) * 100)) : 100;
    const showProgress = progressSteps.length > 0;

    const debugManual = this._debugManualTest;
    const showDebugToggle =
      step === "choose" ||
      (step === "roll" && g === 0) ||
      (step === "attune" && g === 0 && rc === 0 && this.doAttunement);

    const showDebugRollUi = step === "roll" && debugManual && rc > 0 && !this._rollsComplete;
    const showDebugAttuneUi =
      step === "attune" && debugManual && this.doAttunement && !this._attuneDone;

    /** @type {{ slotIndex: number, slotNumber: number, options: { id: string, label: string, selected: boolean }[] }[]} */
    let debugRollSlots = [];
    if (showDebugRollUi) {
      this._ensureDebugRollPicks();
      for (let i = 0; i < rc; i++) {
        const cur = this._debugRollPicks[i] || "";
        debugRollSlots.push({
          slotIndex: i,
          slotNumber: i + 1,
          options: SPIRITS.map((s) => ({
            id: s.id,
            label: s.label,
            selected: cur === s.id
          }))
        });
      }
    }

    /** @type {{ resultId: string, rangeLabel: string, label: string }[]} */
    let debugAttunementRows = ATTUNEMENT_MOODS.map((m) => ({
      resultId: `legacy:${m.id}`,
      rangeLabel: String(m.d4),
      label: m.label
    }));
    let attuneRollFormula = "1d4";
    if (this.doAttunement) {
      const attCfg = await this._getAttunementTableConfig();
      if (attCfg.rows?.length) {
        debugAttunementRows = attCfg.rows.map((r) => ({
          resultId: r.resultId,
          rangeLabel: r.rangeLabel,
          label: r.label
        }));
      }
      attuneRollFormula = normalizeAttunementRollFormula(attCfg.rollFormula);
    }

    return {
      title,
      subtitle,
      stepChoose: step === "choose",
      stepRoll: step === "roll",
      stepAttune: step === "attune",
      stepDone: step === "done",
      spirits,
      guaranteed: g,
      selectedCount,
      chooseValid,
      rollCount: rc,
      guaranteedLabels,
      rolledLabels,
      rollsDone: this._rollsComplete,
      attuneSummary: this._attuneHtml,
      attuneDone: this._attuneDone,
      progressSteps,
      counterPct,
      showProgress,
      debugManual,
      showDebugToggle,
      showDebugRollUi,
      showDebugAttuneUi,
      debugRollSlots,
      debugAttunementRows,
      attuneRollFormula,
      hideAttuneFooter: showDebugAttuneUi
    };
  }

  static #onToggleSpirit(event, target) {
    const id = target.dataset.spiritId;
    if (!id) return;
    const app = /** @type {ShamanRitualApplication} */ (this);
    const max = app.guaranteed;
    if (max <= 0) return;
    if (app._guaranteedPick.has(id)) app._guaranteedPick.delete(id);
    else if (app._guaranteedPick.size < max) app._guaranteedPick.add(id);
    app.render();
  }

  static #onConfirmChoose(_event, _target) {
    const app = /** @type {ShamanRitualApplication} */ (this);
    const g = app.guaranteed;
    if (g > 0 && app._guaranteedPick.size !== g) {
      ui.notifications.warn(`Select exactly ${g} spirit(s).`);
      return;
    }
    app._step = "roll";
    if (app._debugManualTest) app._ensureDebugRollPicks();
    if (app.rollCount === 0) {
      app._rollsComplete = true;
      app._step = app.doAttunement ? "attune" : "roll";
    }
    app.render();
  }

  /**
   * @param {ShamanRitualApplication} app
   * @param {Event} ev
   */
  static #onRootChange(app, ev) {
    const t = ev.target;
    if (t instanceof HTMLInputElement && t.classList.contains("fmom-sr__debug-cb")) {
      app._debugManualTest = t.checked;
      if (app._debugManualTest) app._ensureDebugRollPicks();
      app.render();
      return;
    }
    if (t instanceof HTMLSelectElement && t.classList.contains("fmom-sr__debug-roll-select")) {
      const idx = Number.parseInt(t.dataset.slot ?? "", 10);
      if (!Number.isFinite(idx) || idx < 0) return;
      app._ensureDebugRollPicks();
      app._debugRollPicks[idx] = t.value;
    }
  }

  static async #onRollSpirits(_event, _target) {
    const app = /** @type {ShamanRitualApplication} */ (this);
    const table = await fromUuid(COMMUNICATION_TABLE_UUID);
    if (!table || table.documentName !== "RollTable") {
      ui.notifications.error("Communication Ritual table not found.");
      return;
    }

    const taken = new Set(app._guaranteedPick);
    const rolled = [...app._rolledSpiritIds];
    const need = app.rollCount;

    let guard = 0;
    while (rolled.length < need && guard < 200) {
      guard++;
      const draw = await table.draw({ displayChat: true, rollMode: CONST.DICE_ROLL_MODES.PUBLIC });
      const results = Array.from(draw.results ?? []);
      const texts = results.map((r) => r.text ?? r.name ?? "");
      const blob = texts.join(" ");
      let sid = spiritIdFromTableText(blob);
      if (!sid && results[0]?.documentUuid) {
        const doc = await fromUuid(results[0].documentUuid).catch(() => null);
        if (doc?.name) sid = spiritIdFromTableText(doc.name);
      }
      if (!sid) {
        ui.notifications.warn(`Could not parse spirit from table result: ${blob || "(empty)"}`);
        continue;
      }
      if (taken.has(sid)) continue;
      taken.add(sid);
      rolled.push(sid);
    }

    if (rolled.length < need) {
      ui.notifications.error("Could not determine enough unique spirits; check your Communication Ritual table results.");
      app._rollsComplete = false;
      app.render();
      return;
    }

    app._rolledSpiritIds = rolled.slice(0, need);
    app._rollsComplete = true;
    app.render();
  }

  /**
   * Grant spirit-tagged spells from chosen + rolled spirits (always run once before the "done" step).
   * @param {ShamanRitualApplication} app
   */
  static async #sealSpiritSpells(app) {
    const actor = game.actors.get(app.actor.id) ?? app.actor;
    const maxLv = getMaxLeveledSpellSlot(actor);
    const active = [...new Set([...app._guaranteedPick, ...app._rolledSpiritIds])];
    app._activeSpiritIds = active;
    const granted = await grantSpiritSpellsV2(actor, active, maxLv, app.shamanClass);
    ui.notifications.info("Communication Ritual spells updated on your sheet.");
    await postCommunicationRitualSummaryToChat(app, granted);
  }

  static async #onNextAfterRoll(_event, _target) {
    const app = /** @type {ShamanRitualApplication} */ (this);
    if (app.doAttunement) {
      app._step = "attune";
      app.render();
      return;
    }
    await ShamanRitualApplication.#sealSpiritSpells(app);
    app._step = "done";
    app.render();
  }

  static #onConfirmDebugRolls(_event, _target) {
    const app = /** @type {ShamanRitualApplication} */ (this);
    const need = app.rollCount;
    const taken = new Set(app._guaranteedPick);
    app._ensureDebugRollPicks();
    const picks = app._debugRollPicks.slice(0, need);
    if (picks.length !== need || picks.some((p) => !p)) {
      ui.notifications.warn(`Pick a spirit for each of the ${need} communion slot(s).`);
      return;
    }
    for (const sid of picks) {
      if (taken.has(sid)) {
        ui.notifications.warn("Each rolled spirit must differ from your chosen spirits and from other slots.");
        return;
      }
      taken.add(sid);
    }
    app._rolledSpiritIds = picks;
    app._rollsComplete = true;
    app.render();
  }

  /**
   * @param {ShamanRitualApplication} app
   * @param {Actor} actor
   * @param {string} displayBlob enriched source HTML for the panel
   * @param {number|null} diceTotal
   * @param {AttunementOutcome} outcome
   */
  static async #applyAttunementOutcome(app, actor, displayBlob, diceTotal, outcome) {
    const { bracketLabel, effectMoodId, preparedSpellUuid, onceSpellUuid } = outcome;
    app._attunementRollTotal =
      typeof diceTotal === "number" && Number.isFinite(diceTotal) ? diceTotal : null;
    app._attunementMoodId = effectMoodId;
    app._attunementDisplayLabel = bracketLabel;
    app._attunementSpellSummary = "";

    const maxLv = getMaxLeveledSpellSlot(actor);
    await applyAttunementRitualEffectByBehaviourName(actor, bracketLabel);
    await deleteAttunementBracketSpells(actor);

    const spellBits = [];
    if (onceSpellUuid) {
      const ok = await grantAttunementMoodSpell(actor, {
        spellUuid: onceSpellUuid,
        bracketLabel,
        maxSpellLevel: maxLv,
        shamanClassItem: app.shamanClass,
        limitedUse: true
      });
      if (ok) spellBits.push(`${await displayNameForSpellUuid(onceSpellUuid)} (1 use, long rest)`);
    }
    if (preparedSpellUuid && preparedSpellUuid !== onceSpellUuid) {
      const ok = await grantAttunementMoodSpell(actor, {
        spellUuid: preparedSpellUuid,
        bracketLabel,
        maxSpellLevel: maxLv,
        shamanClassItem: app.shamanClass,
        limitedUse: false
      });
      if (ok) spellBits.push(await displayNameForSpellUuid(preparedSpellUuid));
    }
    app._attunementSpellSummary = spellBits.join("; ");

    const TE = foundry.applications.ux.TextEditor.implementation;
    try {
      app._attuneHtml = displayBlob
        ? await TE.enrichHTML(displayBlob, { relativeTo: actor })
        : "";
    } catch {
      app._attuneHtml = displayBlob ? `<p>${foundry.utils.escapeHTML(displayBlob)}</p>` : "";
    }
    app._attuneDone = true;
    app.render();
  }

  static async #onPickDebugAttunement(_event, target) {
    const resultId = target.dataset.resultId;
    if (!resultId) return;
    const app = /** @type {ShamanRitualApplication} */ (this);
    const actor = game.actors.get(app.actor.id) ?? app.actor;
    const cfg = await app._getAttunementTableConfig();
    const row = cfg.rows.find((r) => r.resultId === resultId);
    if (!row) return;

    let outcome;
    let displayBlob = row.text;
    const diceTotal = row.debugRollTotal;

    if (row.legacyMoodId) {
      const mood = ATTUNEMENT_MOOD_BY_ID[row.legacyMoodId];
      if (!mood) return;
      const spellUuid = mood.spell ? await phbSpellUuidByName(mood.spell) : null;
      outcome = {
        bracketLabel: mood.label,
        effectMoodId: row.legacyMoodId,
        preparedSpellUuid: spellUuid,
        onceSpellUuid: null
      };
      displayBlob = `<p><strong>${mood.label}</strong> (debug ${row.rangeLabel})</p>`;
    } else if (cfg.source === "html") {
      outcome = parseAttunementOutcomeFromHtmlRow(row.label, row.text, diceTotal);
      displayBlob = `<p><strong>${foundry.utils.escapeHTML(row.label)}</strong></p>${row.text}`;
    } else {
      outcome = parseAttunementOutcomeFromResultText(row.text, diceTotal, cfg.table);
      displayBlob = row.text;
    }

    await ShamanRitualApplication.#applyAttunementOutcome(app, actor, displayBlob, diceTotal, outcome);
  }

  static async #onRollAttunement(_event, _target) {
    const app = /** @type {ShamanRitualApplication} */ (this);
    const actor = game.actors.get(app.actor.id) ?? app.actor;
    const cfg = await app._getAttunementTableConfig();

    if (cfg.source === "rolltable" && cfg.table?.documentName === "RollTable") {
      const draw = await cfg.table.draw({ displayChat: true, rollMode: CONST.DICE_ROLL_MODES.PUBLIC });
      const first = Array.from(draw.results ?? [])[0];
      const blob = String(first?.text ?? first?.name ?? "").trim();
      const rt = draw.roll?.total;
      const rollTotal = typeof rt === "number" && Number.isFinite(rt) ? rt : null;

      if (!blob) {
        ui.notifications.error("Attunement table result was empty.");
        app.render();
        return;
      }

      const outcome = parseAttunementOutcomeFromResultText(blob, rollTotal, cfg.table);
      await ShamanRitualApplication.#applyAttunementOutcome(app, actor, blob, rollTotal, outcome);
      return;
    }

    if (cfg.source === "html" || cfg.source === "legacy") {
      const rollData = actor.getRollData?.() ?? {};
      let roll;
      try {
        roll = await evaluateAttunementDiceRoll(cfg.rollFormula, rollData);
      } catch (err) {
        console.error(`${MODULE_ID} | attunement roll`, err);
        ui.notifications.error("Attunement roll failed.");
        return;
      }
      const rollTotal = roll.total;
      if (!Number.isFinite(rollTotal) || rollTotal < 1) {
        ui.notifications.error(
          "Attunement roll did not produce a valid total (try again). If this persists, check Foundry / system versions."
        );
        app.render();
        return;
      }
      if (typeof roll.toMessage === "function") {
        try {
          await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            rollMode: CONST.DICE_ROLL_MODES.PUBLIC
          });
        } catch (err) {
          console.error(`${MODULE_ID} | attunement roll toMessage`, err);
        }
      }

      const row = findAttunementRowForDiceTotal(cfg.rows, rollTotal);
      if (!row) {
        ui.notifications.error(`No attunement row on your feature matches ${rollTotal}.`);
        app.render();
        return;
      }

      if (row.legacyMoodId) {
        const mood = ATTUNEMENT_MOOD_BY_ID[row.legacyMoodId];
        if (!mood) return;
        const spellUuid = mood.spell ? await phbSpellUuidByName(mood.spell) : null;
        const outcome = {
          bracketLabel: mood.label,
          effectMoodId: row.legacyMoodId,
          preparedSpellUuid: spellUuid,
          onceSpellUuid: null
        };
        const displayBlob = `<p><strong>${mood.label}</strong></p>`;
        await ShamanRitualApplication.#applyAttunementOutcome(app, actor, displayBlob, rollTotal, outcome);
        return;
      }

      const outcome = parseAttunementOutcomeFromHtmlRow(row.label, row.text, rollTotal);
      const displayBlob = `<p><strong>${foundry.utils.escapeHTML(row.label)}</strong></p>${row.text}`;
      await ShamanRitualApplication.#applyAttunementOutcome(app, actor, displayBlob, rollTotal, outcome);
      return;
    }

    ui.notifications.error("Attunement Ritual could not be resolved (no table in the feature and default roll table missing).");
  }

  static async #onFinishRitual(_event, _target) {
    const app = /** @type {ShamanRitualApplication} */ (this);
    await ShamanRitualApplication.#sealSpiritSpells(app);
    app._step = "done";
    app.render();
  }

  static #onCloseApp(_event, _target) {
    const app = /** @type {ShamanRitualApplication} */ (this);
    app.close();
  }
}

/**
 * @param {Actor} actor
 * @returns {Promise<boolean>} true if the player chose to run the ritual
 */
function promptRunRitualAfterLongRest(actor) {
  return new Promise((resolve) => {
    const app = new ShamanRitualPromptApplication({
      actor,
      onChoice: (v) => resolve(!!v)
    });
    app.render(true);
  });
}

// ---------------------------------------------------------------------------
// Workflow entry
// ---------------------------------------------------------------------------

/**
 * @param {Actor} actor
 * @param {Item5e} shamanClass
 * @returns {Promise<void>}
 */
async function runCommunicationRitual(actor, shamanClass) {
  const live = game.actors.get(actor.id) ?? actor;
  if (!live.isOwner) return;

  await deletePriorRitualSpells(live);
  await removeAllAttunementRitualEffects(live);
  await disableAllAttunementFeatureEmbeddedEffects(live);

  const scales = shamanClass.scaleValues ?? {};
  // ScaleValue identifiers match @scale.shaman.* (class slug prefix in dnd5e).
  const guaranteed = numericFromScaleEntry(
    scales["shaman.guaranteed-active-spirits"] ??
      scales["guaranteed-active-spirits"] ??
      scales["guaranteedactivespirits"]
  );
  const rollCount = numericFromScaleEntry(
    scales["shaman.active-spirit-rolls"] ??
      scales["active-spirit-rolls"] ??
      scales["activespiritrolls"]
  );
  const shamanLevel = Number(shamanClass.system?.levels ?? 0);
  const doAttunement = shamanLevel >= 9;

  const app = new ShamanRitualApplication({
    actor: live,
    shamanClass,
    guaranteed,
    rollCount,
    shamanLevel,
    doAttunement
  });

  app.render(true);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

Hooks.once("init", () => {
  Hooks.on("dnd5e.restCompleted", async (actor, _result, config) => {
    try {
      if (game.system?.id !== "dnd5e") return;
      if (config?.type !== "long") return;
      const shaman = getShamanClassItem(actor);
      if (!shaman || Number(shaman.system?.levels ?? 0) < 1) return;
      if (!actor.isOwner) return;

      const run = await promptRunRitualAfterLongRest(actor);
      if (!run) return;

      await runCommunicationRitual(actor, shaman);
    } catch (err) {
      console.error("FMoM Shaman ritual (restCompleted)", err);
      ui.notifications.error("Communication Ritual failed - see console.");
    }
  });
});

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

/** Parent class item for attunement ActiveEffects (fmom-classes). */
const ATTUNEMENT_EFFECT_UUID_PREFIX =
  "Compendium.falcrests-machinations-of-madness.fmom-classes.Item.3Jj5sQLZGKdf9Atr.ActiveEffect";

/** @type {Record<string, string>} mood id → compendium ActiveEffect UUID */
const ATTUNEMENT_EFFECT_UUIDS = {
  peaceful: `${ATTUNEMENT_EFFECT_UUID_PREFIX}.HDI0ZTDnTTogvmxf`,
  aggressive: `${ATTUNEMENT_EFFECT_UUID_PREFIX}.M4SqcNMunoWjm6JB`,
  chaotic: `${ATTUNEMENT_EFFECT_UUID_PREFIX}.X189s1E7Rulgns78`,
  sorrowful: `${ATTUNEMENT_EFFECT_UUID_PREFIX}.52FoEcLJzT34tt0M`
};

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

const ATTUNEMENT_EFFECT_SHORT_IDS = new Set([
  "HDI0ZTDnTTogvmxf",
  "M4SqcNMunoWjm6JB",
  "X189s1E7Rulgns78",
  "52FoEcLJzT34tt0M"
]);

/**
 * @param {ActiveEffect} effect
 * @returns {boolean}
 */
function effectIsShamanAttunement(effect) {
  if (effect.getFlag(MODULE_ID, "attunementEffect")) return true;
  const o = String(effect.origin ?? "");
  if (!o.includes("3Jj5sQLZGKdf9Atr.ActiveEffect")) return false;
  return [...ATTUNEMENT_EFFECT_SHORT_IDS].some((id) => o.includes(id));
}

/**
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function removeAllShamanAttunementEffects(actor) {
  const ids = actor.effects.filter(effectIsShamanAttunement).map((e) => e.id);
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
    const m = item.name?.match(NAME_BRACKET_RE);
    if (!m) continue;
    const inner = m[2].trim();
    if (ATTUNEMENT_BRACKET_LABELS.has(inner)) toDelete.push(item.id);
  }
  if (toDelete.length) await actor.deleteEmbeddedDocuments("Item", toDelete);
}

/**
 * Strip prior attunement effects, then apply the compendium effect for this mood.
 * @param {Actor} actor
 * @param {string} moodId peaceful | aggressive | chaotic | sorrowful
 * @returns {Promise<void>}
 */
async function swapAttunementToMood(actor, moodId) {
  const mood = ATTUNEMENT_MOOD_BY_ID[moodId];
  const uuid = ATTUNEMENT_EFFECT_UUIDS[moodId];
  if (!mood || !uuid) return;

  await removeAllShamanAttunementEffects(actor);

  const src = await fromUuid(uuid);
  if (!src || src.documentName !== "ActiveEffect") {
    ui.notifications.warn(`Could not load attunement effect (${mood.label}).`);
    return;
  }

  const data = src.toObject();
  delete data._id;
  data.origin = actor.uuid;
  foundry.utils.setProperty(data, `flags.${MODULE_ID}`, {
    attunementEffect: true,
    attunementMood: moodId
  });
  await actor.createEmbeddedDocuments("ActiveEffect", [data]);
}

/**
 * @param {string} blob
 * @param {number|null} d4
 * @returns {string|null} mood id
 */
function parseAttunementMood(blob, d4) {
  const lower = (blob || "").toLowerCase();
  if (lower.includes("peaceful")) return "peaceful";
  if (lower.includes("aggressive")) return "aggressive";
  if (lower.includes("chaotic")) return "chaotic";
  if (lower.includes("sorrowful")) return "sorrowful";
  const d = Number(d4);
  if (d === 1) return "peaceful";
  if (d === 2) return "aggressive";
  if (d === 3) return "chaotic";
  if (d === 4) return "sorrowful";
  return null;
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

  if (app.doAttunement && app._attunementMoodId) {
    const mood = ATTUNEMENT_MOOD_BY_ID[app._attunementMoodId];
    const moodLabel = mood?.label ?? app._attunementMoodId;
    if (mood?.spell) {
      lines.push(
        `<p><strong>Attunement:</strong> ${esc(moodLabel)}. <strong>Mood spell:</strong> ${esc(mood.spell)}.</p>`
      );
    } else {
      lines.push(
        `<p><strong>Attunement:</strong> ${esc(moodLabel)}. <strong>Mood spell:</strong> none set (wild mood).</p>`
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
      debugAttuneMoods: ATTUNEMENT_MOODS.map((m) => ({ id: m.id, label: m.label, d4: m.d4 })),
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
   * @param {string} moodId
   * @param {string} displayBlob
   * @param {number|null} [diceTotal] Physical roll total if known; else mood d4 is stored.
   */
  static async #applyAttunementOutcome(app, actor, moodId, displayBlob, diceTotal = null) {
    const mood = ATTUNEMENT_MOOD_BY_ID[moodId];
    if (!mood) return;
    app._attunementRollTotal =
      typeof diceTotal === "number" && Number.isFinite(diceTotal) ? diceTotal : mood.d4;
    app._attunementMoodId = moodId;

    const maxLv = getMaxLeveledSpellSlot(actor);
    await swapAttunementToMood(actor, moodId);
    await deleteAttunementBracketSpells(actor);
    if (mood.spell) {
      const spellUuid = await phbSpellUuidByName(mood.spell);
      if (spellUuid)
        await grantPreparedSpell(actor, mood.spell, mood.label, spellUuid, maxLv, app.shamanClass);
      else ui.notifications.warn(`Could not resolve PHB spell: ${mood.spell}`);
    }

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
    const moodId = target.dataset.moodId;
    if (!moodId || !ATTUNEMENT_MOOD_BY_ID[moodId]) return;
    const app = /** @type {ShamanRitualApplication} */ (this);
    const actor = game.actors.get(app.actor.id) ?? app.actor;
    const mood = ATTUNEMENT_MOOD_BY_ID[moodId];
    const displayBlob = `<p><strong>${mood.label}</strong> (debug d${mood.d4})</p>`;
    await ShamanRitualApplication.#applyAttunementOutcome(app, actor, moodId, displayBlob, mood.d4);
  }

  static async #onRollAttunement(_event, _target) {
    const app = /** @type {ShamanRitualApplication} */ (this);
    const actor = game.actors.get(app.actor.id) ?? app.actor;
    const table = await fromUuid(ATTUNEMENT_TABLE_UUID);
    if (!table || table.documentName !== "RollTable") {
      ui.notifications.error("Attunement Ritual table not found.");
      return;
    }
    const draw = await table.draw({ displayChat: true, rollMode: CONST.DICE_ROLL_MODES.PUBLIC });
    const texts = Array.from(draw.results ?? []).map((r) => r.text ?? r.name ?? "");
    const blob = texts.join(" ").trim();
    const rt = draw.roll?.total;
    const rollTotal = typeof rt === "number" && Number.isFinite(rt) ? rt : null;

    const moodId = parseAttunementMood(blob, rollTotal);
    if (!moodId) {
      ui.notifications.error("Could not determine attunement mood from the table result.");
      app.render();
      return;
    }

    await ShamanRitualApplication.#applyAttunementOutcome(app, actor, moodId, blob, rollTotal);
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
  await removeAllShamanAttunementEffects(live);

  const scales = shamanClass.scaleValues ?? {};
  const guaranteed = numericFromScaleEntry(
    scales["guaranteed-active-spirits"] ?? scales["guaranteedactivespirits"]
  );
  const rollCount = numericFromScaleEntry(scales["active-spirit-rolls"] ?? scales["activespiritrolls"]);
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

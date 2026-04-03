/**
 * Totem Pole: build a totem NPC from Haida Infusion choices, then place a token (Foundry v14 + dnd5e).
 */
const MODULE_ID = "falcrests-machinations-of-madness";

const UUID_IN_DESC_PATTERN = /@UUID\[([^\]]+)\]/g;
const SECTIONS_COST_PATTERN = /Sections\s+used\s+by\s+Infusion\s*:\s*(\d+)/i;
const REPEATABLE_PATTERN = /Repeatable\s*:\s*(Yes|No)/i;
const BUDGET_PATTERNS = [
  /(?:^|\n)\s*(?:Totem\s+)?sections?\s*(?:allowed|available|limit)\s*:\s*(\d+)/i,
  /(?:^|\n)\s*Section\s+budget\s*:\s*(\d+)/i
];

/** World / compendium document id for the Totem Pole class feature (only this item opens the builder). */
const TOTEM_POLE_ITEM_ID = "UCsq7EjMBZwWPkUA";
const TOTEM_POLE_COMPENDIUM_UUID = `Compendium.${MODULE_ID}.fmom-classes.Item.${TOTEM_POLE_ITEM_ID}`;

/** Fable of the Totem Bearer - Ethereal Construction (spell slots for optional construction effects). */
const ETHEREAL_CONSTRUCTION_ITEM_ID = "7Dvv3BdkjSKwFJTO";
const ETHEREAL_CONSTRUCTION_COMPENDIUM_UUID = `Compendium.${MODULE_ID}.fmom-classes.Item.${ETHEREAL_CONSTRUCTION_ITEM_ID}`;

/** Fable of the Totem Bearer - Ethereal Convergence (5th-level slot for a second totem, one Totem Pole use). */
const ETHEREAL_CONVERGENCE_ITEM_ID = "aZhVJzzJyd1HZdOz";
const ETHEREAL_CONVERGENCE_COMPENDIUM_UUID = `Compendium.${MODULE_ID}.fmom-classes.Item.${ETHEREAL_CONVERGENCE_ITEM_ID}`;

/** Default stat-block actor; module setting overrides when non-empty. */
const DEFAULT_TOTEM_ACTOR_UUID = `Compendium.${MODULE_ID}.fmom-actors.Actor.iTZ6525rtH7sH79m`;

const TOTEMS_FOLDER_NAME = "Totems";

const SCALE_REF_REGEX = /@scale\.([a-z0-9-]+)\.([a-z0-9-]+)/gi;

/** @type {Set<string>} */
const _totemCleanupScheduled = new Set();

const TOTEM_MAGIC_REGION_COLOR = "#495a3f";
/** Ethereal Convergence: second totem’s region (warm orange, distinct from A’s olive). */
const TOTEM_MAGIC_REGION_COLOR_B = "#c4682a";

/** Infusion auras applied via Totem Magic region (`applyActiveEffect`). Match exact name, word-boundary substring, or `flags[MODULE_ID].totemInfusionAura`. */
const TOTEM_INFUSION_AURA_NAMES = /** @type {const} */ (["Blood", "Elements", "Purity", "Thorns", "Swiftness"]);

/**
 * Default audience for each canonical infusion. Override on the template ActiveEffect with
 * `flags[MODULE_ID].totemAuraTarget = "allies" | "enemies"` (e.g. future hostile auras).
 */
const TOTEM_AURA_DEFAULT_TARGET_BY_CANONICAL = {
  blood: "allies",
  elements: "allies",
  purity: "allies",
  thorns: "allies",
  swiftness: "allies"
};

function coreSupportsApplyActiveEffectRegionBehavior() {
  // Foundry v14 registers models on CONFIG.RegionBehavior.dataModels (not CONFIG.Canvas.regionBehaviors).
  return Boolean(
    CONFIG?.RegionBehavior?.dataModels?.applyActiveEffect ||
      CONFIG?.Canvas?.regionBehaviors?.applyActiveEffect
  );
}

/** When ActiveAuras is on, Totem Magic uses AA instead of core region `applyActiveEffect` behaviors. */
function isActiveAurasModuleEnabled() {
  try {
    return Boolean(game.modules?.get("ActiveAuras")?.active);
  } catch {
    return false;
  }
}

/**
 * @param {ActiveEffect} effect
 * @returns {string|null} lowercase canonical key, e.g. "blood"
 */
function canonicalTotemInfusionAuraName(effect) {
  const flag = effect.flags?.[MODULE_ID]?.totemInfusionAura;
  if (typeof flag === "string") {
    const low = flag.trim().toLowerCase();
    if (TOTEM_INFUSION_AURA_NAMES.some((x) => x.toLowerCase() === low)) return low;
  }
  const rawName = (effect.name ?? "").trim();
  const n = rawName.toLowerCase();
  for (const x of TOTEM_INFUSION_AURA_NAMES) {
    const xl = x.toLowerCase();
    if (n === xl || n.startsWith(`${xl} `) || n.startsWith(`${xl}:`)) return xl;
    try {
      if (new RegExp(`\\b${xl}\\b`, "i").test(rawName)) return xl;
    } catch {
      /* ignore bad pattern */
    }
  }
  return null;
}

/** @param {ActiveEffect} template */
function totemAuraTargetModeForTemplate(template) {
  const f = template?.flags?.[MODULE_ID]?.totemAuraTarget;
  if (f === "enemies" || f === "allies") return f;
  const c = canonicalTotemInfusionAuraName(template);
  if (c && TOTEM_AURA_DEFAULT_TARGET_BY_CANONICAL[c]) return TOTEM_AURA_DEFAULT_TARGET_BY_CANONICAL[c];
  return "allies";
}

/**
 * Infusion aura templates for the Totem Magic region. Elements may repeat (one effect UUID per item);
 * other canons use the first matching effect on the actor, then first per canon from items.
 * @param {Actor} totem
 * @returns {ActiveEffect[]}
 */
function collectTotemInfusionAuraEffects(totem) {
  if (!(totem instanceof Actor)) return [];
  const seenUuids = new Set();
  /** @type {Set<string>} */
  const canonFilled = new Set();
  /** @type {ActiveEffect[]} */
  const out = [];

  const consider = (e) => {
    const c = canonicalTotemInfusionAuraName(e);
    if (!c || seenUuids.has(e.uuid)) return;
    if (c === "elements") {
      seenUuids.add(e.uuid);
      out.push(e);
      return;
    }
    if (canonFilled.has(c)) return;
    seenUuids.add(e.uuid);
    canonFilled.add(c);
    out.push(e);
  };

  for (const e of totem.effects ?? []) consider(e);
  for (const item of totem.items ?? []) {
    for (const e of item.effects ?? []) consider(e);
  }
  return out;
}

/**
 * @param {Actor} totem
 * @returns {Record<string, unknown>[]}
 */
function buildTotemMagicRegionAuraBehaviors(totem) {
  if (isActiveAurasModuleEnabled()) return [];
  if (!coreSupportsApplyActiveEffectRegionBehavior()) return [];
  const uuids = collectTotemInfusionAuraEffects(totem)
    .map((e) => e.uuid)
    .filter(Boolean);
  if (!uuids.length) return [];
  return [
    {
      name: "Totem infusion auras",
      type: "applyActiveEffect",
      system: { effects: uuids },
      disabled: false
    }
  ];
}

/**
 * Drop ActiveAuras flags from infusion templates so that module does not duplicate native region auras.
 * @param {Actor} totem
 */
async function stripActiveAurasFlagsFromTotemInfusionAuras(totem) {
  if (!(totem instanceof Actor)) return;
  for (const e of collectTotemInfusionAuraEffects(totem)) {
    const flags = foundry.utils.duplicate(e.flags ?? {});
    if (!flags.ActiveAuras) continue;
    delete flags.ActiveAuras;
    try {
      await e.update({ flags });
    } catch (err) {
      console.warn(`FMoM Totem: could not strip ActiveAuras flags from effect "${e.name}"`, err);
    }
  }
}

/**
 * ActiveAuras reads `flags.ActiveAuras.radius` (feet) and skips disabled effects - keep templates enabled and sync radius.
 * @param {Actor} totem
 * @param {number} radiusFeet
 */
async function applyActiveAurasTotemMagicRadiusToInfusionAuras(totem, radiusFeet) {
  if (!(totem instanceof Actor) || !isActiveAurasModuleEnabled()) return;
  const r = Number(radiusFeet);
  if (!Number.isFinite(r) || r <= 0) return;

  for (const e of collectTotemInfusionAuraEffects(totem)) {
    const flags = foundry.utils.duplicate(e.flags ?? {});
    const aa = foundry.utils.mergeObject(flags.ActiveAuras ?? {}, {
      isAura: true,
      radius: String(Math.round(r))
    });
    if (!aa.aura) {
      const mode = totemAuraTargetModeForTemplate(e);
      aa.aura = mode === "enemies" ? "Enemy" : "Allies";
    }
    flags.ActiveAuras = aa;
    try {
      await e.update({ disabled: false, flags });
    } catch (err) {
      console.warn(`FMoM Totem: could not set ActiveAuras radius on "${e.name}"`, err);
    }
  }
}

/**
 * Infusion aura templates live on the totem’s items for region duplication; keep them disabled on the totem itself.
 * @param {Actor} totem
 */
async function disableTotemInfusionAuraTemplatesOnTotem(totem) {
  if (!(totem instanceof Actor)) return;
  for (const e of collectTotemInfusionAuraEffects(totem)) {
    if (e.disabled) continue;
    try {
      await e.update({ disabled: true });
    } catch (err) {
      console.warn(`FMoM Totem: could not disable infusion aura template "${e.name}" on totem`, err);
    }
  }
}

/**
 * Rules for ActiveEffects duplicated from a Totem Magic region onto an actor.
 * @param {object} opts
 * @param {string} [opts.origin] Effect origin UUID (region).
 * @param {Actor|null|undefined} opts.targetActor
 * @param {string} [opts.duplicateSource] Template effect UUID (_stats.duplicateSource).
 * @returns {{ type: "na" } | { type: "block" } | { type: "allow", patch: Record<string, unknown> }}
 */
function classifyTotemMagicAuraClone(opts) {
  const { origin, targetActor, duplicateSource } = opts;
  try {
    if (!origin || typeof origin !== "string") return { type: "na" };
    const syncFrom = globalThis.fromUuidSync;
    if (typeof syncFrom !== "function") return { type: "na" };
    const region = syncFrom(origin);
    if (!region || region.documentName !== "Region") return { type: "na" };
    if (!region.getFlag?.(MODULE_ID, "totemMagicAura")) return { type: "na" };

    const scene = region.parent;
    const att = region.attachment?.token;
    const tokenId =
      (att && typeof att === "object" && "id" in att ? att.id : null) ??
      (typeof att === "string" ? att : null) ??
      region._source?.attachment?.token ??
      null;

    const totemTok = tokenId && scene?.tokens?.get ? scene.tokens.get(tokenId) : null;

    let totemActorId = totemTok?.actor?.id ?? totemTok?.actorId ?? null;
    if (!totemActorId && tokenId && scene) {
      const td = scene.tokens.get(tokenId);
      totemActorId = td?.actor?.id ?? td?.actorId ?? null;
    }

    if (!(targetActor instanceof Actor)) return { type: "na" };
    if (!totemActorId) return { type: "na" };

    if (targetActor.id === totemActorId) return { type: "block" };

    const dup = typeof duplicateSource === "string" ? duplicateSource : "";
    /** @type {ActiveEffect|null} */
    let template = null;
    if (dup) {
      const t = syncFrom(dup);
      template = t instanceof ActiveEffect ? t : null;
      if (!template) return { type: "na" };
    }

    // Persisted clones may drop _stats.duplicateSource; default to allies-only rule (all current Haida auras).
    const mode = template ? totemAuraTargetModeForTemplate(template) : "allies";
    const recv = scene?.tokens?.find?.((t) => t.actor?.id === targetActor.id);
    const totDisp = totemTok?.disposition;
    const recDisp = recv?.disposition;
    if (totDisp === undefined || recDisp === undefined) return { type: "block" };

    if (mode === "allies") {
      if (recDisp !== totDisp) return { type: "block" };
    } else if (mode === "enemies") {
      if (recDisp === totDisp) return { type: "block" };
    }

    const showAlways =
      typeof CONST !== "undefined" && CONST.ACTIVE_EFFECT_SHOW_ICON
        ? CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS
        : undefined;
    /** @type {Record<string, unknown>} */
    const patch = { disabled: false };
    if (showAlways !== undefined) patch.showIcon = showAlways;
    return { type: "allow", patch };
  } catch {
    return { type: "na" };
  }
}

/**
 * Block Totem Magic region clones onto the totem or wrong disposition (ally vs enemy).
 * For allowed recipients, request enabled effects + icon (dnd5e may ignore preCreate merges).
 * @param {ActiveEffect} doc
 * @param {object} data
 */
function totemMagicRegionActiveEffectPreCreate(doc, data) {
  const dup = foundry.utils.getProperty(data, "_stats.duplicateSource");
  const h = classifyTotemMagicAuraClone({
    origin: data?.origin,
    targetActor: doc.parent,
    duplicateSource: dup
  });
  if (h.type === "block") return false;
  if (h.type === "allow" && h.patch) foundry.utils.mergeObject(data, h.patch);
  return true;
}

/**
 * Ensure region-applied clones are active: core/dnd5e often re-applies template `disabled` after preCreate.
 * @param {ActiveEffect} doc
 * @param {object} _options
 * @param {string} _userId
 */
function totemMagicRegionActiveEffectOnCreate(doc, _options, _userId) {
  try {
    if (!(doc instanceof ActiveEffect) || !(doc.parent instanceof Actor)) return;
    const dup =
      (typeof doc._stats?.duplicateSource === "string" && doc._stats.duplicateSource) ||
      foundry.utils.getProperty(doc, "_stats.duplicateSource") ||
      "";
    const h = classifyTotemMagicAuraClone({
      origin: doc.origin,
      targetActor: doc.parent,
      duplicateSource: dup
    });
    if (h.type !== "allow" || !h.patch) return;

    const patch = h.patch;
    /** @type {Record<string, unknown>} */
    const partial = {};
    if (patch.disabled === false && doc.disabled) partial.disabled = false;
    if (patch.showIcon !== undefined && doc.showIcon !== patch.showIcon) partial.showIcon = patch.showIcon;
    if (!Object.keys(partial).length) return;

    const run = () => {
      doc.update(partial).catch((err) => {
        console.warn("FMoM Totem: could not enable Totem Magic aura clone on actor", err);
      });
    };
    if (typeof queueMicrotask === "function") queueMicrotask(run);
    else setTimeout(run, 0);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

Hooks.once("init", () => {
  Hooks.on("preCreateActiveEffect", (doc, data, _options, _userId) => totemMagicRegionActiveEffectPreCreate(doc, data));
  Hooks.on("createActiveEffect", totemMagicRegionActiveEffectOnCreate);

  game.settings.register(MODULE_ID, "totemTemplateActorUuid", {
    name: "Totem actor template (override)",
    hint: "Leave empty to use the module’s default totem actor from the Actors compendium. Set a different Actor UUID to replace the base stat block.",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "defaultSectionBudget", {
    name: "Default section budget (fallback)",
    hint: "If the Totem Pole item has no 'Sections allowed: N' line, use this number. Set to 0 to require the line on the item.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 50, step: 1 },
    default: 0
  });

});

Hooks.once("ready", async () => {
  await ensureTotemsActorFolder();
  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("deleteDocument", onDeleteDocumentMaybeRemoveTotemActor);
  Hooks.on("deleteToken", onDeleteTokenMaybeRemoveTotemActor);
});

/**
 * @returns {string|null}
 */
function getTotemsActorFolderId() {
  const f = game.folders?.find((x) => x.type === "Actor" && x.name === TOTEMS_FOLDER_NAME);
  return f?.id ?? null;
}

async function ensureTotemsActorFolder() {
  if (!game.user?.isGM) return;
  if (getTotemsActorFolderId()) return;
  try {
    await Folder.create({ name: TOTEMS_FOLDER_NAME, type: "Actor", sorting: "a" });
  } catch (err) {
    console.warn("FMoM Totem: could not create Totems folder (it may already exist).", err);
  }
}

/**
 * Other tokens on any scene still using this actor (excluding the token being removed).
 * @param {string} actorId
 * @param {string} deletedTokenId
 */
function countOtherTokensForActor(actorId, deletedTokenId) {
  let n = 0;
  for (const scene of game.scenes) {
    for (const t of scene.tokens) {
      if (t.actorId === actorId && t.id !== deletedTokenId) n++;
    }
  }
  return n;
}

/**
 * @param {foundry.documents.TokenDocument} document
 */
function onDeleteDocumentMaybeRemoveTotemActor(document) {
  const docName = document?.documentName ?? document?.constructor?.metadata?.name;
  if (docName !== "Token") return;
  scheduleTotemActorCleanupIfLastToken(document.actorId, document.id);
}

/**
 * Targeted delete hook (`deleteToken`): arg may be Token placeable or TokenDocument by version.
 * @param {foundry.canvas.placeables.Token|foundry.documents.TokenDocument} tokenOrDoc
 */
function onDeleteTokenMaybeRemoveTotemActor(tokenOrDoc) {
  const doc = tokenOrDoc?.document ?? tokenOrDoc;
  if (!doc?.actorId || !doc.id) return;
  scheduleTotemActorCleanupIfLastToken(doc.actorId, doc.id);
}

/**
 * @param {string|null|undefined} actorId
 * @param {string|null|undefined} deletedTokenId
 */
function scheduleTotemActorCleanupIfLastToken(actorId, deletedTokenId) {
  if (!actorId || !deletedTokenId) return;
  if (!game.user?.isGM) return;

  const dedupe = `${actorId}::${deletedTokenId}`;
  if (_totemCleanupScheduled.has(dedupe)) return;
  _totemCleanupScheduled.add(dedupe);

  queueMicrotask(async () => {
    try {
      const actor = game.actors.get(actorId);
      if (!actor?.getFlag?.(MODULE_ID, "totemInstance")) return;
      if (countOtherTokensForActor(actorId, deletedTokenId) > 0) return;
      await actor.delete();
    } catch (err) {
      console.error("FMoM Totem: could not delete totem actor after token removal.", err);
    } finally {
      _totemCleanupScheduled.delete(dedupe);
    }
  });
}

/**
 * @param {*} cr
 * @returns {number|null}
 */
function parseCrLikeValue(cr) {
  if (cr == null) return null;
  if (typeof cr === "object" && cr !== null && "value" in cr) return parseCrLikeValue(cr.value);
  if (typeof cr === "number" && Number.isFinite(cr)) return cr;
  if (typeof cr === "string") {
    const s = cr.trim();
    if (!s) return null;
    if (s.includes("/")) {
      const [a, b] = s.split("/").map((x) => Number(String(x).trim()));
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getCrValueFromShamanForTotem(shaman) {
  if (shaman.type === "character") {
    const lv = foundry.utils.getProperty(shaman, "system.details.level");
    const n = typeof lv === "number" ? lv : Number(lv);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (shaman.type === "npc") {
    const parsed = parseCrLikeValue(foundry.utils.getProperty(shaman, "system.details.cr"));
    if (parsed != null) return parsed;
  }
  const lvFallback = Number(foundry.utils.getProperty(shaman, "system.details.level"));
  if (Number.isFinite(lvFallback) && lvFallback >= 0) return lvFallback;
  const crFallback = parseCrLikeValue(foundry.utils.getProperty(shaman, "system.details.cr"));
  return crFallback;
}

/**
 * Copy Wisdom and match totem CR to the shaman’s level (PC) or CR (NPC).
 * @param {Actor} totem
 * @param {Actor} shaman
 */
async function applyShamanStatsToTotem(totem, shaman) {
  const wisRaw = foundry.utils.getProperty(shaman, "system.abilities.wis.value");
  const wis = typeof wisRaw === "number" ? wisRaw : Number(wisRaw);
  const crValue = getCrValueFromShamanForTotem(shaman);
  /** @type {Record<string, unknown>} */
  const updates = {};
  if (Number.isFinite(wis)) updates["system.abilities.wis.value"] = wis;
  if (crValue != null && Number.isFinite(crValue)) updates["system.details.cr"] = crValue;
  if (Object.keys(updates).length) await totem.update(updates);
}

/**
 * Best-effort shaman level for Totem Health calculations.
 * For PCs use character level; for NPCs fall back to CR-like value.
 * @param {Actor} shaman
 * @returns {number|null}
 */
function getShamanLevelForTotemHealth(shaman) {
  if (!shaman) return null;
  if (shaman.type === "character") {
    const lv = foundry.utils.getProperty(shaman, "system.details.level");
    const n = typeof lv === "number" ? lv : Number(lv);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const fromCr = getCrValueFromShamanForTotem(shaman);
  return Number.isFinite(fromCr) && fromCr >= 0 ? fromCr : null;
}

/**
 * @param {Item5e} item
 * @param {string} activityId
 * @returns {object|null}
 */
function getTotemActivityById(item, activityId) {
  if (!activityId || !item?.system?.activities) return null;
  const coll = item.system.activities;
  if (typeof coll.get === "function") {
    const byGet = coll.get(activityId);
    if (byGet) return byGet;
  }
  const raw = coll[activityId];
  if (raw) return raw;
  for (const activity of iterateItemActivities(item)) {
    const id = activity.id ?? activity._id;
    if (id === activityId) return activity;
  }
  return null;
}

/**
 * @param {*} activity
 */
function activityUsesCanDecrement(activity) {
  const au = activity?.uses;
  if (!au || typeof au !== "object") return false;
  const val = typeof au.value === "number" ? au.value : Number(au.value);
  if (Number.isFinite(val) && val >= 1) return true;
  const maxRaw = au.max;
  const max = typeof maxRaw === "number" ? maxRaw : Number(maxRaw);
  const spent = Number(au.spent ?? 0);
  if (!Number.isFinite(spent) || spent < 0) return false;
  if (Number.isFinite(max) && max > 0 && spent < max) return true;
  return false;
}

/**
 * @param {Item5e} item
 */
function* iterateItemActivities(item) {
  const coll = item?.system?.activities;
  if (!coll) return;
  if (typeof coll[Symbol.iterator] === "function") {
    for (const a of coll) yield a;
    return;
  }
  if (typeof coll.values === "function") {
    for (const a of coll.values()) yield a;
    return;
  }
  if (typeof coll === "object") {
    for (const a of Object.values(coll)) {
      if (a && typeof a === "object") yield a;
    }
  }
}

/**
 * dnd5e 5.x: uses are stored as `uses.spent`; `uses.value` is derived (max − spent).
 * Uses are often on the **activity** you clicked (Utility, etc.), not `item.system.uses`.
 * @param {Item5e} item
 * @param {string} [preferredActivityId] Activity id from `preUseActivity` (strongly recommended).
 * @returns {Record<string, unknown>|null}
 */
function buildTotemPoleUseConsumePatch(item, preferredActivityId) {
  if (preferredActivityId) {
    const act = getTotemActivityById(item, preferredActivityId);
    if (act && activityUsesCanDecrement(act)) {
      const s = Number(act.uses.spent ?? 0);
      if (!Number.isFinite(s) || s < 0) return null;
      return { [`system.activities.${preferredActivityId}.uses.spent`]: s + 1 };
    }
  }

  const u = item.system?.uses;
  if (u) {
    const spent = Number(u.spent ?? 0);
    const value = typeof u.value === "number" ? u.value : Number(u.value);
    const maxNum = typeof u.max === "number" ? u.max : Number(u.max);
    const hasNumericMax = Number.isFinite(maxNum) && maxNum > 0;
    const limited =
      item.system?.hasLimitedUses === true || hasNumericMax || (u.max != null && u.max !== "");
    if (limited) {
      if (Number.isFinite(value) && value < 1) return null;
      if (!Number.isFinite(spent) || spent < 0) return null;
      return { "system.uses.spent": spent + 1 };
    }
  }

  for (const activity of iterateItemActivities(item)) {
    const id = activity.id ?? activity._id;
    if (!id || !activityUsesCanDecrement(activity)) continue;
    const aspent = Number(activity.uses.spent ?? 0);
    if (!Number.isFinite(aspent) || aspent < 0) continue;
    return { [`system.activities.${id}.uses.spent`]: aspent + 1 };
  }

  return null;
}

/**
 * Turn flat `system.*` keys into `{ system: nested }` for embedded Item updates when dotted keys fail.
 * @param {string} itemId
 * @param {Record<string, unknown>} patch
 * @returns {{ _id: string, system: object }|null}
 */
function totemPolePatchToNestedSystemUpdate(itemId, patch) {
  /** @type {Record<string, unknown>} */
  const systemFlat = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k.startsWith("system.")) systemFlat[k.slice(7)] = v;
  }
  if (foundry.utils.isEmpty(systemFlat)) return null;
  return { _id: itemId, system: foundry.utils.expandObject(systemFlat) };
}

/**
 * Resolve embedded item like `Actor.3vD1ExtbWMR24Tuy.Item.uS6oS3rsWgcaonUp`.
 * @param {Actor} actor
 * @param {string} itemId
 * @returns {Promise<Item5e|null>}
 */
async function resolveActorEmbeddedItem(actor, itemId) {
  let item = actor.items.get(itemId);
  if (item) return item;
  const rel = `Actor.${actor.id}.Item.${itemId}`;
  try {
    if (typeof fromUuidSync === "function") {
      const doc = fromUuidSync(rel, { strict: false });
      if (doc instanceof Item) return doc;
    }
  } catch {
    /* ignore */
  }
  try {
    const doc = await fromUuid(rel);
    return doc instanceof Item ? doc : null;
  } catch {
    return null;
  }
}

/**
 * Spend one use on the Totem Pole item embedded on the actor.
 * @param {Actor} actor
 * @param {string} itemId  Embedded item id (world id, not compendium).
 * @param {string} [activityId] Activity that was used (from `preUseActivity`).
 * @returns {Promise<boolean>}
 */
async function consumeTotemPoleItemUse(actor, itemId, activityId) {
  const liveActor = game.actors.get(actor.id) ?? actor;
  const item = await resolveActorEmbeddedItem(liveActor, itemId);
  if (!item) {
    ui.notifications.warn("Could not find the Totem Pole item on this actor to spend a use.");
    return false;
  }

  const patch = buildTotemPoleUseConsumePatch(item, activityId);
  if (!patch || foundry.utils.isEmpty(patch)) {
    ui.notifications.warn("Totem Pole has no spendable uses (item or activity uses).");
    return false;
  }

  const flatDoc = { _id: itemId, ...patch };
  const nestedDoc = totemPolePatchToNestedSystemUpdate(itemId, patch);

  try {
    await liveActor.updateEmbeddedDocuments("Item", [flatDoc]);
    return true;
  } catch (err1) {
    console.warn("FMoM Totem: updateEmbeddedDocuments (flat) failed", err1);
    if (nestedDoc) {
      try {
        await liveActor.updateEmbeddedDocuments("Item", [nestedDoc]);
        return true;
      } catch (errNest) {
        console.warn("FMoM Totem: updateEmbeddedDocuments (nested system) failed", errNest);
      }
    }
    try {
      await item.update(patch);
      return true;
    } catch (err2) {
      if (nestedDoc) {
        try {
          await item.update({ system: nestedDoc.system });
          return true;
        } catch (err3) {
          console.error("FMoM Totem: could not spend a use.", err3);
        }
      } else {
        console.error("FMoM Totem: could not spend a use.", err2);
      }
      ui.notifications.error("Could not spend a Totem Pole use.");
      return false;
    }
  }
}

/**
 * @param {Activity} activity
 * @param {object} usageConfig
 * @param {object} dialogConfig
 * @param {object} messageConfig
 * @returns {boolean|void}
 */
function onPreUseActivity(activity, usageConfig, dialogConfig, messageConfig) {
  const item = activity.item ?? activity.parent;
  if (!item || !isTotemPoleItem(item)) return;

  const actor = activity.actor ?? item.parent;
  if (!(actor instanceof Actor)) return;
  if (!actor.isOwner && !game.user.isGM) return;

  queueMicrotask(() => {
    TotemBuilderApplication.open({
      character: actor,
      totemItem: item,
      totemItemId: item.id,
      totemActivityId: activity.id,
      usageConfig
    }).catch((err) => {
      console.error(err);
      ui.notifications.error("Totem builder failed to open. See console (F12).");
    });
  });

  return false;
}

/**
 * @param {Item5e} item
 */
function isTotemPoleItem(item) {
  if (!item) return false;
  if (item.id === TOTEM_POLE_ITEM_ID) return true;
  const src = item._stats?.compendiumSource ?? item.flags?.core?.sourceId ?? "";
  if (typeof src === "string") {
    if (src === TOTEM_POLE_COMPENDIUM_UUID) return true;
    if (src.endsWith(`.Item.${TOTEM_POLE_ITEM_ID}`)) return true;
  }
  const uuid = item.uuid ?? "";
  return uuid.includes(TOTEM_POLE_ITEM_ID);
}

/**
 * @param {Item5e} item
 * @param {string} compendiumItemId
 */
function itemMatchesCompendiumId(item, compendiumItemId) {
  if (!item || !compendiumItemId) return false;
  if (item.id === compendiumItemId) return true;
  const src = item._stats?.compendiumSource ?? item.flags?.core?.sourceId ?? "";
  if (typeof src === "string") {
    if (src.endsWith(`.Item.${compendiumItemId}`)) return true;
    if (src.includes(`.Item.${compendiumItemId}`)) return true;
  }
  const uuid = item.uuid ?? "";
  return uuid.includes(compendiumItemId);
}

/**
 * @param {Actor} actor
 * @param {string} compendiumItemId
 */
function actorHasCompendiumClassFeature(actor, compendiumItemId) {
  if (!(actor instanceof Actor) || !compendiumItemId) return false;
  for (const item of actor.items ?? []) {
    if (itemMatchesCompendiumId(item, compendiumItemId)) return true;
  }
  return false;
}

/**
 * Snapshot of leveled spell slots (dnd5e `system.spells.spellN`).
 * @param {Actor} actor
 * @returns {Record<number, { value: number, max: number }>}
 */
function getLeveledSpellSlotSnapshot(actor) {
  const spells = actor?.system?.spells ?? {};
  /** @type {Record<number, { value: number, max: number }>} */
  const out = {};
  for (let lvl = 1; lvl <= 9; lvl++) {
    const slot = spells[`spell${lvl}`];
    if (!slot || typeof slot !== "object") continue;
    const max = Number(slot.max ?? 0);
    const value = Number(slot.value ?? 0);
    if (!Number.isFinite(max) || max <= 0) continue;
    out[lvl] = {
      value: Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0,
      max
    };
  }
  return out;
}

/**
 * @param {Record<number, { value: number, max: number }>} snap
 * @returns {Record<number, number>}
 */
function spellSlotValuesRemaining(snap) {
  /** @type {Record<number, number>} */
  const rem = {};
  for (const [k, v] of Object.entries(snap)) {
    const L = Number(k);
    if (!Number.isFinite(L)) continue;
    rem[L] = Number(v?.value ?? 0) || 0;
  }
  return rem;
}

/**
 * Ways to spend spell slots so the **sum of chosen slot levels** equals `targetSum`
 * (e.g. two Ethereal Construction toggles → sum 2 → two 1st-level slots or one 2nd-level slot).
 * @param {Record<number, number>} remaining counts per spell level
 * @param {number} targetSum
 * @returns {number[][]} sorted multisets of slot levels to expend
 */
function enumerateSpellSlotLevelSumPlans(remaining, targetSum) {
  const t = Math.max(0, Math.floor(Number(targetSum) || 0));
  if (t === 0) return [[]];

  /** @type {number[][]} */
  const raw = [];

  /** @param {Record<number, number>} rem */
  function dfs(rem, path, sum) {
    if (sum === t) {
      raw.push([...path].sort((a, b) => a - b));
      return;
    }
    if (sum > t) return;
    for (let L = 1; L <= 9; L++) {
      if ((rem[L] ?? 0) <= 0) continue;
      if (sum + L > t) continue;
      rem[L]--;
      path.push(L);
      dfs(rem, path, sum + L);
      path.pop();
      rem[L]++;
    }
  }

  dfs({ ...remaining }, [], 0);

  const seen = new Set();
  /** @type {number[][]} */
  const uniq = [];
  for (const arr of raw) {
    const key = arr.join("+");
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(arr);
  }
  uniq.sort((a, b) => {
    const sa = a.join(","),
      sb = b.join(",");
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
  return uniq;
}

/**
 * Smallest total spell-level sum achievable with remaining slots that is still ≥ n (overspend when exact n is impossible).
 * @param {Record<number, number>} remaining
 * @param {number} n
 * @returns {number|null}
 */
function findMinSpellLevelSumAtLeast(remaining, n) {
  const t = Math.max(0, Math.floor(Number(n) || 0));
  if (t === 0) return 0;
  let minFound = Infinity;
  /** @param {Record<number, number>} rem */
  function dfs(rem, sum) {
    if (sum >= t) {
      minFound = Math.min(minFound, sum);
      return;
    }
    for (let L = 1; L <= 9; L++) {
      if ((rem[L] ?? 0) <= 0) continue;
      rem[L]--;
      dfs(rem, sum + L);
      rem[L]++;
    }
  }
  dfs({ ...remaining }, 0);
  return minFound === Infinity ? null : minFound;
}

/**
 * @param {number[][]} all
 * @returns {number[][]}
 */
function minimalSpellLevelSumPlansFromList(all) {
  if (!all.length) return [];
  const maxOf = (p) => (p.length ? Math.max(...p) : 0);
  const minMax = Math.min(...all.map((p) => maxOf(p)));
  const narrowed = all.filter((p) => maxOf(p) === minMax);
  const minCount = Math.min(...narrowed.map((p) => p.length));
  return narrowed.filter((p) => p.length === minCount);
}

/**
 * Among exact `targetSum` plans, prefer lowest max slot level then fewest slots.
 * @param {Record<number, number>} remaining
 * @param {number} targetSum
 * @returns {number[][]}
 */
function minimalSpellLevelSumPlans(remaining, targetSum) {
  return minimalSpellLevelSumPlansFromList(enumerateSpellSlotLevelSumPlans(remaining, targetSum));
}

/**
 * Pay exactly `effectCount` spell levels if possible; otherwise smallest overspend (e.g. one toggle, no 1sts → one 2nd-level slot).
 * @param {Record<number, number>} remaining
 * @param {number} effectCount
 */
function minimalSpellSlotSpendPlans(remaining, effectCount) {
  const n = Math.max(0, Math.floor(Number(effectCount) || 0));
  if (n === 0) return [[]];
  let plans = enumerateSpellSlotLevelSumPlans(remaining, n);
  if (plans.length) return minimalSpellLevelSumPlansFromList(plans);
  const minSum = findMinSpellLevelSumAtLeast(remaining, n);
  if (minSum == null) return [];
  plans = enumerateSpellSlotLevelSumPlans(remaining, minSum);
  return minimalSpellLevelSumPlansFromList(plans);
}

/**
 * @param {number} n 1–9
 */
function ordinalSpellLevelEn(n) {
  const k = Math.trunc(Number(n) || 0);
  if (k <= 0) return String(n);
  const suf =
    k % 100 >= 11 && k % 100 <= 13
      ? "th"
      : k % 10 === 1
        ? "st"
        : k % 10 === 2
          ? "nd"
          : k % 10 === 3
            ? "rd"
            : "th";
  return `${k}${suf}`;
}

/**
 * @param {number[]} levels sorted
 */
function formatSpellSlotPlanLabel(levels) {
  if (!levels.length) return "-";
  /** @type {Record<number, number>} */
  const counts = {};
  for (const L of levels) counts[L] = (counts[L] ?? 0) + 1;
  return Object.keys(counts)
    .map((x) => Number(x))
    .sort((a, b) => a - b)
    .map((L) => {
      const n = counts[L];
      return `${n}× ${ordinalSpellLevelEn(L)}-level`;
    })
    .join(" + ");
}

/**
 * @param {Actor} actor
 * @param {number[]} levelsToSpend each entry is a spell level 1–9
 */
async function consumeSpellSlotLevels(actor, levelsToSpend) {
  if (!(actor instanceof Actor) || !levelsToSpend.length) return;
  const snap = getLeveledSpellSlotSnapshot(actor);
  /** @type {Record<number, number>} */
  const needByLevel = {};
  for (const raw of levelsToSpend) {
    const L = Math.trunc(Number(raw) || 0);
    if (L < 1 || L > 9) continue;
    needByLevel[L] = (needByLevel[L] ?? 0) + 1;
  }
  /** @type {Record<string, number>} */
  const updates = {};
  for (const [LStr, need] of Object.entries(needByLevel)) {
    const L = Number(LStr);
    const slot = snap[L];
    const have = Number(slot?.value ?? 0);
    if (!slot || have < need) {
      throw new Error(
        `Not enough ${ordinalSpellLevelEn(L)}-level spell slots (need ${need}, have ${have}).`
      );
    }
    updates[`system.spells.spell${L}.value`] = have - need;
  }
  if (Object.keys(updates).length) await actor.update(updates);
}

/**
 * @param {(app: unknown) => void} fn
 */
function forEachOpenApplication(fn) {
  const seen = new Set();
  const visit = (app) => {
    if (!app || seen.has(app)) return;
    seen.add(app);
    fn(app);
  };
  try {
    if (typeof ui !== "undefined" && ui.windows) {
      for (const app of Object.values(ui.windows)) visit(app);
    }
  } catch {
    /* ignore */
  }
  try {
    const inst = globalThis.foundry?.applications?.instances;
    if (inst && typeof inst.forEach === "function") inst.forEach((app) => visit(app));
  } catch {
    /* ignore */
  }
}

/**
 * @param {unknown} app
 */
function applicationIsNotMinimized(app) {
  if (!app) return false;
  try {
    if (app._minimized === true) return false;
    if (app.minimized === true) return false;
    const el = app.element;
    const node = el?.[0] ?? el;
    if (node?.classList?.contains?.("minimized")) return false;
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * Minimize every rendered application (including the totem builder). Returns apps to restore.
 * @returns {Promise<unknown[]>}
 */
async function minimizeAllOpenApplicationsForTotemPlacement() {
  /** @type {unknown[]} */
  const toRestore = [];
  forEachOpenApplication((app) => {
    try {
      if (app.rendered === false) return;
    } catch {
      /* ignore */
    }
    if (!applicationIsNotMinimized(app)) return;
    if (typeof app.minimize !== "function") return;
    toRestore.push(app);
  });
  for (const app of toRestore) {
    try {
      const r = app.minimize();
      if (r && typeof r.then === "function") await r;
    } catch {
      /* ignore */
    }
  }
  return toRestore;
}

/**
 * @param {unknown[]} apps
 */
async function restoreMinimizedApplications(apps) {
  if (!Array.isArray(apps) || !apps.length) return;
  for (const app of apps) {
    try {
      if (!app) continue;
      if (app.rendered === false) continue;
      if (typeof app.maximize === "function") {
        const r = app.maximize();
        if (r && typeof r.then === "function") await r;
      }
    } catch {
      /* ignore */
    }
  }
}

/**
 * Turn a prepared dnd5e scale entry (DataModel or plain object) into a finite number.
 * @param {*} entry
 * @param {Actor} [actor]
 */
function coerceScaleEntryToNumber(entry, actor) {
  if (entry == null) return NaN;
  if (typeof entry === "number") return Number.isFinite(entry) ? entry : NaN;
  if (typeof entry === "object") {
    if (typeof entry.value === "number") return entry.value;
    if (typeof entry.value === "string" && entry.value.trim() !== "") {
      const rollData = actor?.getRollData?.({ deterministic: true }) ?? {};
      try {
        const r = new Roll(entry.value, rollData);
        if (typeof r.evaluateSync === "function") r.evaluateSync({ strict: false });
        else r.evaluate({ async: false });
        if (Number.isFinite(r.total)) return r.total;
      } catch {
        /* fall through */
      }
      const n = Number(entry.value);
      return Number.isFinite(n) ? n : NaN;
    }
    const formula = entry.formula ?? entry.toString?.();
    if (formula != null && String(formula).trim() !== "") {
      const rollData = actor?.getRollData?.({ deterministic: true }) ?? {};
      try {
        const r = new Roll(String(formula), rollData);
        if (typeof r.evaluateSync === "function") r.evaluateSync({ strict: false });
        else r.evaluate({ async: false });
        if (Number.isFinite(r.total)) return r.total;
      } catch {
        /* fall through */
      }
    }
  }
  const n = Number(entry);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Read section budget from @scale.class.key in the item description, then actor.system.scale.
 * @param {Item5e} item
 * @param {Actor} actor
 */
function budgetFromScaleReferences(item, actor) {
  const desc = item.system?.description?.value ?? "";
  const re = new RegExp(SCALE_REF_REGEX.source, "gi");
  let m;
  while ((m = re.exec(desc)) !== null) {
    const classId = m[1];
    const scaleKey = m[2];
    const entry = foundry.utils.getProperty(actor, `system.scale.${classId}.${scaleKey}`);
    const n = coerceScaleEntryToNumber(entry, actor);
    if (Number.isFinite(n) && n >= 0) return { budget: Math.trunc(n), source: "scale" };
  }
  return null;
}

/**
 * If the class identifier in @scale is not present as text, find `totem-pole-sections` under any prepared scale group.
 * @param {Actor} actor
 */
function budgetFromTotemPoleScaleKey(actor) {
  const all = actor.system?.scale;
  if (!all || typeof all !== "object") return null;
  for (const classId of Object.keys(all)) {
    const block = all[classId];
    if (!block || typeof block !== "object") continue;
    const entry = block["totem-pole-sections"];
    const n = coerceScaleEntryToNumber(entry, actor);
    if (Number.isFinite(n) && n >= 0) return { budget: Math.trunc(n), source: "scale" };
  }
  return null;
}

/**
 * @param {Item5e} item
 */
function isHaidaInfusionItem(item) {
  if (item.type !== "feat") return false;
  if (!item.name?.startsWith("Infusion of ")) return false;
  if (item.getFlag?.(MODULE_ID, "totemInfusion") === true) return true;
  return item.system?.type?.subtype === "haidaInfusion";
}

/**
 * @param {string} html
 */
function parseInfusionDescription(html) {
  const uuids = [];
  let m;
  const re = new RegExp(UUID_IN_DESC_PATTERN.source, "gi");
  while ((m = re.exec(html)) !== null) uuids.push(m[1]);

  const sec = html.match(SECTIONS_COST_PATTERN);
  const rep = html.match(REPEATABLE_PATTERN);
  const sections = sec ? Number(sec[1]) : NaN;
  const repeatable = rep ? rep[1].toLowerCase() === "yes" : true;

  return {
    uuids,
    sections,
    repeatable,
    valid: uuids.length > 0 && Number.isFinite(sections) && sections > 0
  };
}

/**
 * @param {Item5e} item
 * @param {Actor} actor
 */
function resolveTotemSectionBudget(item, actor) {
  const fromScale = budgetFromScaleReferences(item, actor);
  if (fromScale) return fromScale;

  const desc = item.system?.description?.value ?? "";
  for (const pat of BUDGET_PATTERNS) {
    const match = desc.match(pat);
    if (match) return { budget: Number(match[1]), source: "text" };
  }

  const fromKey = budgetFromTotemPoleScaleKey(actor);
  if (fromKey) return fromKey;

  const fallback = Number(game.settings.get(MODULE_ID, "defaultSectionBudget"));
  if (Number.isFinite(fallback) && fallback > 0) return { budget: fallback, source: "settings" };
  return { budget: 0, source: "none" };
}

/** Physical weapon damage types omitted from Elements infusion choices. */
const ELEMENTS_EXCLUDED_DAMAGE_TYPE_IDS = /** @type {const} */ (["bludgeoning", "piercing", "slashing"]);

/** @returns {{ id: string, label: string }[]} */
function getDnd5eDamageTypeIdLabelPairs() {
  const excluded = new Set(ELEMENTS_EXCLUDED_DAMAGE_TYPE_IDS);
  /** @param {{ id: string, label: string }[]} pairs */
  const filter = (pairs) => pairs.filter((p) => p.id && !excluded.has(p.id));

  const dt = globalThis.CONFIG?.DND5E?.damageTypes;
  if (dt && typeof dt === "object") {
    const pairs = Object.entries(dt).map(([id, spec]) => {
      let label = id;
      if (spec && typeof spec === "object") {
        const loc = spec.label;
        if (typeof loc === "string") label = game?.i18n?.localize?.(loc) ?? loc;
      }
      return { id, label };
    });
    return filter(pairs);
  }
  return filter([
    { id: "acid", label: "Acid" },
    { id: "cold", label: "Cold" },
    { id: "fire", label: "Fire" },
    { id: "force", label: "Force" },
    { id: "lightning", label: "Lightning" },
    { id: "necrotic", label: "Necrotic" },
    { id: "poison", label: "Poison" },
    { id: "psychic", label: "Psychic" },
    { id: "radiant", label: "Radiant" },
    { id: "thunder", label: "Thunder" }
  ]);
}

/**
 * @param {string} name
 */
function isElementsInfusionItemName(name) {
  return typeof name === "string" && /\belements\b/i.test(name);
}

/**
 * Set Elements infusion passive effect change values from chosen dnd5e damage type.
 * @param {Item} item
 * @param {string} damageTypeKey
 */
async function applyElementsDamageTypeToTotemItem(item, damageTypeKey) {
  if (!(item instanceof Item) || !damageTypeKey) return;
  const dt = String(damageTypeKey).toLowerCase().trim();
  if (!dt) return;

  const known = new Set(getDnd5eDamageTypeIdLabelPairs().map((x) => x.id));
  if (known.size && !known.has(dt)) {
    console.warn(`FMoM Totem: unknown damage type "${dt}" for Elements infusion`);
    return;
  }

  const effect =
    item.effects?.find((e) => canonicalTotemInfusionAuraName(e) === "elements") ??
    item.effects?.find((e) => /\belements\b/i.test(e.name ?? "")) ??
    null;
  if (!effect) return;

  const drVal = dt;
  const bonusVal = `1d6[${dt}]`;
  const bonusKeys = new Set([
    "system.bonuses.mwak.damage",
    "system.bonuses.msak.damage",
    "system.bonuses.rwak.damage",
    "system.bonuses.rsak.damage"
  ]);

  const changes = (effect.changes ?? []).map((chg) => {
    const key = chg.key ?? "";
    if (key === "system.traits.dr.value") return { ...chg, value: drVal };
    if (bonusKeys.has(key)) return { ...chg, value: bonusVal };
    return chg;
  });

  try {
    await effect.update({ changes });
  } catch (err) {
    console.warn("FMoM Totem: failed to apply Elements damage type to totem item effect", err);
  }
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class TotemBuilderApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Two independent pole builds when Ethereal Convergence is on ([0] = Totem A, [1] = Totem B).
   * @type {{ selections: Record<string, number>, elementStacks: Record<string, string[]> }[]}
   */
  _totemBuilds = [
    { selections: {}, elementStacks: {} },
    { selections: {}, elementStacks: {} }
  ];

  /** 0 = Totem A, 1 = Totem B (only when convergence is enabled). */
  _activeTotemTab = 0;

  /** Ethereal Construction: optional 120 ft placement range (costs one spell slot toward the bundle). */
  _etherealExtendedRange = false;

  /** Ethereal Construction: optional bonus-action construction (costs one spell slot toward the bundle). */
  _etherealBonusAction = false;

  /** Selected multiset key for expending spell slots (e.g. "1+1+2"); empty when no construction effects. */
  _etherealSlotPlanKey = "";

  /** Ethereal Convergence: second totem with its own build (one Totem Pole use, one 5th-level slot). */
  _convergenceTwin = false;

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "fmom-totem-builder",
    classes: ["fmom-totem-builder"],
    position: { width: 1040, height: 560 },
    window: {
      icon: "fa-solid fa-monument",
      title: "Construct Totem",
      resizable: true
    },
    form: {
      handler: TotemBuilderApplication.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      incInfusion: TotemBuilderApplication.#onIncInfusion,
      decInfusion: TotemBuilderApplication.#onDecInfusion,
      toggleEthereal: TotemBuilderApplication.#onToggleEthereal,
      toggleConvergence: TotemBuilderApplication.#onToggleConvergence,
      selectTotemTab: TotemBuilderApplication.#onSelectTotemTab,
      clearInfusions: TotemBuilderApplication.#onClearInfusions,
      previewInfusion: TotemBuilderApplication.#onPreviewInfusion
    }
  };

  /** @inheritDoc */
  static PARTS = {
    body: {
      root: true,
      template: `modules/${MODULE_ID}/templates/totem-builder.hbs`,
      scrollY: [".fmom-totem-scroll", ".fmom-totem-preview-scroll"]
    }
  };

  /**
   * @param {object} options
   * @param {Actor} options.character
   * @param {Item5e} options.totemItem
   * @param {string} [options.totemItemId] Embedded item id on the actor (preferred for spending uses).
   * @param {string} [options.totemActivityId] Activity id from preUseActivity (where uses usually live in dnd5e 5).
   * @param {object} [options.usageConfig]
   */
  constructor(options = {}) {
    const innerH = typeof window !== "undefined" ? window.innerHeight : 900;
    const defaultH = Math.min(720, Math.max(420, Math.round(innerH - 72)));
    const next = { ...options };
    next.position = foundry.utils.mergeObject({ width: 1040, height: defaultH }, options.position ?? {});
    super(next);
    this._totemBuilds = [
      { selections: {}, elementStacks: {} },
      { selections: {}, elementStacks: {} }
    ];
    this._activeTotemTab = 0;
    this._etherealExtendedRange = false;
    this._etherealBonusAction = false;
    this._etherealSlotPlanKey = "";
    this._convergenceTwin = false;
    /** @type {string} */
    this._infusionSearch = "";
    /** When true, next render restore focuses the infusion filter and restores caret. */
    this._restoreInfusionFilterFocus = false;
    /** @type {number} */
    this._infusionFilterSelStart = 0;
    /** @type {number} */
    this._infusionFilterSelEnd = 0;
    /** @type {AbortController|null} */
    this._infusionListClickAbort = null;
  }

  /**
   * @returns {{ selections: Record<string, number>, elementStacks: Record<string, string[]> }}
   */
  #buildAt(index) {
    return this._totemBuilds[index] ?? this._totemBuilds[0];
  }

  /**
   * Open the character’s infusion item sheet (feat / feature text).
   * @param {string} itemId
   */
  #openInfusionFeatureSheet(itemId) {
    const item = this.character.items.get(itemId);
    if (!item) return;
    const sheet = item.sheet;
    if (!sheet) return;
    void sheet.render(true);
  }

  /** @inheritDoc */
  async render(...args) {
    const root = this.window?.content ?? this.element;
    let mainScroll = 0;
    let previewScroll = 0;
    if (root?.querySelector) {
      mainScroll = root.querySelector(".fmom-totem-scroll")?.scrollTop ?? 0;
      previewScroll = root.querySelector(".fmom-totem-preview-scroll")?.scrollTop ?? 0;
    }
    const result = await super.render(...args);
    const restoreInfusionFocus = this._restoreInfusionFilterFocus;
    const infSelStart = this._infusionFilterSelStart;
    const infSelEnd = this._infusionFilterSelEnd;
    if (restoreInfusionFocus) this._restoreInfusionFilterFocus = false;
    const restore = () => {
      const r = this.window?.content ?? this.element;
      if (!r?.querySelector) return;
      const mainEl = r.querySelector(".fmom-totem-scroll");
      const prevEl = r.querySelector(".fmom-totem-preview-scroll");
      if (mainEl) mainEl.scrollTop = mainScroll;
      if (prevEl) prevEl.scrollTop = previewScroll;
      if (restoreInfusionFocus) {
        const infInp = r.querySelector("input.fmom-infusion-filter");
        if (infInp) {
          infInp.focus();
          const len = infInp.value.length;
          const a = Math.min(Math.max(0, infSelStart), len);
          const b = Math.min(Math.max(0, infSelEnd), len);
          try {
            infInp.setSelectionRange(a, b);
          } catch {
            /* ignore */
          }
        }
      }
    };
    if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(() => requestAnimationFrame(restore));
    else queueMicrotask(restore);
    return result;
  }

  /**
   * Keep Elements damage-type stacks aligned with stepper counts (trim / pad) for one build.
   * @param {{ item: Item5e }[]} infusions
   * @param {number} buildIndex
   */
  #syncElementStacksForBuild(infusions, buildIndex) {
    const pairs = getDnd5eDamageTypeIdLabelPairs();
    const first = pairs[0]?.id ?? "";
    const allowed = new Set(pairs.map((p) => p.id));
    const build = this.#buildAt(buildIndex);
    const sel = build.selections;
    const stacks = build.elementStacks;
    for (const { item } of infusions) {
      const id = item.id;
      const count = sel[id] ?? 0;
      if (!isElementsInfusionItemName(item.name)) {
        delete stacks[id];
        continue;
      }
      if (count <= 0) {
        delete stacks[id];
        continue;
      }
      let stack = stacks[id];
      if (!Array.isArray(stack)) stack = [];
      if (stack.length > count) stack = stack.slice(0, count);
      while (stack.length < count) {
        const prev = stack[stack.length - 1] ?? first;
        stack.push(allowed.has(prev) ? prev : first);
      }
      stacks[id] = stack.map((v) => (allowed.has(v) ? v : first));
    }
  }

  /**
   * @param {{ item: Item5e }[]} infusions
   */
  #syncAllElementStacks(infusions) {
    const n = this._convergenceTwin ? 2 : 1;
    for (let i = 0; i < n; i++) this.#syncElementStacksForBuild(infusions, i);
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.window?.content ?? this.element;
    if (!root) return;
    const app = this;
    root.querySelectorAll("select.fmom-el-slot-select").forEach((sel) => {
      sel.onchange = () => {
        const itemId = sel.dataset.itemId;
        const slotIdx = Number(sel.dataset.slotIndex);
        const bi = Number(sel.dataset.buildIndex);
        if (!itemId || !Number.isFinite(slotIdx) || slotIdx < 0) return;
        const build = app.#buildAt(Number.isFinite(bi) ? bi : app._activeTotemTab);
        const stack = [...(build.elementStacks[itemId] ?? [])];
        stack[slotIdx] = sel.value;
        build.elementStacks[itemId] = stack;
        app.render();
      };
    });
    const planSel = root.querySelector("select.fmom-ethereal-plan");
    if (planSel) {
      planSel.onchange = () => {
        app._etherealSlotPlanKey = planSel.value;
        app.render();
      };
    }
    const filterInp = root.querySelector("input.fmom-infusion-filter");
    if (filterInp) {
      const cur = String(app._infusionSearch ?? "");
      if (filterInp.value !== cur) filterInp.value = cur;
      filterInp.oninput = () => {
        app._infusionSearch = filterInp.value;
        const v = filterInp.value;
        const s = filterInp.selectionStart ?? v.length;
        const e = filterInp.selectionEnd ?? s;
        app._restoreInfusionFilterFocus = true;
        app._infusionFilterSelStart = s;
        app._infusionFilterSelEnd = e;
        app.render();
      };
    }
    const infusionList = root.querySelector("ul.fmom-infusion-list");
    if (app._infusionListClickAbort) {
      app._infusionListClickAbort.abort();
      app._infusionListClickAbort = null;
    }
    if (infusionList) {
      app._infusionListClickAbort = new AbortController();
      infusionList.addEventListener(
        "click",
        (ev) => {
          const t = ev.target;
          if (!(t instanceof Element)) return;
          if (t.closest("button")) return;
          if (t.closest("select")) return;
          if (t.closest(".fmom-element-row")) return;
          const row = t.closest(".fmom-infusion-row");
          if (!row) return;
          const id = row.dataset.itemId;
          if (!id) return;
          app.#openInfusionFeatureSheet(id);
        },
        { passive: true, signal: app._infusionListClickAbort.signal }
      );
    }
  }

  get character() {
    return this.options.character;
  }

  get totemItem() {
    return this.options.totemItem;
  }

  get totemItemId() {
    return this.options.totemItemId ?? this.totemItem?.id;
  }

  get totemActivityId() {
    return this.options.totemActivityId;
  }

  /**
   * @param {object} opts
   */
  static open(opts) {
    return new TotemBuilderApplication(opts).render(true);
  }

  /**
   * @param {number} buildIndex
   */
  #computeSectionsUsedFor(buildIndex) {
    const sel = this.#buildAt(buildIndex).selections;
    let sum = 0;
    for (const item of this.character.items.filter(isHaidaInfusionItem)) {
      const c = sel[item.id] ?? 0;
      const { sections } = parseInfusionDescription(item.system?.description?.value ?? "");
      if (Number.isFinite(sections)) sum += c * sections;
    }
    return sum;
  }

  /**
   * @param {{ item: Item5e }[]} infusions
   * @param {number} buildIndex
   * @param {number} budget
   * @param {boolean} budgetValid
   * @param {{ id: string, label: string }[]} dmgBase
   */
  #rowsForBuild(infusions, buildIndex, budget, budgetValid, dmgBase) {
    const build = this.#buildAt(buildIndex);
    const sel = build.selections;
    const stacks = build.elementStacks;
    const sectionsUsed = this.#computeSectionsUsedFor(buildIndex);
    return infusions.map((row, rowIndex) => {
      const id = row.item.id;
      const count = sel[id] ?? 0;
      const usedExcluding = sectionsUsed - count * (Number.isFinite(row.sections) ? row.sections : 0);
      const cost = row.sections;
      const canInc =
        row.valid &&
        budgetValid &&
        usedExcluding + cost <= budget &&
        (row.repeatable || count === 0);
      const canDec = count > 0;

      const sec = row.sections;
      const isElements = isElementsInfusionItemName(row.item.name);
      const stack = isElements ? (stacks[id] ?? []) : [];
      const showElementSlots = isElements && count > 0;
      const elementSlots = showElementSlots
        ? stack.map((selVal, idx) => ({
            index: idx,
            n: idx + 1,
            options: dmgBase.map((o) => ({
              id: o.id,
              label: o.label,
              selected: o.id === selVal
            }))
          }))
        : [];

      return {
        rowIndex,
        buildIndex,
        id,
        name: row.item.name,
        img: row.item.img || "icons/svg/item-bag.svg",
        sections: sec,
        sectionsWord: Number(sec) === 1 ? "section" : "sections",
        repeatable: row.repeatable,
        valid: row.valid,
        count,
        canInc,
        canDec,
        isElements,
        showElementSlots,
        elementSlots
      };
    });
  }

  /**
   * @param {object[]} rows
   * @param {number} buildIndex
   */
  #elementsChoicesOkFor(rows, buildIndex) {
    const stacks = this.#buildAt(buildIndex).elementStacks;
    return rows.every((r) => {
      if (!r.isElements || !r.count) return true;
      const stack = stacks[r.id] ?? [];
      if (stack.length !== r.count) return false;
      return stack.every((t) => Boolean(String(t ?? "").trim()));
    });
  }

  /**
   * @param {Map<string, object>} parsedById
   * @param {number} buildIndex
   */
  #previewPanelForBuild(parsedById, buildIndex) {
    const sectionsUsed = this.#computeSectionsUsedFor(buildIndex);
    const meta = this.#computeBuildMetadata(parsedById, { sectionsUsed }, buildIndex);
    const radius = computeTotemMagicRadiusFeet(meta);
    const sel = this.#buildAt(buildIndex).selections;
    /** @type {string[]} */
    const chips = [];
    for (const [itemId, countRaw] of Object.entries(sel)) {
      const count = Number(countRaw) || 0;
      if (!count) continue;
      const row = parsedById.get(itemId);
      const name = row?.item?.name ?? "";
      if (!name) continue;
      chips.push(`${name}×${count}`);
    }
    /** @type {string[]} */
    const tags = [];
    if (meta.hasBlood) tags.push("Blood");
    if (meta.hasPurity) tags.push("Purity");
    if (meta.hasThorns) tags.push("Thorns");
    if (meta.hasSwiftness) tags.push("Swift");
    if (meta.hasSturdy) tags.push("Sturdy");
    if (meta.reachCount > 0) tags.push(`Reach×${meta.reachCount}`);
    const summaryLine =
      chips.length > 0
        ? `${sectionsUsed} sec · aura ~${radius} ft`
        : "Pick infusions on the left.";
    return {
      buildIndex,
      sectionsUsed,
      chips,
      tags,
      summaryLine
    };
  }

  /** @inheritDoc */
  async _prepareContext(_options) {
    const { budget, source: budgetSource } = resolveTotemSectionBudget(this.totemItem, this.character);
    const budgetValid = budget > 0;

    const infusions = this.character.items
      .filter(isHaidaInfusionItem)
      .map((item) => {
        const desc = item.system?.description?.value ?? "";
        const parsed = parseInfusionDescription(desc);
        return { item, ...parsed };
      })
      .sort((a, b) => a.item.name.localeCompare(b.item.name));

    if (!this._convergenceTwin) {
      this._activeTotemTab = 0;
    } else if (this._activeTotemTab > 1) {
      this._activeTotemTab = 1;
    }

    this.#syncAllElementStacks(infusions);

    const filterText = String(this._infusionSearch ?? "").trim().toLowerCase();
    const infusionsVisible =
      filterText.length > 0
        ? infusions.filter((row) => String(row.item?.name ?? "").toLowerCase().includes(filterText))
        : infusions;
    const infusionFilterHasNoMatches =
      filterText.length > 0 && infusions.length > 0 && infusionsVisible.length === 0;

    const dmgBase = getDnd5eDamageTypeIdLabelPairs();
    const activeTab = this._activeTotemTab;
    const rowsFull = this.#rowsForBuild(infusions, activeTab, budget, budgetValid, dmgBase);
    const rows = this.#rowsForBuild(infusionsVisible, activeTab, budget, budgetValid, dmgBase);
    const sectionsUsed = this.#computeSectionsUsedFor(activeTab);

    const elementsChoicesOk = this.#elementsChoicesOkFor(rowsFull, activeTab);

    const hasEtherealConstruction = actorHasCompendiumClassFeature(
      this.character,
      ETHEREAL_CONSTRUCTION_ITEM_ID
    );
    const hasEtherealConvergence = actorHasCompendiumClassFeature(
      this.character,
      ETHEREAL_CONVERGENCE_ITEM_ID
    );

    const etherealEffectCount =
      (hasEtherealConstruction && this._etherealExtendedRange ? 1 : 0) +
      (hasEtherealConstruction && this._etherealBonusAction ? 1 : 0);

    const slotSnap = getLeveledSpellSlotSnapshot(this.character);
    const slotRemaining = spellSlotValuesRemaining(slotSnap);
    const etherealPlans =
      hasEtherealConstruction && etherealEffectCount > 0
        ? minimalSpellSlotSpendPlans(slotRemaining, etherealEffectCount)
        : [];

    if (hasEtherealConstruction && etherealEffectCount > 0) {
      const validKeys = new Set(etherealPlans.map((p) => p.join("+")));
      if (!validKeys.has(this._etherealSlotPlanKey)) {
        this._etherealSlotPlanKey = etherealPlans[0]?.join("+") ?? "";
      }
    } else {
      this._etherealSlotPlanKey = "";
    }

    const etherealSlotPlanRows = etherealPlans.map((levels) => {
      const key = levels.join("+");
      return {
        key,
        label: formatSpellSlotPlanLabel(levels),
        selected: key === this._etherealSlotPlanKey
      };
    });

    const spell5Val = Number(slotSnap[5]?.value ?? 0);
    if (!hasEtherealConvergence || spell5Val <= 0) {
      this._convergenceTwin = false;
    }

    const etherealNeedsSlots =
      hasEtherealConstruction && etherealEffectCount > 0 && etherealPlans.length === 0;

    const parsedById = new Map(
      this.character.items.filter(isHaidaInfusionItem).map((item) => {
        const desc = item.system?.description?.value ?? "";
        return [item.id, { item, ...parseInfusionDescription(desc) }];
      })
    );

    const showDualTotemTabs = Boolean(this._convergenceTwin && hasEtherealConvergence);
    const rowsA = this.#rowsForBuild(infusions, 0, budget, budgetValid, dmgBase);
    const rowsB = this.#rowsForBuild(infusions, 1, budget, budgetValid, dmgBase);
    const okA = this.#elementsChoicesOkFor(rowsA, 0);
    const okB = this.#elementsChoicesOkFor(rowsB, 1);
    const usedA = this.#computeSectionsUsedFor(0);
    const usedB = this.#computeSectionsUsedFor(1);
    const validA =
      budgetValid &&
      okA &&
      usedA > 0 &&
      usedA <= budget &&
      rowsA.some((r) => r.valid && r.count > 0);
    const validB =
      budgetValid &&
      okB &&
      usedB > 0 &&
      usedB <= budget &&
      rowsB.some((r) => r.valid && r.count > 0);

    const previewA = this.#previewPanelForBuild(parsedById, 0);
    const previewB = this.#previewPanelForBuild(parsedById, 1);
    previewA.title = "Totem A - first placement";
    previewA.cssMod = "is-totem-a";
    previewA.letter = "A";
    previewB.title = "Totem B - second placement";
    previewB.cssMod = "is-totem-b";
    previewB.letter = "B";

    const magicRadiusFt = computeTotemMagicRadiusFeet(
      this.#computeBuildMetadata(parsedById, { sectionsUsed }, activeTab)
    );

    const previewInfusionLines = [];
    for (const r of rowsFull) {
      if (!r.count) continue;
      previewInfusionLines.push(`${r.name} ×${r.count}`);
    }

    const buildMetaPreview = this.#computeBuildMetadata(parsedById, { sectionsUsed }, activeTab);
    const previewTags = [];
    if (buildMetaPreview.hasBlood) previewTags.push("Blood link");
    if (buildMetaPreview.hasPurity) previewTags.push("Purity");
    if (buildMetaPreview.hasThorns) previewTags.push("Thorns");
    if (buildMetaPreview.hasSwiftness) previewTags.push("Swiftness");
    if (buildMetaPreview.hasSturdy) previewTags.push("Sturdy");
    if (buildMetaPreview.reachCount > 0) previewTags.push(`Reach ×${buildMetaPreview.reachCount}`);

    let previewSummary = "";
    if (previewInfusionLines.length) {
      previewSummary = `${sectionsUsed} section${sectionsUsed === 1 ? "" : "s"} · ~${magicRadiusFt} ft aura`;
    } else {
      previewSummary = "Choose infusions for this totem.";
    }

    const fifthSlotsAfterEthereal =
      etherealEffectCount > 0 && this._etherealSlotPlanKey
        ? spell5Val -
          this._etherealSlotPlanKey.split("+").filter((x) => Number(x) === 5).length
        : spell5Val;

    const convergenceBlockedBySlotPlan =
      Boolean(this._convergenceTwin) && fifthSlotsAfterEthereal < 1 && hasEtherealConvergence;

    const singleTotemOk =
      budgetValid &&
      elementsChoicesOk &&
      sectionsUsed > 0 &&
      sectionsUsed <= budget &&
      rowsFull.some((r) => r.valid && r.count > 0);
    const dualTotemOk = validA && validB;

    const canSubmit =
      (this._convergenceTwin && hasEtherealConvergence ? dualTotemOk : singleTotemOk) &&
      !etherealNeedsSlots &&
      (!this._convergenceTwin || fifthSlotsAfterEthereal > 0) &&
      !convergenceBlockedBySlotPlan;

    const budgetFillPercent = budgetValid && budget > 0 ? Math.min(100, Math.round((sectionsUsed / budget) * 100)) : 0;

    return {
      budget,
      budgetValid,
      budgetSource,
      sectionsUsed,
      budgetFillPercent,
      activeTotemTab: activeTab,
      showDualTotemTabs,
      tab0active: activeTab === 0,
      tab1active: activeTab === 1,
      infusions: rows,
      infusionFilterHasNoMatches,
      infusionCatalogNonEmpty: infusions.length > 0,
      canSubmit,
      hasEtherealConstruction,
      hasEtherealConvergence,
      etherealExtendedRange: this._etherealExtendedRange,
      etherealBonusAction: this._etherealBonusAction,
      etherealEffectCount,
      etherealSlotPlanRows,
      etherealSlotPlanKey: this._etherealSlotPlanKey,
      etherealNeedsSlots,
      etherealNoSlotsMessage: etherealNeedsSlots && "No spell slots available for this cost.",

      convergenceTwin: this._convergenceTwin,
      convergenceDisabled: !hasEtherealConvergence || spell5Val <= 0,
      convergenceBlockedBySlotPlan,
      convergenceHint:
        hasEtherealConvergence && spell5Val <= 0 ? "No 5th-level spell slots left." : "",

      previewInfusionLines,
      previewTags,
      previewSummary,
      magicRadiusFt,
      dualPreviews: showDualTotemTabs ? [previewA, previewB] : null,
      slotSnapshotLines: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
        const s = slotSnap[lvl];
        if (!s) return null;
        return { lvl, remaining: s.value, max: s.max };
      }).filter(Boolean)
    };
  }

  /**
   * @this {TotemBuilderApplication}
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onIncInfusion(event, target) {
    event.preventDefault();
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    if (!id) return;
    const app = /** @type {TotemBuilderApplication} */ (this);
    const item = app.character.items.get(id);
    if (!item || !isHaidaInfusionItem(item)) return;

    const build = app.#buildAt(app._activeTotemTab);
    const sel = build.selections;
    const current = sel[id] ?? 0;
    const parsed = parseInfusionDescription(item.system?.description?.value ?? "");
    if (!parsed.valid) return;
    if (!parsed.repeatable && current >= 1) return;

    sel[id] = current + 1;
    const { budget } = resolveTotemSectionBudget(app.totemItem, app.character);
    if (app.#computeSectionsUsedFor(app._activeTotemTab) > budget) {
      if (current <= 0) delete sel[id];
      else sel[id] = current;
      return;
    }
    app.render();
  }

  /**
   * @this {TotemBuilderApplication}
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onDecInfusion(event, target) {
    event.preventDefault();
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    if (!id) return;
    const app = /** @type {TotemBuilderApplication} */ (this);
    const build = app.#buildAt(app._activeTotemTab);
    const sel = build.selections;
    const next = (sel[id] ?? 0) - 1;
    if (next <= 0) delete sel[id];
    else sel[id] = next;
    app.render();
  }

  /**
   * @this {TotemBuilderApplication}
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onSelectTotemTab(event, target) {
    event.preventDefault();
    const tab = Number(target.closest("[data-tab]")?.dataset.tab);
    const app = /** @type {TotemBuilderApplication} */ (this);
    if (!app._convergenceTwin) return;
    if (tab !== 0 && tab !== 1) return;
    app._activeTotemTab = tab;
    app.render();
  }

  /**
   * @this {TotemBuilderApplication}
   * @param {Event} event
   * @param {HTMLElement} _target
   */
  static async #onClearInfusions(event, _target) {
    event.preventDefault();
    const app = /** @type {TotemBuilderApplication} */ (this);
    const build = app.#buildAt(app._activeTotemTab);
    build.selections = {};
    build.elementStacks = {};
    app.render();
  }

  /**
   * @this {TotemBuilderApplication}
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onPreviewInfusion(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    if (!id) return;
    const app = /** @type {TotemBuilderApplication} */ (this);
    app.#openInfusionFeatureSheet(id);
  }

  /**
   * @this {TotemBuilderApplication}
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onToggleEthereal(event, target) {
    event.preventDefault();
    const kind = target.closest("[data-ethereal]")?.dataset.ethereal;
    if (kind !== "range" && kind !== "bonus") return;
    const app = /** @type {TotemBuilderApplication} */ (this);
    if (!actorHasCompendiumClassFeature(app.character, ETHEREAL_CONSTRUCTION_ITEM_ID)) return;
    if (kind === "range") app._etherealExtendedRange = !app._etherealExtendedRange;
    else app._etherealBonusAction = !app._etherealBonusAction;
    app.render();
  }

  /**
   * @this {TotemBuilderApplication}
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static async #onToggleConvergence(event, target) {
    event.preventDefault();
    const app = /** @type {TotemBuilderApplication} */ (this);
    if (!actorHasCompendiumClassFeature(app.character, ETHEREAL_CONVERGENCE_ITEM_ID)) return;
    const s5 = Number(getLeveledSpellSlotSnapshot(app.character)[5]?.value ?? 0);
    if (s5 <= 0) return;
    const next = !app._convergenceTwin;
    app._convergenceTwin = next;
    if (next) app._activeTotemTab = 0;
    app.render();
  }

  /**
   * @this {TotemBuilderApplication}
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} _form
   * @param {FormDataExtended} _formData
   */
  static async #onSubmitForm(event, _form, _formData) {
    event.preventDefault();
    const app = /** @type {TotemBuilderApplication} */ (this);
    await app.#finalizeTotem();
  }

  /**
   * @param {Map<string, object>} parsedById
   * @param {number} buildIndex
   * @returns {{ uuidQueue: string[], elementDamagePerPayload: string[] }}
   */
  #collectPayloadForBuild(parsedById, buildIndex) {
    const build = this.#buildAt(buildIndex);
    const sel = build.selections;
    const stacks = build.elementStacks;
    /** @type {string[]} */
    const uuidQueue = [];
    /** @type {string[]} */
    const elementDamagePerPayload = [];
    for (const [itemId, count] of Object.entries(sel)) {
      if (!count) continue;
      const row = parsedById.get(itemId);
      if (!row?.valid) continue;
      const stack = isElementsInfusionItemName(row.item.name) ? (stacks[itemId] ?? []) : [];
      for (let i = 0; i < count; i++) {
        const elDmg = isElementsInfusionItemName(row.item.name) ? String(stack[i] ?? "").trim() : "";
        for (const uuid of row.uuids) {
          uuidQueue.push(uuid);
          elementDamagePerPayload.push(elDmg);
        }
      }
    }
    return { uuidQueue, elementDamagePerPayload };
  }

  async #finalizeTotem() {
    const ctx = await this._prepareContext({});
    if (!ctx.canSubmit) {
      ui.notifications.warn("Choose at least one valid infusion and stay within your section budget.");
      return;
    }

    const hasEtherealConstruction = actorHasCompendiumClassFeature(
      this.character,
      ETHEREAL_CONSTRUCTION_ITEM_ID
    );
    const etherealEffectCount =
      (hasEtherealConstruction && this._etherealExtendedRange ? 1 : 0) +
      (hasEtherealConstruction && this._etherealBonusAction ? 1 : 0);

    if (etherealEffectCount > 0) {
      const rem = spellSlotValuesRemaining(getLeveledSpellSlotSnapshot(this.character));
      const plans = minimalSpellSlotSpendPlans(rem, etherealEffectCount);
      const planKey = this._etherealSlotPlanKey;
      const valid = plans.some((p) => p.join("+") === planKey);
      if (!valid || !planKey) {
        ui.notifications.warn("Pick a valid spell slot combination for Ethereal Construction.");
        return;
      }
    }

    const infusions = this.character.items.filter(isHaidaInfusionItem);
    const parsedById = new Map(
      infusions.map((item) => {
        const desc = item.system?.description?.value ?? "";
        return [item.id, { item, ...parseInfusionDescription(desc) }];
      })
    );

    const wantConvergence =
      this._convergenceTwin &&
      actorHasCompendiumClassFeature(this.character, ETHEREAL_CONVERGENCE_ITEM_ID);

    const etherealMeta = {
      etherealExtendedRange: hasEtherealConstruction && this._etherealExtendedRange,
      etherealBonusAction: hasEtherealConstruction && this._etherealBonusAction
    };

    const { uuidQueue: q0, elementDamagePerPayload: dmg0 } = this.#collectPayloadForBuild(parsedById, 0);
    if (!q0.length) {
      ui.notifications.error("No feature UUIDs were collected for Totem A.");
      return;
    }

    let q1 = /** @type {string[]} */ ([]);
    let dmg1 = /** @type {string[]} */ ([]);
    if (wantConvergence) {
      const p1 = this.#collectPayloadForBuild(parsedById, 1);
      q1 = p1.uuidQueue;
      dmg1 = p1.elementDamagePerPayload;
      if (!q1.length) {
        ui.notifications.warn("Totem B needs at least one valid infusion with resolved UUIDs.");
        return;
      }
    }

    const meta0 = {
      ...this.#computeBuildMetadata(parsedById, { sectionsUsed: this.#computeSectionsUsedFor(0) }, 0),
      ...etherealMeta
    };
    const meta1 = wantConvergence
      ? {
          ...this.#computeBuildMetadata(parsedById, { sectionsUsed: this.#computeSectionsUsedFor(1) }, 1),
          ...etherealMeta
        }
      : null;

    /** @type {unknown[]} */
    let restoreApps = [];
    try {
      restoreApps = await minimizeAllOpenApplicationsForTotemPlacement();

      const nameSuffixA = wantConvergence ? " - A" : "";
      const actor = await this.#createTotemActor(q0, dmg0, meta0, nameSuffixA, wantConvergence ? "A" : null);
      if (!actor) return;

      if (!canvas?.scene) {
        ui.notifications.warn("No active scene - totem actor was created in the sidebar.");
        await this.close();
        return;
      }

      const labelA = wantConvergence ? "Totem A" : "Totem";
      ui.notifications.info(`${labelA}: click the map to place this token.`);
      const proto = await actor.getTokenDocument({ x: 0, y: 0 }, { parent: canvas.scene });
      const placed = await canvas.tokens.placeTokens([proto.toObject()]);
      if (!placed.length) {
        ui.notifications.info("Placement cancelled; the totem actor is in the Actors directory.");
      } else {
        if (etherealEffectCount > 0 && this._etherealSlotPlanKey) {
          const levels = this._etherealSlotPlanKey
            .split("+")
            .map((x) => Number(x))
            .filter((n) => Number.isFinite(n) && n >= 1 && n <= 9);
          await consumeSpellSlotLevels(this.character, levels);
        }
        const itemId = this.totemItemId;
        if (itemId) await consumeTotemPoleItemUse(this.character, itemId, this.totemActivityId);
        const placedToken = resolveTotemPlacedTokenDocument(placed[0]);
        if (placedToken) {
          await createTotemMagicRegionForToken(placedToken, computeTotemMagicRadiusFeet(meta0));
        }

        if (wantConvergence && meta1) {
          const s5Remain = Number(getLeveledSpellSlotSnapshot(this.character)[5]?.value ?? 0);
          if (s5Remain < 1) {
            ui.notifications.warn(
              "No 5th-level spell slot remains for Ethereal Convergence after other expenditures."
            );
          } else {
            ui.notifications.info("Totem B: click the map to place the second token.");
            const actor2 = await this.#createTotemActor(q1, dmg1, meta1, " - B", "B");
            if (actor2) {
              const proto2 = await actor2.getTokenDocument({ x: 0, y: 0 }, { parent: canvas.scene });
              const placed2 = await canvas.tokens.placeTokens([proto2.toObject()]);
              if (!placed2.length) {
                try {
                  await actor2.delete();
                } catch {
                  /* ignore */
                }
                ui.notifications.info(
                  "Totem B placement cancelled. No 5th-level spell slot was expended; extra actor removed."
                );
              } else {
                await consumeSpellSlotLevels(this.character, [5]);
                const placedToken2 = resolveTotemPlacedTokenDocument(placed2[0]);
                if (placedToken2) {
                  await createTotemMagicRegionForToken(
                    placedToken2,
                    computeTotemMagicRadiusFeet(meta1),
                    TOTEM_MAGIC_REGION_COLOR_B
                  );
                }
              }
            }
          }
        }
      }
      await this.close();
    } catch (err) {
      console.error(err);
      ui.notifications.error(err.message ?? "Failed to create totem.");
    } finally {
      await restoreMinimizedApplications(restoreApps);
    }
  }

  /**
   * @param {string[]} uuidQueue
   * @param {string[]} elementDamagePerPayload Same length as resolved item payloads (after skips).
   * @param {object} [buildMeta]
   * @param {string} [nameSuffix] appended to default totem name (e.g. " - A").
   * @param {string|null} [convergenceLabel] "A" / "B" when using Ethereal Convergence.
   * @returns {Promise<Actor|null>}
   */
  async #createTotemActor(uuidQueue, elementDamagePerPayload, buildMeta = {}, nameSuffix = "", convergenceLabel = null) {
    const override = String(game.settings.get(MODULE_ID, "totemTemplateActorUuid") ?? "").trim();
    const templateUuid = override || DEFAULT_TOTEM_ACTOR_UUID;
    const baseName = nameSuffix
      ? `Totem (${this.character.name})${nameSuffix}`
      : `Totem (${this.character.name})`;
    const folderId = getTotemsActorFolderId();

    /** @type {object[]} */
    const itemPayloads = [];
    /** @type {string[]} */
    const dmgAligned = [];
    for (let i = 0; i < uuidQueue.length; i++) {
      const uuid = uuidQueue[i];
      const doc = await fromUuid(uuid);
      if (!(doc instanceof Item)) {
        ui.notifications.warn(`Skipped (not an Item): ${uuid}`);
        continue;
      }
      const data = doc.toObject();
      delete data._id;
      itemPayloads.push(data);
      dmgAligned.push(String(elementDamagePerPayload[i] ?? "").trim());
    }

    if (!itemPayloads.length) {
      ui.notifications.error("Could not resolve any items from the infusion UUIDs.");
      return null;
    }

    const tpl = await fromUuid(templateUuid);
    if (!(tpl instanceof Actor)) {
      ui.notifications.error("Totem template UUID does not resolve to an Actor.");
      return null;
    }

    const data = tpl.toObject();
    delete data._id;
    data.name = baseName;
    data.folder = folderId ?? null;

    const actor = await Actor.create(data);
    if (!actor) return null;

    const createdItems = await actor.createEmbeddedDocuments("Item", itemPayloads);
    for (let j = 0; j < createdItems.length; j++) {
      const dmg = dmgAligned[j];
      if (dmg) await applyElementsDamageTypeToTotemItem(createdItems[j], dmg);
    }
    await applyShamanStatsToTotem(actor, this.character);
    await actor.setFlag(MODULE_ID, "totemInstance", true);
    await actor.setFlag(MODULE_ID, "totemEtherealOptions", {
      extendedRange120: Boolean(buildMeta.etherealExtendedRange),
      bonusActionConstruction: Boolean(buildMeta.etherealBonusAction)
    });
    if (convergenceLabel) {
      await actor.setFlag(MODULE_ID, "totemConvergenceLabel", String(convergenceLabel));
    }

    await postProcessCreatedTotemActor(actor, this.character, buildMeta);

    return actor;
  }

  /**
   * Compute metadata about the built totem from selections for one pole.
   * @param {Map<string, { item: Item5e, sections: number, repeatable: boolean, valid: boolean }>} parsedById
   * @param {object} ctx
   * @param {number} buildIndex
   * @returns {object}
   */
  #computeBuildMetadata(parsedById, ctx, buildIndex = 0) {
    const meta = {
      sectionsUsed: Number(ctx?.sectionsUsed ?? this.#computeSectionsUsedFor(buildIndex)) || 0,
      reachCount: 0,
      hasBlood: false,
      hasPurity: false,
      hasThorns: false,
      hasSwiftness: false,
      hasSturdy: false
    };

    const sel = this.#buildAt(buildIndex).selections;
    for (const [itemId, countRaw] of Object.entries(sel)) {
      const count = Number(countRaw) || 0;
      if (!count) continue;
      const row = parsedById.get(itemId);
      const name = row?.item?.name ?? "";
      if (!name) continue;
      if (/reach/i.test(name)) meta.reachCount += count;
      if (/blood/i.test(name)) meta.hasBlood = true;
      if (/purity/i.test(name)) meta.hasPurity = true;
      if (/thorns/i.test(name)) meta.hasThorns = true;
      if (/swiftness/i.test(name)) meta.hasSwiftness = true;
      if (/sturdy/i.test(name)) meta.hasSturdy = true;
    }

    return meta;
  }

}

/**
 * Totem Magic aura radius in feet: 30 + 10 ft per Reach infusion instance on this build.
 * @param {object} buildMeta
 */
function computeTotemMagicRadiusFeet(buildMeta) {
  const reachCount = Number(buildMeta?.reachCount ?? 0) || 0;
  return 30 + 10 * Math.max(0, reachCount);
}

/**
 * Convert a radius in scene distance units (usually feet) to pixels for a Region circle shape.
 * @param {number} radiusFeet
 */
function totemMagicRadiusFeetToPixels(radiusFeet) {
  const dim = canvas.dimensions;
  const dp = dim?.distancePixels;
  if (typeof dp === "number" && Number.isFinite(dp) && dp > 0) return dp * radiusFeet;
  const gridPx = dim?.size ?? canvas.grid?.size ?? 100;
  const distancePerSpace = dim?.distance ?? canvas.grid?.distance ?? 5;
  const d = typeof distancePerSpace === "number" ? distancePerSpace : Number(distancePerSpace);
  if (!Number.isFinite(d) || d <= 0) return (radiusFeet / 5) * gridPx;
  return (radiusFeet / d) * gridPx;
}

/**
 * Scene pixel center of the token (for region circle origin). Prefer live canvas token (hex-aware).
 * @param {TokenDocument} token
 * @returns {{ x: number, y: number }}
 */
function getTotemTokenCenterScenePoint(token) {
  const placed = canvas.tokens?.get(token.id);
  const c = placed?.center;
  if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) return { x: c.x, y: c.y };

  const size = canvas.dimensions?.size ?? canvas.grid?.size ?? 100;
  const wx = Number(token.width) || 1;
  const wy = Number(token.height) || 1;
  const tx = Number(token.x) || 0;
  const ty = Number(token.y) || 0;
  return {
    x: tx + (wx * size) / 2,
    y: ty + (wy * size) / 2
  };
}

/**
 * Placement flow may return a canvas Token; region APIs need the TokenDocument.
 * @param {unknown} placed
 * @returns {TokenDocument|null}
 */
function resolveTotemPlacedTokenDocument(placed) {
  if (!placed) return null;
  if (placed instanceof TokenDocument) return placed;
  const doc = placed.document;
  if (doc instanceof TokenDocument) return doc;
  return null;
}

/**
 * Whether the region's attachment data points at this token (authoritative vs containment sets).
 * @param {RegionDocument} region
 * @param {TokenDocument} token
 */
function totemMagicRegionAttachmentRefersToToken(region, token) {
  const tid = token.id;
  if (!tid) return false;
  // Persisted data uses { attachment: { token: "<embedded Token id>" } } (Foundry v14+ schema).
  const srcTok = region?._source?.attachment?.token;
  if (srcTok != null && srcTok === tid) return true;
  const attTok = region?.attachment?.token;
  if (attTok instanceof TokenDocument) return attTok.id === tid;
  return false;
}

/**
 * Linked to this token: explicit attachment field or token's attachment index.
 * @param {RegionDocument} region
 * @param {TokenDocument} token
 */
function totemMagicRegionLinkedToTotemToken(region, token) {
  if (totemMagicRegionAttachmentRefersToToken(region, token)) return true;
  try {
    if (typeof token.attachments?.regions?.has === "function" && token.attachments.regions.has(region)) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Foundry v14+ region attachment: only `{ token: <scene TokenDocument id> }` (see BaseRegion schema).
 * @param {TokenDocument} token
 * @returns {{ token: string }|null}
 */
function totemMagicRegionAttachmentForToken(token) {
  const id = token.id;
  if (!id) return null;
  return { token: id };
}

/**
 * Attached regions use scene coordinates; Foundry shifts shapes by token center delta on move.
 * @param {RegionDocument} region
 * @param {{ x: number, y: number }} center
 * @param {number} [tolPx]
 */
function totemMagicCircleCenteredOnToken(region, center, tolPx = 8) {
  const s = region?.shapes?.[0];
  if (!s || s.type !== "circle") return false;
  return Math.abs(s.x - center.x) <= tolPx && Math.abs(s.y - center.y) <= tolPx;
}

/**
 * Ensure the region is attached to the placed totem token and its circle is centered on the token (scene coords).
 * @param {RegionDocument} region
 * @param {TokenDocument} token
 * @param {Scene} scene
 * @param {(x: number, y: number) => object} circleAt
 */
async function ensureTotemMagicRegionAttachedToToken(region, token, scene, circleAt) {
  await new Promise((resolve) => queueMicrotask(resolve));
  if (canvas?.ready) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  let reg = scene.regions?.get?.(region.id) ?? region;

  const sceneCenter = getTotemTokenCenterScenePoint(token);
  const cx = sceneCenter.x;
  const cy = sceneCenter.y;

  if (totemMagicRegionLinkedToTotemToken(reg, token) && totemMagicCircleCenteredOnToken(reg, sceneCenter)) return;

  if (totemMagicRegionLinkedToTotemToken(reg, token)) {
    try {
      const updated = await reg.update({ shapes: [circleAt(cx, cy)] });
      if (updated) reg = updated;
    } catch (err) {
      console.warn("FMoM Totem: could not re-center attached Totem Magic region", err);
    }
    return;
  }

  const attachment = totemMagicRegionAttachmentForToken(token);
  if (attachment) {
    try {
      const updated = await reg.update({ attachment, shapes: [circleAt(cx, cy)] });
      if (updated) reg = updated;
      else reg = scene.regions?.get?.(region.id) ?? reg;
      if (totemMagicRegionLinkedToTotemToken(reg, token)) return;
    } catch (err) {
      console.warn("FMoM Totem: region attachment update failed", err);
    }
  }

  if (!totemMagicRegionAttachmentRefersToToken(reg, token)) {
    try {
      await reg.update({
        shapes: [circleAt(cx, cy)],
        attachment: null
      });
    } catch (err) {
      console.warn("FMoM Totem: could not position Totem Magic region on token", err);
    }
  }
}

/**
 * Add core `applyActiveEffect` behaviors after the Region document exists (initial nested embed often drops them).
 * @param {RegionDocument} region
 * @param {Actor} totemActor
 */
async function embedTotemMagicAuraBehaviors(region, totemActor) {
  if (!region || !(totemActor instanceof Actor)) return;
  const payloads = buildTotemMagicRegionAuraBehaviors(totemActor);
  if (!payloads.length) return;

  const reg = region.parent?.regions?.get(region.id) ?? region;
  try {
    await reg.createEmbeddedDocuments("RegionBehavior", payloads);
  } catch (err) {
    console.warn("FMoM Totem: failed to embed Totem Magic region behaviors", err);
  }
}

/**
 * Create a circle region on / following the placed totem token (Foundry v14+), not an emanation.
 * @param {TokenDocument} token
 * @param {number} radiusFeet
 * @param {string} [regionColor] hex fill color (default: {@link TOTEM_MAGIC_REGION_COLOR})
 */
async function createTotemMagicRegionForToken(token, radiusFeet, regionColor = TOTEM_MAGIC_REGION_COLOR) {
  const tokenDoc = resolveTotemPlacedTokenDocument(token);
  if (!(tokenDoc instanceof TokenDocument) || !canvas?.ready) return;
  token = tokenDoc;

  const scene = token.parent;
  if (!scene) return;

  const radiusPx = totemMagicRadiusFeetToPixels(radiusFeet);
  if (!Number.isFinite(radiusPx) || radiusPx <= 0) return;

  const center = getTotemTokenCenterScenePoint(token);

  const totemActor = token.actor;

  /** @type {Record<string, unknown>} */
  const baseRegion = {
    name: "Totem Magic",
    color: regionColor,
    displayMeasurements: false,
    restriction: { enabled: false, type: "move", priority: 0 },
    behaviors: [],
    locked: false,
    flags: { [MODULE_ID]: { totemMagicAura: true } }
  };
  if (typeof CONST !== "undefined" && CONST.REGION_VISIBILITY) {
    baseRegion.visibility = CONST.REGION_VISIBILITY.ALWAYS;
  }
  const levelId = canvas.level?.id;
  if (levelId) baseRegion.levels = [levelId];

  const circleAt = (x, y) => ({
    type: "circle",
    x,
    y,
    hole: false,
    radius: radiusPx
  });

  /** @type {RegionDocument|null} */
  let region = null;

  const linkAttachment = totemMagicRegionAttachmentForToken(token);
  const shapePayload = [circleAt(center.x, center.y)];

  const tryCreateRegion = async (attachment) => {
    const created = await scene.createEmbeddedDocuments("Region", [
      {
        ...baseRegion,
        shapes: shapePayload,
        attachment
      }
    ]);
    return created?.[0] ?? null;
  };

  if (linkAttachment) {
    try {
      region = await tryCreateRegion(linkAttachment);
    } catch (err) {
      console.warn("FMoM Totem: failed to create Totem Magic region with token attachment", err);
    }
  }

  if (!region) {
    try {
      region = await tryCreateRegion(null);
    } catch (err) {
      console.warn("FMoM Totem: failed to create Totem Magic region (unattached)", err);
    }
  }

  if (!region) return;

  if (region.displayMeasurements !== false) {
    try {
      await region.update({ displayMeasurements: false });
    } catch {
      /* ignore */
    }
  }

  await ensureTotemMagicRegionAttachedToToken(region, token, scene, circleAt);

  const regFresh = scene.regions?.get(region.id) ?? region;
  if (totemActor instanceof Actor) await embedTotemMagicAuraBehaviors(regFresh, totemActor);
}

/**
 * Post-process a newly created totem actor: radius, auras, and Totem Health.
 * @param {Actor} totem
 * @param {Actor} shaman
 * @param {object} buildMeta
 */
async function postProcessCreatedTotemActor(totem, shaman, buildMeta = {}) {
  if (!(totem instanceof Actor)) return;

  const sectionsUsed = Number(buildMeta.sectionsUsed ?? 0) || 0;
  const hasSturdy = Boolean(buildMeta.hasSturdy);

  const radius = computeTotemMagicRadiusFeet(buildMeta);

  // Update Totem Magic feature description to reflect the correct radius.
  try {
    const totemMagic = totem.items.find((i) => i.name === "Totem Magic");
    const key = "system.description.value";
    const desc = totemMagic?.system?.description?.value ?? "";
    if (totemMagic && typeof desc === "string" && desc.includes("30ft radius around the totem")) {
      const next = desc.replace(/30ft radius around the totem/g, `${radius}ft radius around the totem`);
      if (next !== desc) {
        await totemMagic.update({ [key]: next });
      }
    }
  } catch (err) {
    console.warn("FMoM Totem: failed to update Totem Magic description", err);
  }

  if (isActiveAurasModuleEnabled()) {
    try {
      await applyActiveAurasTotemMagicRadiusToInfusionAuras(totem, radius);
    } catch (err) {
      console.warn("FMoM Totem: failed to sync ActiveAuras radius on infusion auras", err);
    }
  } else {
    // Native Totem Magic region handles aura radius; strip ActiveAuras flags so core regions do not double-apply.
    try {
      await stripActiveAurasFlagsFromTotemInfusionAuras(totem);
    } catch (err) {
      console.warn("FMoM Totem: failed to strip ActiveAuras flags from infusion auras", err);
    }

    try {
      await disableTotemInfusionAuraTemplatesOnTotem(totem);
    } catch (err) {
      console.warn("FMoM Totem: failed to disable infusion aura templates on totem", err);
    }
  }

  // Update Totem Health active effect formula for max HP.
  try {
    const shamanLevel = getShamanLevelForTotemHealth(shaman);
    if (!Number.isFinite(shamanLevel) || shamanLevel <= 0 || sectionsUsed <= 0) return;

    const effectFormula = `8 + (${shamanLevel} * ${sectionsUsed})`;

    /** @type {ActiveEffect|null} */
    let effect = null;

    // Prefer an item-based Totem Health feature if present.
    const thItem = totem.items.find((i) => i.name === "Totem Health");
    if (thItem && thItem.effects?.size) {
      effect = thItem.effects.find((e) => e.name === "Totem Health") ?? null;
    }

    // Fallback: an actor-level effect named Totem Health.
    if (!effect && totem.effects?.size) {
      effect = totem.effects.find((e) => e.name === "Totem Health") ?? null;
    }

    if (effect) {
      const changes = (effect.changes ?? []).map((chg) => {
        if (chg.key === "system.attributes.hp.max") {
          return { ...chg, value: effectFormula };
        }
        return chg;
      });

      await effect.update({ changes });
    }
  } catch (err) {
    console.warn("FMoM Totem: failed to update Totem Health effect", err);
  }

  // Update Sturdy infusion (max HP and AC bonus from totem sections), if present.
  try {
    if (hasSturdy && sectionsUsed > 0) {
      const sturdyItem = totem.items.find((i) => i.name === "Sturdy");
      /** @type {ActiveEffect|null} */
      let sturdyEffect = null;
      if (sturdyItem && sturdyItem.effects?.size) {
        sturdyEffect = sturdyItem.effects.find((e) => e.name === "Sturdy") ?? null;
      }
      if (!sturdyEffect && totem.effects?.size) {
        sturdyEffect = totem.effects.find((e) => e.name === "Sturdy") ?? null;
      }

      if (sturdyEffect) {
        const wisRaw =
          foundry.utils.getProperty(shaman, "system.abilities.wis.mod") ??
          foundry.utils.getProperty(shaman, "system.abilities.wis.value");
        let wisMod =
          typeof wisRaw === "number"
            ? wisRaw
            : Number(wisRaw);
        if (!Number.isFinite(wisMod)) {
          const wisScore = Number(
            foundry.utils.getProperty(shaman, "system.abilities.wis.value") ?? 10
          );
          if (Number.isFinite(wisScore)) {
            wisMod = Math.floor((wisScore - 10) / 2);
          }
        }

        const hpFormula = Number.isFinite(wisMod) ? `${wisMod} * ${sectionsUsed}` : null;
        const acFormula = `1 * ${sectionsUsed}`;

        const sturdyChanges = (sturdyEffect.changes ?? []).map((chg) => {
          if (chg.key === "system.attributes.hp.max" && hpFormula != null) {
            return { ...chg, value: hpFormula };
          }
          if (chg.key === "system.attributes.ac.bonus") {
            return { ...chg, value: acFormula };
          }
          return chg;
        });
        await sturdyEffect.update({ changes: sturdyChanges });
      }
    }
  } catch (err) {
    console.warn("FMoM Totem: failed to update Sturdy effect", err);
  }

  // Ensure the totem starts at full health after max HP changes.
  try {
    const hp = totem.system?.attributes?.hp;
    const max = Number(hp?.max ?? 0);
    if (Number.isFinite(max) && max > 0) {
      await totem.update({ "system.attributes.hp.value": max });
    }
  } catch (err) {
    console.warn("FMoM Totem: failed to sync HP value to max", err);
  }
}


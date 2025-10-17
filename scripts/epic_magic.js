Hooks.once("init", () => {
    foundry.utils.mergeObject(CONFIG.DND5E.spellLevels, {
        10: "10th Level",
        11: "11th Level",
        12: "12th Level",
        13: "13th Level",
        14: "14th Level",
        15: "15th Level",
        16: "16th Level"
    });
});
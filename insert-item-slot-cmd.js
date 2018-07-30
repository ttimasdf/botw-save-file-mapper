const fs = require('fs');
const offsetChecker = require('./offset-checker.js');
const offsetSetter = require('./offset-setter.js');
const itemFileUtils = require('./item-file-utils.js');
const CONFIG = require('./config.js');
const nameGetter = require('./name-getter.js');
const objUtils = require('./obj-utils.js');
const saveFileUtils = require('./save-file-utils.js');
const getItemSlotStructure = require('./get-item-slot-structure.js');
const slotInfo = require('./slot-info.js');
const foodduration = require('./encoders_decoders/foodduration.js');
const float28 = require('./encoders_decoders/float28.js');

const slot = parseInt(process.argv[3]);
const saveFile = !!process.argv[5] ? (CONFIG.snapshotspath + process.argv[5]) : CONFIG.savepath + 'game_data.sav';

const bonusTypes = {
    NONE: 0,
    ATTACK: 0x1,
    DURABILITY: 0x2,
    CRITICAL: 0x4,
    LONGTHROW: 0x8,
    FIVESHOTS: 0x10,
    THREESHOTS: 0x20,
    QUICKSHOT: 0x40,
    SHIELDSURF: 0x80,
    SHIELDGUARD: 0x100,
    ATTACKPLUS: 0x80000001,
    DURABILITYPLUS: 0x80000002,
    CRITICALPLUS: 0x80000004,
    LONGTHROWPLUS: 0x80000008,
    FIVESHOTSPLUS: 0x80000010,
    THREESHOTSPLUS: 0x80000020,
    QUICKSHOTPLUS: 0x80000040,
    SHIELDSURFPLUS: 0x80000080,
    SHIELDGUARDPLUS: 0x80000100
};

const foodBonusTypes = {
    NONE: 0,
    HEARTY: 0x40000000,
    CHILLY: 0x40800000,
    SPICY: 0x40a00000,
    ELECTRO: 0x40c00000,
    MIGHTY: 0x41200000,
    TOUGH: 0x41300000,
    SNEAKY: 0x41400000,
    HASTY: 0x41500000,
    ENERGIZING: 0x41600000,
    ENDURING: 0x41700000,
    FIREPROOF: 0x41800000
};

const foodBonusAmounts = [
    0,
    0x3f800000,
    0x40000000,
    0x40400000
];

const maxFoodBonusAmounts = {
    HEARTY: 0xFFFFFFFF,
    CHILLY: 2,
    SPICY: 2,
    ELECTRO: 3,
    MIGHTY: 3,
    TOUGH: 3,
    SNEAKY: 3,
    HASTY: 3,
    ENERGIZING: 0xFFFFFFFF,
    ENDURING: 0xFFFFFFFF,
    FIREPROOF: 0x2
};

const getBonusType = (name, category) => {
    if (category == 'food') {
        return foodBonusTypes[name.toUpperCase()] || 0;
    } else {
        return bonusTypes[name.toUpperCase()];
    }
}

const category = nameGetter.getOrUndefined(process.argv[2], 'Item category: ', 'Unnamed categories not allowed.');
const categoryFilename = itemFileUtils.getCategoryFilepath(category.toLowerCase());

if (!!categoryFilename) {
    const slotStructure = getItemSlotStructure(saveFile);

    const baseSlot = slotStructure[category].first + slot - 1;

    const totalSlotsInCategory = slotStructure[category].last - slotStructure[category].first;
    const subsequentSlotsInCategory = totalSlotsInCategory - (slot - 1);

    if (!!baseSlot || baseSlot === 0) {
        const nameStr = nameGetter.getOrUndefined(process.argv[4], 'Item name: ', 'Unnamed items not allowed.');

        if (!!nameStr) {
            const [quantityStr] = nameStr.split('x').reverse();
            const rawQuantity = parseInt(quantityStr);
            const quantity = rawQuantity || 1;
            const nameWithBonus = (() => {
                if (isNaN(rawQuantity)) {
                    return nameStr;
                } else {
                    return nameStr.split('x').slice(0, -1).join('x');
                }
            })();
            const [name, bonusType, bonusAmount, bonusDuration] = nameWithBonus.split('+');
            const base = slotInfo.getOffsets(baseSlot, slot - 1, category);
            const next = slotInfo.getOffsets(baseSlot + 1, slot, category);
            
            const json = itemFileUtils.getFileAsJsonOrEmptyJsObject(categoryFilename);

            const entries = json[name];

            var slots = 1;
            var end = false;
            while(!end) {
                const nextOffset = slotInfo.getOffsets(baseSlot + slots, slot, category).item;
                end = offsetChecker(nextOffset, saveFile) == 0;
                slots++;
            }

            const lengths = slotInfo.getLengths(slots, subsequentSlotsInCategory, category);

            if (!!entries) {
                saveFileUtils.shiftData(saveFile, base.item, next.item, lengths.item);
                saveFileUtils.shiftData(saveFile, base.quantity, next.quantity, lengths.quantity);
                saveFileUtils.shiftData(saveFile, base.equipped, next.equipped, lengths.equipped);
                saveFileUtils.shiftData(saveFile, base.bonus.type, next.bonus.type, lengths.bonus.type, base.bonus.width);
                saveFileUtils.shiftData(saveFile, base.bonus.amount, next.bonus.amount, lengths.bonus.amount, base.bonus.width);
                if (category === 'food') {
                    saveFileUtils.shiftData(saveFile, base.bonus.duration, next.bonus.duration, lengths.bonus.duration);
                    saveFileUtils.shiftData(saveFile, base.bonus.hearts, next.bonus.hearts, lengths.bonus.hearts);
                }
                entries.forEach(entry => {
                    offsetSetter(base.item + entry.offset, entry.value, saveFile);
                });
                const actualBonusType = bonusType && bonusType.toUpperCase() || 'NONE';
                if (!!quantity) {
                    if (category === 'food') {
                        const quarterhearts = (() => {
                            if (actualBonusType === 'HEARTY' && bonusAmount) {
                                return Math.floor(bonusAmount) * 4;
                            } else {
                                return Math.floor(parseFloat(quantityStr) * 4);
                            }
                        })();
                        offsetSetter(base.bonus.hearts, float28.encode(quarterhearts) | 0x40000000, saveFile);
                    } else {
                        offsetSetter(base.quantity, quantity, saveFile);
                    }
                }
                offsetSetter(base.bonus.type, getBonusType(actualBonusType, category), saveFile);
                if (bonusAmount !== undefined) {
                    if (category === 'food') {
                        const maxBonus = maxFoodBonusAmounts[actualBonusType];
                        const bonus = bonusAmount > maxBonus ? maxBonus : bonusAmount;
                        if (foodBonusAmounts[bonus] !== undefined && actualBonusType !== 'HEARTY') {
                            offsetSetter(base.bonus.amount, foodBonusAmounts[bonus], saveFile);
                        }
                    } else {
                        offsetSetter(base.bonus.amount, bonusAmount || 0, saveFile);
                    }
                }
                if (actualBonusType !== 'NONE' && !bonusDuration) {
                    offsetSetter(base.bonus.duration, foodduration.encode('03:00'), saveFile);
                } else if (!!bonusDuration && base.bonus.duration) {
                    offsetSetter(base.bonus.duration, foodduration.encode(bonusDuration || '00:00'), saveFile);
                }
                if (actualBonusType === 'NONE') {
                    offsetSetter(base.bonus.amount, 0, saveFile);
                    offsetSetter(base.bonus.duration, 0, saveFile);
                }
            } else {
                console.log(`No entries found for '${name}' in ${category}.`);
            }
        }
    }
} else {
    console.log('Category not recognized.');
}

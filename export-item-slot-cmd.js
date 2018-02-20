const fs = require('fs');
const offsetChecker = require('./offset-checker.js');
const itemFileUtils = require('./item-file-utils.js');
const CONFIG = require('./config.js');
const nameGetter = require('./name-getter.js');
const objUtils = require('./obj-utils.js');
const getItemSlotStructure = require('./get-item-slot-structure.js');

const slot = parseInt(process.argv[3]);
const saveFile = !!process.argv[5] ? (CONFIG.snapshotspath + process.argv[3]) : CONFIG.savepath + 'game_data.sav';

const slotsOffset = 394248;
const slotWidth = 128;
const getOffset = (slot) => slotsOffset + slot * slotWidth;
const relativeOffsets = Array.apply(0, new Array(slotWidth / 8)).map((e, i) => i * 8);

const category = nameGetter.getOrUndefined(process.argv[2], 'Item category: ', 'Unnamed categories not allowed.');
const exportFilename = itemFileUtils.getCategoryFilepath(category.toLowerCase());

if (!!exportFilename) {
    const slotStructure = getItemSlotStructure(saveFile);

    console.log(slotStructure);

    const baseSlot = slotStructure[category].first + slot - 1;

    if (!!baseSlot) {
        const name = nameGetter.getOrUndefined(process.argv[4], 'Item name: ', 'Unnamed items not allowed.');

        if (!!name) {
            const baseOffset = getOffset(baseSlot);
            const entries = relativeOffsets.map((relativeOffset) => {
                const offset = baseOffset + relativeOffset;
                const value = offsetChecker(offset, saveFile);
                return {offset: relativeOffset, value: value};
            }).filter((entry, i) => {
                return i < 4 || entry.value !== 0;
            });

            entries.forEach(entry => console.log(entry));

            // const json = itemFileUtils.getFileAsJsonOrEmptyJsObject(exportFilename);

            // json[name] = entries;

            // itemFileUtils.saveJsonFile(exportFilename, json);
        }
    }
} else {
    console.log('Category not recognized.');
}
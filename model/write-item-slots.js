module.exports = (() => {
    const getItemSlotStructure = require('../get-item-slot-structure.js');
    const setItemEntries = require('../set-item-entries.js');
    const batchSetItemSlots = require('../batch-set-item-slots.js');
    const batchOffsetSetter = require('../batch-offset-setter.js');
    const itemFileUtils = require('../item-file-utils.js');
    const saveFileUtils = require('../save-file-utils.js');
    const slotInfo = require('../slot-info.js');
    const Offsets = require('../offsets.js');

    const relativeOffsets = Array.apply(0, new Array(Offsets.slotWidth / 8)).map((e, i) => i * 8);

    const getCondensedItems = (items, category) => {
        const itemCounts = {};

        const fullyKeyedItems = items.map(item => {
            const categoryFilepath = itemFileUtils.getCategoryFilepath(category);
            const categoryJson = itemFileUtils.getFileAsJsonOrEmptyJsObject(categoryFilepath);
            
            const copy = {};

            Object.keys(item).forEach(key => {
                if (Array.isArray(item[key])) {
                    copy[key] = item[key].slice();    
                } else {
                    copy[key] = item[key];
                }
            });

            if (!!categoryJson[item.name]) {
                copy.entries = categoryJson[item.name].entries.slice();
                copy.stackable = categoryJson[item.name].stackable;
                copy.unique = categoryJson[item.name].unique;
            } else {
                console.error(`${item.name} not found in ${category} item file!`);
                copy.entries = [];
            }

            return copy;
        });

        const filteredItems = fullyKeyedItems.filter((item) => {
            if (item.unique && itemCounts[item.name]) {
                return false
            } else if (item.stackable) {
                const alreadyExisted = !!itemCounts[item.name];

                if (!alreadyExisted) {
                    itemCounts[item.name] = 0;
                }
                
                itemCounts[item.name] += item.quantity;
                
                if (itemCounts[item.name] > 999) {
                    itemCounts[item.name] > 999
                }

                return !alreadyExisted;
            } else {
                itemCounts[item.name] = item.quantity;
                return true;
            }
        })

        const condensedItems = filteredItems.map(item => {
            item.quantity = itemCounts[item.name];
            return item;
        });

        return condensedItems;
    }

    return (saveFile, items, firstAvailableSlot, category, func) => {
        const realItems = getCondensedItems(items, category);

        const writeableItems = (() => {
            const isLastSection = category === 'keyitems';
            if (isLastSection) {
                // this deletes the slot after the last real key item
                return realItems.concat([{
                    entries: relativeOffsets.map(offset => {
                        return {
                            offset: offset,
                            value: 0
                        };
                    })
                }]);
            } else {
                return realItems;
            }
        })();

        if (writeableItems.length === 0) {
            return Promise.resolve(firstAvailableSlot);
        } else {
            const slotEntries = writeableItems.map((item, slotInCategory) => {
                const slot = firstAvailableSlot + slotInCategory;
                return {
                    slot: slot,
                    entries: item.entries
                };
            });

            const secondaryEntries = realItems.map((item, slotInCategory) => {
                const slot = firstAvailableSlot + slotInCategory;
                return func(item, slot, slotInCategory);
            }).reduce((acc, next) => {
                return acc.concat(next);
            }, []);

            return batchSetItemSlots(slotEntries, saveFile).then(nextAvailableSlot => {
                return batchOffsetSetter(secondaryEntries, saveFile).then(() => {
                    return nextAvailableSlot;
                });
            });
        }
    };
})();
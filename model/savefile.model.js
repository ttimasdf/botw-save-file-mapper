module.exports = (() => {
    return {
        read: (saveFile) => {
            return {
                inventory: Inventory.read(saveFile)
            };
        },
        write: (saveFile, modelJson) => {
            Inventory.write(saveFile, modelJson.inventory);
        }
    };
})();
module.exports = (() => {
    const fs = require('fs');
    const jBinary = require('jbinary');
    const saveFileUtils = require('./save-file-utils.js');
    const CONFIG = require('./config.js');
    const mapFileUtils = require('./map-file-utils.js');
    
    const saveFilename = 'game_data.sav';
    const saveFilepath = `${CONFIG.savepath}${saveFilename}`;
    const jsonEffectMapFile = `${CONFIG.exportpath}effectmap.json`;

    return (names) => {
        jBinary.load(saveFilepath, saveFileUtils.typeSet, function (err, binary) {
            const writeToOffset = saveFileUtils.buildWriter('uint32', binary);

            const effectMap = mapFileUtils.getFileAsJsonOrEmptyJsObject(jsonEffectMapFile);
            
            const lowercaseNames = names.map(_ => _.toLowerCase());

            lowercaseNames.forEach((name) => {
                const entries = mapFileUtils.getValueAtKeyPath(effectMap, name);

                entries.forEach((entry) => {
                   writeToOffset(entry.offset, entry.value);
                });
            });

            binary.saveAs(saveFilepath);
        });
    };
})();

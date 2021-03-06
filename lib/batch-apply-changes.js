module.exports = (saveFileOverride) => {
    const fs = require('fs');
    const arrayUtils = require('../util/array-utils.js');
    const saveFileUtils = require('../util/save-file-utils.js');
    const CONFIG = require('../config.json');
    const mapFileUtils = require('../util/map-file-utils.js');
    const readline = require('readline-sync');
    const float32 = require('../encoders_decoders/float32.js');
    const batchOffsetSetter = require('./batch-offset-setter.js');
    
    const saveFilename = 'game_data.sav';
    const saveFilepath = saveFileOverride || `${CONFIG.savepath}${saveFilename}`;
    const jsonEffectMapFile = `${CONFIG.mapfilepath}effectmap.json`;

    // options are currently: skipHardDependencies=true/false, skipSoftDependencies=true/false, withLogging=true/false
    const applyChanges = (effectMapFile, names, options) => {
        const skipHardDependencies = options && options.skipHardDependencies;
        const skipSoftDependencies = options && options.skipSoftDependencies;
        const withLogging = options && options.withLogging;
        const mapFile = effectMapFile || jsonEffectMapFile;

        const queuedChanges = {};

        const effectMap = mapFileUtils.getFileAsJsonOrEmptyJsObject(mapFile);

        const isEmpty = (value) => !value && value !== 0;

        const queueChange = (name) => {
            if (!queuedChanges[name]) {
                let [keypath, value] = name.split('=');
                const effect = mapFileUtils.getValueAtKeyPath(effectMap, keypath);

                if (withLogging) {
                    console.log(`Applying ${keypath}`);
                }

                if (!effect || !effect.entries) {
                    throw ('Entry ' + name + ' does not exist');
                } else {
                    // if this doesn't go before the dependencies, we can get into cycles of soft deps
                    queuedChanges[name] = true;

                    if (!skipHardDependencies && !!effect.harddependencies && effect.harddependencies.length > 0) {
                        effect.harddependencies.forEach(queueChange);
                    }

                    if (!skipSoftDependencies && !!effect.softdependencies && effect.softdependencies.length > 0) {
                        effect.softdependencies.forEach(queueChange);
                    }

                    const variableValuesExist = effect.entries.some(entry => entry.value === 'float' || entry.value === 'integer' || entry.value === 'ascii');

                    if (variableValuesExist && value === undefined) {
                        console.log(`No value provided for keypath ${name}!`);
                        return undefined;
                    }

                    queuedChanges[name] = effect.entries.map((entry) => {
                        if (entry.value === 'ascii') {
                            const paddedValue = Array.apply(0, new Array(entry.length))
                                .map((_, i) => value.charAt(i) || '\u0000').join('');

                            const splitIntoChunksOf4 = (str) => {
                                if (str.length == 0) {
                                    return [];
                                }
                                const chunk = str.slice(0, 4);
                                return [chunk].concat(splitIntoChunksOf4(str.slice(4)));
                            };

                            const chunks = splitIntoChunksOf4(paddedValue);

                            const chunkToHexVal = (chunk) => {
                                const chars = chunk.split('');
                                const hexString = chars.map((char) => {
                                    const code = char.charCodeAt(0);
                                    if (code < 16) {
                                        return `0${code}`;
                                    } else {
                                        return code.toString(16);
                                    }
                                }).join('');
                                return parseInt(hexString, 16) >>> 0;
                            };

                            return chunks.map((chunk, i) => {
                                const offset = entry.offset + i * 8;
                                const value = chunkToHexVal(chunk);
                                return { offset, value };
                            });
                        } else if (entry.value === 'integer') {
                            return {
                                offset: entry.offset,
                                value: value
                            };
                        } else if (entry.value === 'float') {
                            return {
                                offset: entry.offset,
                                value: float32.encode(value)
                            };
                        } else if (entry.value === true) {
                            return {
                                offset: entry.offset,
                                value: 1
                            };
                        } else if (entry.value === false) {
                            return {
                                offset: entry.offset,
                                value: 0
                            };
                        } else {
                            return entry;
                        }
                    });
                }
            }
        };

        const expandedNames = arrayUtils.flatten(names.map(name => {
            const path = name.split('.');
            const last = path.slice(-1)[0];
            const suffixes = last.split(',');
            const prefix = path.slice(0, -1).join('.');
            return suffixes.map(suffix => {
                if (!!prefix) {
                    return prefix + '.' + suffix;
                } else {
                    return suffix;
                }
            });
        }));

        expandedNames.forEach(queueChange);

        const entries = arrayUtils.flatten(Object.keys(queuedChanges).map(key => {
            return queuedChanges[key];
        }));

        return batchOffsetSetter(entries, saveFilepath);
    };

    return applyChanges;
};

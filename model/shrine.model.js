module.exports = (() => {
    return {
        read: (name, saveFile, keypathReader, changeReader) => {
            const hasUnearthedEntries = !!keypathReader(`shrines.${name}.unearthed`);
            const hasMonsterBaseEntries = !!keypathReader(`shrines.${name}.monsterbase`);
            const isChampionsBallad = !!keypathReader(`shrines.${name}.ischampionsballad`);

            let keysToRead = [
                `shrines.${name}.active`,
                `shrines.${name}.complete`,
                `shrines.${name}.found`,
                `shrines.${name}.pedestal.on`
            ];

            if (hasUnearthedEntries) {
                keysToRead.push(`shrines.${name}.unearthed`);
            }
            if (hasMonsterBaseEntries) {
                keysToRead.push(`shrines.${name}.monsterbase.conquered`);
            }

            const mapValues = changeReader(keysToRead);

            const shrineJson = {
                active: mapValues[`shrines.${name}.active`],
                complete: mapValues[`shrines.${name}.complete`],
                found: mapValues[`shrines.${name}.found`],
                pedestal: mapValues[`shrines.${name}.pedestal.on`]
            };

            if (hasUnearthedEntries) {
                shrineJson.unearthed = mapValues[`shrines.${name}.unearthed`];
            }
            if (hasMonsterBaseEntries) {
                shrineJson.monsterbaseconquered = mapValues[`shrines.${name}.monsterbase.conquered`];
            }
            if (isChampionsBallad) {
                shrineJson.ischampionsballad = isChampionsBallad;

            }

            return shrineJson;
        },
        write: (name, modelJson, saveFile, keypathReader, changeWriter) => {
            const hasUnearthedEntries = !!keypathReader(`shrines.${name}.unearthed`);
            const hasMonsterBaseEntries = !!keypathReader(`shrines.${name}.monsterbase`);

            const keys = [];

            const addKeyIfTrue = (val, key) => {
                if (val === true) {
                    keys.push(key);
                }
            };

            addKeyIfTrue(modelJson.active, `shrines.${name}.active`);
            addKeyIfTrue(!modelJson.active, `shrines.${name}.inactive`);

            addKeyIfTrue(modelJson.complete, `shrines.${name}.complete`);
            addKeyIfTrue(!modelJson.complete, `shrines.${name}.incomplete`);

            addKeyIfTrue(modelJson.found, `shrines.${name}.found`);
            addKeyIfTrue(!modelJson.found, `shrines.${name}.notfound`);

            addKeyIfTrue(modelJson.pedestal, `shrines.${name}.pedestal.on`);
            addKeyIfTrue(!modelJson.pedestal, `shrines.${name}.pedestal.off`);

            if (hasUnearthedEntries) {
                addKeyIfTrue(modelJson.unearthed, `shrines.${name}.unearthed`);
                addKeyIfTrue(!modelJson.unearthed, `shrines.${name}.buried`);
            }

            if (hasMonsterBaseEntries) {
                addKeyIfTrue(modelJson.conquered, `shrines.${name}.monsterbase.conquered`);
                addKeyIfTrue(!modelJson.conquered, `shrines.${name}.monsterbase.unconquered`);
            }

            return changeWriter(keys);
        }
    };
})();
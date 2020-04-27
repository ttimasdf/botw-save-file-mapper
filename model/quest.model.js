module.exports = (questCategory) => {
    const getOrderedStepKeys = (name, keypathReader) => {
        const begunKey = `${questCategory}.${name}.begun.set`;
        const completeKey = `${questCategory}.${name}.complete.set`;

        const alreadyRetrievedKeys = {};

        const getPreviousStepKey = (key) => {
            if (alreadyRetrievedKeys[key]) {
                return [];
            }

            alreadyRetrievedKeys[key] = true;

            if (key === begunKey) {
                return undefined;
            }

            const currentStep = keypathReader(key);

            if (currentStep === undefined) {
                console.error(`Tried to access undefined entry for keypath ${key} in model/quest.model.js`);
            }

            const allDependencies = (currentStep.harddependencies || [])
                .concat(currentStep.softdependencies || []);

            const previousSteps = allDependencies.filter(step => {
                const parts = step.split('.');
                const [depCategory, depName] = parts;
                const isASubtask = parts.some(part => part === 'subtasks');
                const [setOrUnsetKey] = parts.reverse();
                return setOrUnsetKey === 'set'
                    && !isASubtask
                    && step !== begunKey
                    && depCategory === questCategory
                    && depName === name;
            });

            return previousSteps || [begunKey];
        };

        const alreadyIncludedSteps = {};

        const duplicatesFilter = (step) => {
            const isFirstOccurance = !alreadyIncludedSteps[step];
            alreadyIncludedSteps[step] = true;
            return isFirstOccurance;
        }

        const stepKeys = [completeKey];
        let currentKeys = getPreviousStepKey(completeKey);
        while (currentKeys.length > 0) {
            const nextKey = currentKeys.pop();
            stepKeys.push(nextKey);
            currentKeys = getPreviousStepKey(nextKey).concat(currentKeys);
        }
        stepKeys.push(begunKey);

        return stepKeys.filter(duplicatesFilter).reverse();
    };

    return {
        read: (name, saveFile, keypathReader, changeReader) => {
            const allSteps = getOrderedStepKeys(name, keypathReader);

            const mapValues = changeReader(allSteps);

            const begunKey = `${questCategory}.${name}.begun.set`;
            const completeKey = `${questCategory}.${name}.complete.set`;

            const rewards = keypathReader(completeKey).rewards;

            const doneSteps = allSteps.filter(step => mapValues[step]);
            const notDoneSteps = allSteps.filter(step => !mapValues[step]);

            const questJson = {
                begun: mapValues[begunKey],
                complete: mapValues[completeKey],
                completedsteps: doneSteps,
                incompletesteps: notDoneSteps
            };

            if (!!rewards) {
                questJson.rewards = rewards;
            }

            return questJson;
        },
        write: (name, modelJson, saveFile, keypathReader, changeWriter, options) => {
            if (!modelJson) {
                return Promise.resolve();
            }
            var keys;
            if (modelJson.completedsteps !== undefined && modelJson.begun !== undefined) {
                keys = modelJson.completedsteps.slice();
                keys.unshift(`${questCategory}.${name}.begun.${(modelJson.begun)?("set"):("unset")}`);
                keys.unshift(`${questCategory}.${name}.complete.${(modelJson.begun)?("set"):("unset")}`);
            }
            else {
                keys = modelJson.completedsteps;
            }

            return changeWriter(keys, options);
        }
    };
};

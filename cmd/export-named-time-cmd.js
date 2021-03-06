const saveNamedChange = require('../lib/save-named-change.js')();
const CONFIG = require('../config.json');
const jsonEffectMapFile = `${CONFIG.mapfilepath}effectmap.json`;

const name = process.argv[2] || readline.question('Name of time: ');

if (!!name) {
    const offsets = [
        0x000C14B0
    ];
    saveNamedChange(jsonEffectMapFile, 'time.' + name, offsets);
    console.log(`Time ${name} saved!`);
} else {
    console.log('Unnamed times not allowed.');
}

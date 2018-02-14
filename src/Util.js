/**
 * 
 * @param {SMML.GlobalSetting} globalSetting 
 * @param {string} key 
 * @param {number} value 
 * @param {function} criterion 
 */
function AssignSetting(globalSetting, key, value, criterion) {
    if (typeof value !== 'number') throw new TypeError(`Non-numeric value passed in as ${key}`)
    if (!criterion(value)) throw new RangeError(`${key} out of range`)
    globalSetting[key] = value
}

module.exports = {
    AssignSetting
}

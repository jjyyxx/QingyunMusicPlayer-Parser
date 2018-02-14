class FixedLengthQueue extends Array {
    /**
     * 
     * @param {number} length
     */
    constructor (length) {
        super(length)
        this.pointer = 0
    }

    push (value) {
        if (this.pointer < this.length) {
            this[this.pointer] = value
            this.pointer += 1
        } else {
            this.splice(0, 1)
            this[this.pointer - 1] = value
        }
    }

    first () {
        return this[0]
    }
}

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
    FixedLengthQueue,
    AssignSetting
}

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

const Tonality = {
    'C': 0,
    'G': 7,
    'D': 2,
    'A': 9,
    'E': 4,
    'B': -1,
    '#F': 6,
    '#C': 1,
    'F': 5,
    'bB': -2,
    'bE': 3,
    'bA': 8,
    'bD': 1,
    'bG': 6,
    'bC': -1,

    'F#': 6,
    'C#': 1,
    'Bb': -2,
    'Eb': 3,
    'Ab': 8,
    'Db': 1,
    'Gb': 6,
    'Cb': -1,
}

module.exports = {
    FixedLengthQueue,
    AssignSetting,
    Tonality
}

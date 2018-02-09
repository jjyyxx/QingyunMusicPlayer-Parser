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

module.exports = {
    FixedLengthQueue
}

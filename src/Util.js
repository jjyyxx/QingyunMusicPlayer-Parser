const STD = require('./STD')

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

function applyFunction(setting, token) {
    return STD[token.Name].apply(setting, token.Argument.map((arg) => {
        switch (arg.Type) {
        case 'String':
            return arg.Content
        case 'Expression':
            return eval(arg.Content.replace(/log2/g, 'Math.log2'))    // potentially vulnerable
        }
    }))
}

module.exports = {
    FixedLengthQueue,
    applyFunction
}

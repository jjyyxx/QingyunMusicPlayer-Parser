const { readFileSync } = require('fs')  // TODO: consider async version

class LibLoader {
    /**
     *
     * @param {SMML.Library[]} libs
     */
    constructor(libs) {
        this.internalLib = []
        this.externalLib = []
        for (const lib of libs) {
            if (lib.Type === 'Internal') {
                this.internalLib.push(lib)
            } else {
                this.externalLib.push(lib)
            }
        }

        this.result = {
            ChordNotation: {
                M: [0, 4, 7],
                m: [0, 3, 7],
                a: [0, 4, 8],
                d: [0, 3, 6],
                p: [0, 7, 12]
            },
            ChordOperator: {
                o: [[0, -1, 0], [1, 1, 12]],
                u: [[-1, -1, -12], [0, -1, 0]],
                i: [[1, 1, 12], [2, -1, 0]],
                j: [[1, 2, 12], [3, -1, 0]]
            },
            MetaInformation: {},
            FunctionPackage: {
                STD: require('./STD')
            },
            MIDIEventList: {},
            Library: {}
        }
    }

    load() {
        
    }

    /**
     * load external lib
     * @param {SMML.Library} libs
     */
    loadExternalLibrary(lib) {
        throw new Error('Not implemented!')
    }
}

module.exports = LibLoader

const { readFileSync, existsSync } = require('fs')  // TODO: consider async version

class LibLoader {
    /**
     *
     * @param {SMML.Library[]} libs
     */
    constructor(libs = [], withDefault = true) {
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
            ChordNotations: {},
            ChordOperators: {},
            MetaInformation: {},
            FunctionPackage: {},
            MIDIEventList: {},
            Library: {}
        }
        if (withDefault) {
            Object.assign(this.result, LibLoader.Default)
        }
    }

    load() {
        for (const lib of this.internalLib) {
            this.loadInternalLibrary(lib)
        }
        for (const lib of this.externalLib) {
            this.loadExternalLibrary(lib)
        }
        return this.result
    }

    /**
     * load internal lib
     * @param {SMML.InternalLibrary} lib 
     */
    loadInternalLibrary(lib) {
        switch (lib.Type) {
        case LibLoader.libType.ChordNotation:
            lib.Data.forEach((notation) => {
                this.result.ChordNotation[notation.Notation] = notation.Pitches
            })
            break
        case LibLoader.libType.ChordOperator:
            lib.Data.forEach((operator) => {
                this.result.ChordOperator[operator.Notation] = operator.Pitches
            })
            break
        case LibLoader.libType.MetaInformation:
            break
        case LibLoader.libType.FunctionPackage:
            break
        case LibLoader.libType.MIDIEventList:
            break
        case LibLoader.libType.Library:
            Object.assign(this.result, new LibLoader(lib.Data, false).load())
        }
    }

    /**
     * load external lib
     * @param {SMML.ExternalLibrary} lib
     */
    loadExternalLibrary(lib) {
        if (existsSync(lib.Path)) {
            const content = readFileSync(lib.Path, 'utf8')
            switch (lib.Type) {
            case LibLoader.libType.ChordNotation:
                JSON.parse(content).forEach((notation) => {
                    this.result.ChordNotation[notation.Notation] = notation.Pitches
                })
                break
            case LibLoader.libType.ChordOperator:
                JSON.parse(content).forEach((operator) => {
                    this.result.ChordOperator[operator.Notation] = operator.Pitches
                })
                break
            case LibLoader.libType.MetaInformation:
                break
            case LibLoader.libType.FunctionPackage:
                break
            case LibLoader.libType.MIDIEventList:
                break
            case LibLoader.libType.Library:
                Object.assign(this.result, new LibLoader(JSON.parse(content), false).load())
            }
        }
    }
}

LibLoader.libType = {
    ChordNotation: 'ChordNotations',
    ChordOperator: 'ChordOperators',
    MetaInformation: 'MetaInformation',
    FunctionPackage: 'FunctionPackage',
    MIDIEventList: 'MIDIEventList',
    Library: 'Library'
}

LibLoader.Default = {
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
        STD: require('./STD'),
        applyFunction (setting, token) {
            return this.STD[token.Name].apply(setting, token.Argument.map((arg) => {
                switch (arg.Type) {
                case 'String':
                    return arg.Content
                case 'Expression':
                    return eval(arg.Content.replace(/log2/g, 'Math.log2'))    // potentially vulnerable
                }
            }))
        }
    },
    MIDIEventList: {},
    Library: {}
}

module.exports = LibLoader

// eslint-disable-next-line no-unused-vars
const { AssignSetting } = require('./Util')
// eslint-disable-next-line no-unused-vars
const { SubtrackParser } = require('./TrackParser')

class LibLoader {
    /**
     *
     * @param {SMML.Library[]} libs
     */
    constructor(libs = [], withDefault = true) {
        this.internalLib = []
        this.externalLib = []
        for (const lib of libs) {
            if (lib.Storage === 'Internal') {
                this.internalLib.push(lib)
            } else {
                this.externalLib.push(lib)
            }
        }

        this.result = {
            ChordNotation: {},
            ChordOperator: {},
            MetaInformation: {},
            FunctionPackage: {
                Custom: {}
            },
            MIDIEventList: {},
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
        let code
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
            code = 'this.result.FunctionPackage.Custom = {' + lib.Data.map((func) => func.Code).join(',') + '}'
            eval(code)
            break
        case LibLoader.libType.MIDIEventList:
            break
        case LibLoader.libType.Library:
        // Object.assign(this.result, new LibLoader(lib.Data, false).load())
        }
    }

    /**
     * load external lib
     * @param {SMML.ExternalLibrary} lib
     */
    loadExternalLibrary(lib) {
        switch (lib.Type) {
        case LibLoader.libType.ChordNotation:
            // JSON.parse(content).forEach((notation) => {
            //     this.result.ChordNotation[notation.Notation] = notation.Pitches
            // })
            break
        case LibLoader.libType.ChordOperator:
            // JSON.parse(content).forEach((operator) => {
            //     this.result.ChordOperator[operator.Notation] = operator.Pitches
            // })
            break
        case LibLoader.libType.MetaInformation:
            break
        case LibLoader.libType.FunctionPackage:
            break
        case LibLoader.libType.MIDIEventList:
            break
        case LibLoader.libType.Library:
            this.loadSubPackage(lib.Content)
        }
    }

    /**
     * 
     * @param {SMML.Library[]} content 
     */
    loadSubPackage(content) {
        const sub = new LibLoader(content, false).load()
        this.result.ChordNotation = {
            ...this.result.ChordNotation,
            ...sub.ChordNotation
        }
        this.result.ChordOperator = {
            ...this.result.ChordOperator,
            ...sub.ChordOperator
        }
        this.result.FunctionPackage.Custom = {
            ...this.result.FunctionPackage.Custom,
            ...sub.FunctionPackage.Custom
        }
        this.result.MetaInformation = {
            ...this.result.MetaInformation,
            ...sub.MetaInformation
        }
        this.result.MIDIEventList = {
            ...this.result.MIDIEventList,
            ...sub.MIDIEventList
        }
    }
}

LibLoader.libType = {
    ChordNotation: 'ChordNotation',
    ChordOperator: 'ChordOperator',
    MetaInformation: 'MetaInformation',
    FunctionPackage: 'Function',
    MIDIEventList: 'MIDIEventList',
    Library: 'Package'
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
        Custom: {},
        applyFunction(parser, token) {
            return this.locateFunction(token.Name).apply({
                Settings: parser.Settings,
                Libraries: parser.Libraries
            }, token.Argument.map((arg) => {
                switch (arg.Type) {
                case 'Read':
                    return Number(arg.Content)
                case 'String':
                    return arg.Content
                case 'Expression':
                    return eval(arg.Content.replace(/Log2/g, 'Math.log2'))
                default:
                    return arg
                }
            }))
        },
        locateFunction (name) {
            if (name in this.STD) return this.STD[name]
            if (name in this.Custom) return this.Custom[name]   // can be changed to employ package mechanism
            return () => {}
        }
    },
    MIDIEventList: {},
    Library: {}
}

module.exports = LibLoader

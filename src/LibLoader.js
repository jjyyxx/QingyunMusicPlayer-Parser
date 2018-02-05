class LibLoader {
    /**
     *
     * @param {SMML.Library[]} libs
     */
    constructor(libs) {
        return libs.map((lib) => {
            if (lib.Type === 'Internal') {
                return lib
            } else {
                return this.loadExternalLibrary(lib)
            }
        })
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

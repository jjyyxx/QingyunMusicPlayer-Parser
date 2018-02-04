class Parser {
    /**
     * Parser
     * @param {SMML.TokenizedData} tokenizedData 
     */
    constructor (tokenizedData) {
        this.tokenizedData = tokenizedData
        this.Libraries = this.loadLibrary(this.tokenizedData.Library)
        this.result = {
            Sections: undefined
        }
        this.SectionContext = undefined
    }

    /**
     * 
     * @param {SMML.Library[]} libs 
     */
    loadLibrary (libs) {
        return libs.map((lib) => {
            if (lib.Type === "Internal") {
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
    loadExternalLibrary (lib) {
        throw new Error ('Not implemented!')
    }

    parse () {
        this.result.Sections = this.tokenizedData.Sections.map((section) => this.parseSection(section))
    }

    /**
     * parse section
     * @param {SMML.Section} section 
     */
    parseSection (section) {
        this.SectionContext = {
            Settings: section.Settings
        }
        return {
            ID: section.ID,
            Tracks: section.Tracks.map((track) => this.parseTrack(track))
        }
    }

    /**
     * parse a single track
     * @param {SMML.Track} track 
     */
    parseTrack (track) {
        
    }
}

module.exports = Parser

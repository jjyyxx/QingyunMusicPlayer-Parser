const Loader = require('./LibLoader')
const GlobalSetting = require('./GlobalSetting')
const { applyFunction } = require('./Util')
const TrackParser = require('./TrackParser')

class Parser {
    /**
     * Parser
     * @param {SMML.TokenizedData} tokenizedData
     */
    constructor(tokenizedData) {
        this.tokenizedData = tokenizedData
        this.Libraries = new Loader(this.tokenizedData.Library).load()
        this.result = {
            Sections: undefined
        }
        this.SectionContext = undefined
    }

    parse() {
        this.result.Sections = this.tokenizedData.Sections.map((section) => this.parseSection(section))
        return this.result
    }

    /**
     * parse section
     * @param {SMML.Section} section
     */
    parseSection(section) {
        const settings = new GlobalSetting()
        for (const token of section.Settings) {
            switch (token.Type) {
            case 'FUNCTION':
                this.Libraries.FunctionPackage.applyFunction(settings, token)
                break
            case 'RepeatBegin':
                break
            case 'Volta':
                break
            }
        }
        this.SectionContext = {
            Settings: settings
        }
        return {
            ID: section.ID,
            Tracks: [].concat(...section.Tracks.map((track) => new TrackParser(track, settings.extend(), this.Libraries).parseTrack()))
        }
    }
}

module.exports = Parser

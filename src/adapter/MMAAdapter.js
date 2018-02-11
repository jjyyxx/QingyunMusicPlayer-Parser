/**
 * @class
 * @implements {SMML.Adapter}
 */
class MMAAdapter {
    /**
     * 
     * @param {SMML.ParsedSection[]} parsedSection 
     */
    constructor(parsedSection) {
        this.parsedSection = parsedSection
    }

    adapt() {
        this.parsedSection.forEach((section) => {
            section.Tracks.forEach((track) => {
                
            })
        })
    }
}

module.exports = MMAAdapter

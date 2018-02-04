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
            Tracks: [].concat(...section.Tracks.map((track) => new TrackParser(track, section.Settings/* FIXME: create a duplicate instead of passing ref directly*/).parseTrack()))
        }
    }


}

class TrackParser {
    static pitchDict = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 }
    static pitchOperatorDict = {'#': 1, 'b': -1, '\'': 7, ',': -7}

    /**
     * 
     * @param {SMML.ParsedNote[]} contents 
     */
    static calculateDuration(contents) {
        return contents.reduce((sum, cur) => sum + cur.Duration, 0)
    }

    /**
     * 
     * @param {SMML.Track} track 
     * @param {SMML.GlobalSetting} sectionSettings
     */
    constructor (track, sectionSettings) {
        this.ID = track.ID
        this.Instruments = track.Instruments
        this.Contents = track.Contents
        this.Settings = sectionSettings
        this.CurrentInstrument = undefined
        this.Context = {
            afterTie: false,
            notesBeforeTie: [],
            startTime: 0
        }
    }

    parseTrack () {
        const result = []
        for (const Instrument of this.Instruments) {
            this.CurrentInstrument = Instrument
            const Contents = this.parseTrackContent(this.Contents)
            result.push({
                ID: this.ID,
                Instrument: Instrument.Instrument,
                Contents,
                Meta: {
                    FadeIn: this.Settings.FadeIn,
                    FadeOut: this.Settings.FadeOut,
                    Duration: TrackParser.calculateDuration(Contents)
                }
            })
        }
        return result
    }

    /**
     * parse track content
     * @param {(SMML.BaseToken | SMML.SubTrack)[]} contents
     * @returns {SMML.ParsedNote[]}
     */
    parseTrackContent (contents) {
        const result = []
        for (var token of contents) {
            switch (token.Type) {
                case 'SubTrack':
                    result.push(...this.parseTrackContent(token.Contents))
                    break
                case 'Note':
                    this.Context.notesBeforeTie = this.parseNote(token)
                    result.push(...this.Context.notesBeforeTie)
                    break
                case 'Tie':
                    this.Context.afterTie = true
                    break
            }
        }
        return result
    }

    /**
     * 
     * @param {SMML.NoteToken} note
     * @returns {SMML.ParsedNote[]}
     */
    parseNote (note) {  // FIXME: more branch
        const result = []
        const pitches = []
        note.duration = this.parseDuration(note)
        for (const pitch of note.Pitches) {
            pitch.PitchOperators += note.PitchOperators
            pitches.push(this.parsePitch(pitch))
        }
        if (this.Context.afterTie) {
            this.Context.afterTie = false
            this.Context.notesBeforeTie.forEach((prevNote) => {
                const index = pitches.indexOf(prevNote.Pitch)
                if (index === -1) return
                prevNote.Duration += note.duration
                pitches.splice(index, 1)
                note.Pitches.splice(index, 1)
            })
        }
        const pitchLength = note.Pitches.length
        for (let i = 0; i < length; i++) {
            result.push({
                Type: 'Note',
                Pitch: pitches[i],
                Volume: this.Settings.Volume * this.CurrentInstrument.Proportion,
                Duration: note.duration,
                StartTime: this.Context.startTime
            })
        }
        this.Context.startTime += duration
    }

    /**
     * 
     * @param {SMML.Pitch} pitch
     * @returns {number}
     */
    parsePitch (pitch) {
        return this.Settings.Key + this.Settings.Octave * 12 + TrackParser.pitchDict[pitch.ScaleDegree] + pitch.PitchOperators.split('').reduce((sum, cur) => sum + TrackParser.pitchOperatorDict[cur], 0)
    }

    /**
     * 
     * @param {SMML.NoteToken} note
     * @returns {number}
     */
    parseDuration (note) {
        let duration = 1
        let pointer = 0
        const length = note.DurationOperators.length
        while (pointer < length) {
            const char = note.DurationOperators.charAt(pointer)
            if (char === '-') {
                duration += 1
                pointer += 1
            } else if (char === '_') {
                duration /= 2
                pointer += 1
            } else if (char === '.') {
                const dotCount = 1
                pointer += 1
                while (note.DurationOperators.charAt(pointer) === '.') {
                    dotCount += 1
                    pointer += 1
                }
                duration *= 2 - Math.pow(2, -dotCount)
            }
        }
        return duration
    }
}

module.exports = Parser

const STD = require('./STD')
const Loader = require('./LibLoader')
const { FixedLengthQueue } = require('./Util')
const GlobalSetting = require('./GlobalSetting')

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
                applyFunction(settings, token)
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

class TrackParser {
    /**
     *
     * @param {SMML.Track} track
     * @param {SMML.GlobalSetting} sectionSettings
     */
    constructor(track, sectionSettings, libraries) {
        this.ID = track.ID
        this.Instruments = track.Instruments
        this.Libraries = libraries
        this.Contents = track.Contents
        this.Settings = sectionSettings
        this.CurrentInstrument = undefined
        this.Context = {
            afterTie: false,
            notesBeforeTie: [],
            startTime: 0,
            pitchQueue: new FixedLengthQueue(this.Settings.Trace)
        }
    }

    parseTrack() {
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
                    Duration: this.Context.startTime
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
    parseTrackContent(contents) {
        const result = []
        for (var token of contents) {
            switch (token.Type) {
            case 'FUNCTION':
                applyFunction(this.Settings, token)
                break
            case 'Subtrack':
                result.push(...this.parseTrackContent(token.Contents)) //子音轨也要返回 Meta，含 Duration 和头尾未完全小节拍数
                break
            case 'Note':
                this.Context.notesBeforeTie = this.parseNote(token)
                result.push(...this.Context.notesBeforeTie)
                break
            case 'Tie':
                this.Context.afterTie = true
                break
            case 'BarLine':

            }
        }
        return result
    }

    /**
     *
     * @param {SMML.NoteToken} note
     * @returns {SMML.ParsedNote[]}
     */
    parseNote(note) {  // FIXME: Arpeggio
        const result = []
        const pitches = []
        const duration = this.parseDuration(note)
        const actualDuration = duration * this.Settings.Stac[note.Staccato]

        // calculate pitch array and record it for further trace
        const pitchDelta = this.parseDeltaPitch(note.PitchOperators)
        if (note.Pitches.length === 1 && note.Pitches[0].ScaleDegree === '-1') {
            pitches.push(...this.Context.pitchQueue.first())
        } else {
            for (const pitch of note.Pitches) {
                if (pitch.ScaleDegree === '0') continue
                if (pitch.ScaleDegree === '10') {
                    pitches.push(null)
                }
                if (pitch.ChordNotations === '') {
                    pitches.push(this.parsePitch(pitch) + pitchDelta)
                } else {
                    const basePitch = this.parsePitch(pitch) + pitchDelta
                    pitches.push(...TrackParser.parseChord(pitch).map((subPitch) => subPitch + basePitch))
                }
            }
        }
        this.Context.pitchQueue.push(pitches.slice(0))

        // merge pitches with previous ones if tie exists
        if (this.Context.afterTie) {
            this.Context.afterTie = false
            this.Context.notesBeforeTie.forEach((prevNote) => {
                const index = pitches.indexOf(prevNote.Pitch)
                if (index === -1) return
                prevNote.Duration += duration
                pitches.splice(index, 1)
            })
        }

        const volumeScale = note.VolumeOperators.split('').reduce((sum, cur) => sum * cur === '>' ? this.Settings.Accent : cur === ':' ? this.Settings.Light : 1, 1)
        const volume = this.Settings.Volume * this.CurrentInstrument.Proportion * volumeScale
        for (const pitch of pitches) {
            result.push({
                Type: 'Note',
                Pitch: pitch,
                Volume: volume,
                Duration: actualDuration,
                StartTime: this.Context.startTime
            })
        }
        this.Context.startTime += duration
        return result
    }

    /**
    *
    * @param {SMML.Pitch} pitch
    * @returns {number[]}
    */
    parseChord (pitch) {
        const pitches = this.Libraries.ChordNotations[pitch.ChordNotations]
        if (pitch.ChordOperators === '') return pitches
        const operators = this.Libraries.ChordOperators[pitch.ChordOperators]
        const pitchResult = []
        operators.forEach(([head, tail, delta]) => {
            if (head > 0) {
                head -= 1
            }
            if (tail > 0) {
                pitchResult.push(...pitches.slice(head, tail).map((pitch) => pitch + delta))
            } else if (tail === -1) {
                pitchResult.push(...pitches.slice(head).map((pitch) => pitch + delta))
            } else {
                pitchResult.push(...pitches.slice(head, tail + 1).map((pitch) => pitch + delta))
            }
        })
        return pitchResult
    }

    /**
     *
     * @param {SMML.Pitch} pitch
     * @returns {number}
     */
    parsePitch(pitch) {
        return this.Settings.Key + this.Settings.Octave * 12 + TrackParser.pitchDict[pitch.ScaleDegree] + this.parseDeltaPitch(pitch.PitchOperators)
    }

    parseDeltaPitch(pitchOperators) {
        return pitchOperators.split('').reduce((sum, cur) => sum + TrackParser.pitchOperatorDict[cur], 0)
    }

    /**
     *
     * @param {SMML.NoteToken} note
     * @returns {number}
     */
    parseDuration(note) {
        let duration = 1
        let pointer = 0
        let dotCount = 0
        const length = note.DurationOperators.length
        while (pointer < length) {
            const char = note.DurationOperators.charAt(pointer)
            switch (char) {
            case '-':
                duration += 1
                pointer += 1
                break
            case '_':
                duration /= 2
                pointer += 1
                break
            case '.':
                dotCount = 1
                pointer += 1
                while (note.DurationOperators.charAt(pointer) === '.') {
                    dotCount += 1
                    pointer += 1
                }
                duration *= 2 - Math.pow(2, -dotCount)
                break
            }
        }
        return duration
    }
}
TrackParser.pitchDict = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 }
TrackParser.pitchOperatorDict = { '#': 1, 'b': -1, '\'': 12, ',': -12 }

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

module.exports = { Parser, TrackParser }

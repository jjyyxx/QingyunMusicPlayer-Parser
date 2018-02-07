const { FixedLengthQueue } = require('./Util')

class TrackParser {
    /**
     * 
     * @param {SMML.ParsedTrack} trackResult 
     */
    static processPedal (trackResult) {
        const contents = trackResult.Contents
        let press
        let release
        while (true) {
            press = contents.findIndex((tok) => tok.Type === 'PedalPress')
            release = contents.findIndex((tok) => tok.Type === 'PedalRelease')
            if (press === -1) break
            if (release === -1) {
                const dur = trackResult.Meta.Duration - contents[press].StartTime
                contents.splice(press, 1)
                contents.slice(press).forEach((tok) => tok.Duration = dur)
                break
            }
            while (release < press) {
                contents.splice(release, 1)
                release = contents.findIndex((tok) => tok.Type === 'PedalRelease')
                press -= 1
            }
            const dur = contents[release].StartTime - contents[press].StartTime
            contents.splice(release, 1)
            contents.splice(press, 1)
            contents.slice(press, release).forEach((tok) => tok.Duration = dur)
        }
    }

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
            pitchQueue: new FixedLengthQueue(this.Settings.Trace),
            warnings: []
        }
    }

    /**
     * @returns {SMML.ParsedTrack[]}
     */
    parseTrack() {
        const result = []
        const last = this.Contents.pop()
        const last2 = this.Contents.pop()
        if (last.Type === 'BarLine' && last2.Type === 'BarLine') {
            last2.Terminal = true
            this.Contents.push(last2)
        } else {
            if (last.Type === 'BarLine') {
                last.Terminal = true
            }
            this.Contents.push(last2)
            this.Contents.push(last)
        }
        for (const Instrument of this.Instruments) {
            this.CurrentInstrument = Instrument
            const trackResult = this.parseTrackContent(this.Contents)
            TrackParser.processPedal(trackResult)
            result.push(trackResult)
        }
        return result
    }

    /**
     * parse track content
     * @param {(SMML.BaseToken | SMML.SubTrack)[]} contents
     * @returns {SMML.ParsedTrack}
     */
    parseTrackContent(contents) {
        const result = []
        const localContext = {
            leftIncomplete: 0,
            rightIncomplete: undefined,
            leftFirst: true,
            subtrackTemp: undefined,
            duration: 0,
            noteDuration: undefined
        }
        for (var token of contents) {
            switch (token.Type) {
            case 'FUNCTION':
                this.handleSubtrack(this.Libraries.FunctionPackage.applyFunction(this.Settings, token), localContext)
                result.push(...localContext.subtrackTemp.Contents)
                break
            case 'Subtrack':
                this.handleSubtrack(this.parseSubtrack(token), localContext)
                result.push(...localContext.subtrackTemp.Contents)
                break
            case 'Note':
                this.handleNote(token, localContext)
                this.Context.notesBeforeTie = this.parseNote(token)
                result.push(...this.Context.notesBeforeTie)
                break
            case 'Tie':
                this.Context.afterTie = true
                break
            case 'BarLine':
                this.handleBarLine(token, localContext)
                break
            case 'PedalPress':
            case 'PedalRelease':
                result.push({
                    Type: token.Type,
                    StartTime: this.Context.startTime
                })
                break
            case 'Clef':
            case 'Whitespace':
            case 'Undefined':
                break
            }
        }
        
        if (!((localContext.leftIncomplete === this.Settings.Bar && localContext.rightIncomplete === this.Settings.Bar) || (localContext.leftIncomplete + localContext.rightIncomplete === this.Settings.Bar))) {
            this.Context.warnings.push(new Error('Not enough'))
        }
        return {
            Contents: result,
            Meta: {
                FadeIn: this.Settings.FadeIn,
                FadeOut: this.Settings.FadeOut,
                Duration: localContext.duration,
                Single: localContext.leftFirst,
                Incomplete: [this.Settings.Bar - localContext.leftIncomplete, this.Settings.Bar - localContext.rightIncomplete]
            }
        }
    }

    isLegalBar (bar) {
        return bar === undefined || bar === this.Settings.Bar || bar === 0
    }

    handleSubtrack (subtrack, localContext) {
        if (subtrack === undefined) {
            localContext.subtrackTemp = {
                Contents: []
            }
            return
        }
        localContext.subtrackTemp = subtrack
        localContext.duration += localContext.subtrackTemp.Meta.Duration
        if (localContext.subtrackTemp.Meta.Single) {
            if (localContext.leftFirst) {
                localContext.leftIncomplete += localContext.subtrackTemp.Meta.Incomplete[0]
            } else {
                localContext.rightIncomplete += localContext.subtrackTemp.Meta.Incomplete[0]
            }
        } else {
            if (localContext.leftFirst) {
                localContext.leftIncomplete += localContext.subtrackTemp.Meta.Incomplete[0]
                localContext.leftFirst = false
                localContext.rightIncomplete = localContext.subtrackTemp.Meta.Incomplete[1]
            } else {
                localContext.rightIncomplete += localContext.subtrackTemp.Meta.Incomplete[0]
                if (!this.isLegalBar(localContext.rightIncomplete)) this.Context.warnings.push(new Error('Not enough'))
                localContext.rightIncomplete = localContext.subtrackTemp.Meta.Incomplete[1]
            }
        }
    }

    handleNote (note, localContext) {
        localContext.noteDuration = this.parseDuration(note)
        localContext.duration += localContext.noteDuration
        if (localContext.leftFirst) {
            localContext.leftIncomplete += localContext.noteDuration
        } else {
            localContext.rightIncomplete += localContext.noteDuration
        }
    }

    handleBarLine (barLine, localContext) {
        localContext.leftFirst = false
        if (barLine.Terminal !== true) {
            if (!this.isLegalBar(localContext.rightIncomplete)) {
                this.Context.warnings.push(new Error('Not enough'))
            }
            localContext.rightIncomplete = 0
        }
    }

    /**
     * 
     * @param {SMML.SubTrack} subtrack
     * @returns {SMML.ParsedTrack} 
     */
    parseSubtrack (subtrack) {
        if (subtrack.Repeat < 0) {
            return this.parseNegativeSubTrack(subtrack)
        } else {
            return this.parsePositiveSubTrack(subtrack)
        }
    }

    parsePositiveSubTrack (subtrack) {
        const result = []
        const localContext = {
            leftIncomplete: 0,
            rightIncomplete: undefined,
            leftFirst: true,
            subtrackTemp: undefined,
            duration: 0,
            noteDuration: undefined
        }
        for (let i = 1; i <= subtrack.Repeat; i++) {
            let skip = false
            for (const token of subtrack.Contents) {
                if (skip && (token.Type !== 'BarLine' || (token.Order.indexOf(i) === -1))) continue
                switch (token.Type) {
                case 'FUNCTION':
                    this.handleSubtrack(this.Libraries.FunctionPackage.applyFunction(this.Settings, token), localContext)
                    result.push(...localContext.subtrackTemp.Contents)
                    break
                case 'Subtrack':
                    this.handleSubtrack(this.parseSubtrack(token), localContext)
                    result.push(...localContext.subtrackTemp.Contents)
                    break
                case 'Note':
                    this.handleNote(token, localContext)
                    this.Context.notesBeforeTie = this.parseNote(token)
                    result.push(...this.Context.notesBeforeTie)
                    break
                case 'Tie':
                    this.Context.afterTie = true
                    break
                case 'BarLine':
                    this.handleBarLine(token, localContext)
                    if (skip) {
                        skip = false
                    } else {
                        skip = token.Order.length > 0 && token.Order.indexOf(i) === -1
                    }
                    break
                case 'PedalPress':
                case 'PedalRelease':
                    result.push({
                        Type: token.Type,
                        StartTime: this.Context.startTime
                    })
                    break
                case 'Clef':
                case 'Whitespace':
                case 'Undefined':
                    break
                }
            }
        }
        return {
            Contents: result,
            Meta: {
                Duration: localContext.duration,
                Single: localContext.leftFirst,
                Incomplete: [localContext.leftIncomplete, localContext.rightIncomplete]
            }
        }
    }

    parseNegativeSubTrack (subtrack) {
        const result = []
        const localContext = {
            leftIncomplete: 0,
            rightIncomplete: undefined,
            leftFirst: true,
            subtrackTemp: undefined,
            duration: 0,
            noteDuration: undefined
        }
        for (let i = 1; i <= - subtrack.Repeat; i++) {
            for (const token of subtrack.Contents) {
                switch (token.Type) {
                case 'FUNCTION':
                    this.handleSubtrack(this.Libraries.FunctionPackage.applyFunction(this.Settings, token), localContext)
                    result.push(...localContext.subtrackTemp.Contents)
                    break
                case 'Subtrack':
                    this.handleSubtrack(this.parseSubtrack(token), localContext)
                    result.push(...localContext.subtrackTemp.Contents)
                    break
                case 'Note':
                    this.handleNote(token, localContext)
                    this.Context.notesBeforeTie = this.parseNote(token)
                    result.push(...this.Context.notesBeforeTie)
                    break
                case 'Tie':
                    this.Context.afterTie = true
                    break
                case 'BarLine':
                    this.handleBarLine(token, localContext)
                    break
                case 'PedalPress':
                case 'PedalRelease':
                    result.push({
                        Type: token.Type,
                        StartTime: this.Context.startTime
                    })
                    break
                case 'Clef':
                case 'Whitespace':
                case 'Undefined':
                    break
                }
                if ((i === - subtrack.Repeat) && (token.Skip === true)) break
            }
        }
        return {
            Contents: result,
            Meta: {
                Duration: localContext.duration,
                Single: localContext.leftFirst,
                Incomplete: [localContext.leftIncomplete, localContext.rightIncomplete]
            }
        }
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
// TrackParser.trackRepeatType = {
//     None: 0,
//     Positive: 1,
//     Negative: -1
// }

module.exports = TrackParser

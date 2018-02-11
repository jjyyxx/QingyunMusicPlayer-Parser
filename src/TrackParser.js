class TrackParser {
    /**
     * 
     * @param {SMML.ParsedTrack} trackResult 
     */
    static processPedal (trackResult) {
        const content = trackResult.Content
        let press
        let release
        // eslint-disable-next-line no-constant-condition
        while (true) {
            press = content.findIndex((tok) => tok.Type === 'PedalPress')
            release = content.findIndex((tok) => tok.Type === 'PedalRelease')
            if (press === -1) break
            if (release === -1) {
                const dur = trackResult.Meta.Duration - content[press].StartTime
                content.splice(press, 1)
                content.slice(press).forEach((tok) => tok.Duration = dur)
                break
            }
            while (release < press) {
                content.splice(release, 1)
                release = content.findIndex((tok) => tok.Type === 'PedalRelease')
                press -= 1
            }
            const dur = content[release].StartTime - content[press].StartTime
            content.splice(release, 1)
            content.splice(press, 1)
            content.slice(press, release).forEach((tok) => tok.Duration = dur)
        }
    }

    /**
     *
     * @param {SMML.Track} track
     * @param {SMML.GlobalSetting} sectionSettings
     */
    constructor(track, sectionSettings, libraries, isSubtrack = false) {
        this.isSubtrack = isSubtrack
        this.ID = track.ID
        this.Instruments = track.Instruments
        this.Libraries = libraries
        this.Content = track.Content
        this.Settings = sectionSettings
        this.Context = {
            afterTie: false,
            notesBeforeTie: [],
            startTime: 0,
            pitchQueue: [],
            warnings: []
        }
    }

    /**
     * @returns {SMML.ParsedTrack[]}
     */
    parseTrack() {
        this.preprocess()
        const trackResult = this.parseTrackContent(this.Content)
        TrackParser.processPedal(trackResult)
        if (this.isSubtrack) {
            return [trackResult]
        } else {
            return this.Instruments.map((instrument) => {
                return {
                    Instrument: instrument.Instrument,
                    Meta: trackResult.Meta,
                    Content: trackResult.Content.map((note) => ({
                        ...note,
                        Volume: note.Volume * instrument.Proportion
                    }))
                }
            })
        }
    }

    preprocess() {
        const last = this.Content.pop()
        const last2 = this.Content.pop()
        if (last.Type === 'BarLine' && last2.Type === 'BarLine') {
            last2.Terminal = true
            this.Content.push(last2)
        } else {
            if (last.Type === 'BarLine') {
                last.Terminal = true
            }
            this.Content.push(last2)
            this.Content.push(last)
        }
    }

    /**
     * parse track content
     * @param {(SMML.BaseToken | SMML.SubTrack)[]} content
     * @returns {SMML.ParsedTrack}
     */
    parseTrackContent(content) {
        const result = []
        let tempNote = undefined
        const localContext = {
            leftIncomplete: 0,
            rightIncomplete: undefined,
            leftFirst: true,
            subtrackTemp: undefined,
        }
        for (var token of content) {
            switch (token.Type) {
            case 'FUNCTION':
                this.handleSubtrack(this.Libraries.FunctionPackage.applyFunction(this, token), localContext)
                result.push(...localContext.subtrackTemp.Content)
                break
            case 'Subtrack':
                this.handleSubtrack(new SubtrackParser(token, this.Settings, this.Libraries).parseTrack(), localContext)
                result.push(...localContext.subtrackTemp.Content)
                break
            case 'Note':
                tempNote = this.parseNote(token)
                if (!(tempNote instanceof Array)) {
                    this.handleSubtrack(tempNote, localContext)
                    result.push(...localContext.subtrackTemp.Content)
                } else {
                    this.Context.notesBeforeTie = tempNote
                    this.handleNote(token, localContext)
                    result.push(...tempNote)
                }

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
        
        if (!this.isSubtrack && !((localContext.leftIncomplete === this.Settings.Bar && localContext.rightIncomplete === this.Settings.Bar) || (localContext.leftIncomplete + localContext.rightIncomplete === this.Settings.Bar))) {
            this.Context.warnings.push(new Error('Not enough'))
        }
        return {
            Content: result,
            Meta: {
                Warnings: this.Context.warnings,
                PitchQueue: this.Context.pitchQueue,
                FadeIn: this.Settings.FadeIn,
                FadeOut: this.Settings.FadeOut,
                Duration: this.Context.startTime,
                Single: localContext.leftFirst,
                Incomplete: [localContext.leftIncomplete, localContext.rightIncomplete],
                NotesBeforeTie: this.Context.notesBeforeTie
            }
        }
    }

    isLegalBar (bar) {
        return bar === undefined || bar === this.Settings.Bar || bar === 0
    }

    handleSubtrack (subtrack, localContext) {
        if (subtrack === undefined) {
            localContext.subtrackTemp = {
                Content: []
            }
            return
        }
        localContext.subtrackTemp = subtrack
        subtrack.Content.forEach((tok) => {
            if (tok.Type === 'Note') {
                tok.StartTime += this.Context.startTime
            }
        })
        this.Context.pitchQueue.push(...subtrack.Meta.PitchQueue)
        this.Context.startTime += subtrack.Meta.Duration
        this.Context.notesBeforeTie = subtrack.Meta.NotesBeforeTie
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
        const noteDuration = this.parseDuration(note)
        if (localContext.leftFirst) {
            localContext.leftIncomplete += noteDuration
        } else {
            localContext.rightIncomplete += noteDuration
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
     * @param {SMML.NoteToken} note
     * @returns {SMML.ParsedNote[]}
     */
    parseNote(note) {
        const pitches = []
        const duration = this.parseDuration(note)
        const actualDuration = duration * this.Settings.Stac[note.Staccato]
        const volumeScale = note.VolumeOperators.split('').reduce((sum, cur) => sum * cur === '>' ? this.Settings.Accent : cur === ':' ? this.Settings.Light : 1, 1)
        const volume = this.Settings.Volume * volumeScale

        // calculate pitch array and record it for further trace
        const pitchDelta = this.parseDeltaPitch(note.PitchOperators)
        if (note.Pitches.length === 1 && note.Pitches[0].ScaleDegree === '-1') {
            pitches.push(...this.Context.pitchQueue[this.Context.pitchQueue.length - this.Settings.Trace])
        } else {
            for (const pitch of note.Pitches) {
                if (pitch.Pitch) {
                    pitches.push(pitch.Pitch)
                    continue
                }
                if (pitch.ScaleDegree === '0') continue
                if (pitch.ScaleDegree === '10') {
                    pitches.push(null)
                } else if (pitch.ChordNotations === '') {
                    pitches.push(this.parsePitch(pitch) + pitchDelta)
                } else {
                    const basePitch = this.parsePitch(pitch) + pitchDelta
                    pitches.push(...this.parseChord(pitch).map((subPitch) => subPitch + basePitch))
                }
            }
        }

        if (note.Arpeggio) {
            const appo = []
            const length = pitches.length
            for (let i = 1; i < length; i++) {
                appo.push({
                    ...note,
                    Pitches: pitches.slice(0, i).map((pitch) => ({Pitch: pitch})),
                    Arpeggio: false,
                    PitchOperators: ''
                })
            }
            return this.Libraries.FunctionPackage.STD.GraceNote.apply(this, [{
                Type: 'Subtrack',
                Repeat: -1,
                Content: appo
            }, {
                Type: 'Subtrack',
                Repeat: -1,
                Content: [{
                    ...note,
                    Pitches: pitches.map((pitch) => ({Pitch: pitch})),
                    Arpeggio: false,
                    PitchOperators: ''
                }]
            }])
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

        const result = []
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
        const pitches = this.Libraries.ChordNotation[pitch.ChordNotations]
        if (pitch.ChordOperators === '') return pitches
        const operators = this.Libraries.ChordOperator[pitch.ChordOperators]
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


class SubtrackParser extends TrackParser {
    constructor (track, sectionSettings, libraries) {
        super(track, sectionSettings, libraries, true)
        this.Repeat = track.Repeat
    }

    parseTrack() {
        this.preprocess()
        const trackResult = this.parseTrackContent(this.Content)
        return trackResult
    }

    preprocess() {
        if (this.Repeat > 0) {
            const temp = []
            for (let i = 1; i <= this.Repeat; i++) {
                let skip = false
                for (const token of this.Content) {
                    if (token.Type !== 'BarLine' || token.Order[0] === 0) {
                        if (!skip) {
                            temp.push(token)
                        }
                    } else if (token.Order.indexOf(i) === -1) {
                        skip = true                
                    } else {
                        skip = false
                        temp.push(token)
                    }
                }
            }
            this.Content = temp
        } else {
            const skip = this.Content.findIndex((tok) => tok.Skip === true)
            let temp
            if (skip === -1) {
                temp = new Array(-this.Repeat).fill(this.Content)
            } else {
                temp = new Array(-this.Repeat - 1).fill(this.Content)
                temp.push(this.Content.slice(0, skip))
            }
            this.Content = [].concat(...temp)
        }
    }
}


module.exports = {
    TrackParser,
    SubtrackParser
}

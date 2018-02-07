module.exports = {
    Tremolo1() {

    },

    Tremolo2(expr, subtrack) {

    },

    Portamento(subtrack1, subtrack2) {
        const { pitches: pitches1} = this.parseNotePurePart(subtrack1.Content[0])
        const { pitches: pitches2, duration, volume } = this.parseNotePurePart(subtrack2.Content[0])
        const port = this.Settings.Port
        const eachDuration = duration / port
        const step = (pitches2[0] - pitches1[0]) / (port - 1)
        const pitches = []
        for (let i = 0; i < port; i++) {
            pitches.push(Math.round(pitches1[0] + step * i))
        }
        return {
            Contents: pitches.map((pitch) => {
                this.Context.startTime += eachDuration
                return {
                    Type: 'Note',
                    Pitch: pitch,
                    Volume: volume,
                    Duration: eachDuration,
                    StartTime: this.Context.startTime - eachDuration
                }
            }),
            Meta: {
                Duration: duration,
                Incomplete: [],
                Single: true
            }
        }
    },

    Appoggiatura(subtrack) {

    },

    Vol(volume) {
        AssignSetting(this.Settings, 'Volume', volume / 100, Criteria.Vol)
    },
    Spd(speed) {
        AssignSetting(this.Settings, 'Speed', speed, Criteria.Spd)
    },
    Key(key) {
        AssignSetting(this.Settings, 'Key', key, Criteria.Key)
    },
    Oct(oct) {
        AssignSetting(this.Settings, 'Octave', oct, Criteria.Oct)
    },
    KeyOct(key, oct) {
        AssignSetting(this.Settings, 'Key', Tonality[key], Criteria.Key)
        AssignSetting(this.Settings, 'Octave', oct, Criteria.Oct)
    },
    Beat(beat) {
        AssignSetting(this.Settings, 'Beat', beat, Criteria.Beat)
    },
    Bar(bar) {
        AssignSetting(this.Settings, 'Bar', bar, Criteria.Bar)
    },
    BarBeat(bar, beat) {
        AssignSetting(this.Settings, 'Bar', bar, Criteria.Bar)
        AssignSetting(this.Settings, 'Beat', beat, Criteria.Beat)
    },
    Dur(scale) {
        AssignSetting(this.Settings, 'Duration', scale, Criteria.Dur)
    },
    Acct(scale) {
        AssignSetting(this.Settings, 'Accent', scale, Criteria.Acct)
    },
    Light(scale) {
        AssignSetting(this.Settings, 'Light', scale, Criteria.Light)
    },
    Appo(r) {
        AssignSetting(this.Settings, 'Appo', r, Criteria.Appo)
    },
    Port(r) {
        AssignSetting(this.Settings, 'Port', r, Criteria.Port)
    },
    Trace(count) {
        AssignSetting(this.Settings, 'Trace', count, Criteria.Trace)
    },
    FadeIn(time) {
        AssignSetting(this.Settings, 'FadeIn', time, Criteria.FadeIn)
    },
    FadeOut(time) {
        AssignSetting(this.Settings, 'FadeOut', time, Criteria.FadeOut)
    },
    Rev(r) {
        AssignSetting(this.Settings, 'Rev', r, Criteria.Rev)
    },
    setVar(key, value) {
        this.Settings.Var[key] = value
    },
    getVar(key, defaultValue = null) {
        return this.Settings.Var[key] ? this.Var[key] : defaultValue
    },
    Stac(restProportion, index = 1) {
        if (typeof restProportion !== 'number') throw new TypeError('Non-numeric value passed in as Stac')
        if (!Criteria.Stac(restProportion)) throw new RangeError('Stac out of range')
        if (![0, 1, 2].indexOf(index)) throw new RangeError('Stac index out of range')
        this.Settings.Stac[index] = restProportion
    },
}

const Criteria = {
    Vol: (volume) => volume <= 1 && volume >= 0,
    Spd: (speed) => speed > 0,
    Key: (key) => Number.isInteger(key),
    Oct: (octave) => Number.isInteger(octave),
    Beat: (beat) => beat > 0 && Number.isInteger(Math.log2(beat)),
    Bar: (bar) => bar > 0 && Number.isInteger(bar),
    Dur: (scale) => scale > 0,
    Stac: (restProportion) => restProportion >= 0 && restProportion <= 1,
    Acct: (scale) => scale > 1,
    Light: (scale) => scale < 1 && scale > 0,
    Appo: (r) => r > 0,
    Port: (r) => r > 0,
    Trace: (count) => count > 0 && count <= 4 && Number.isInteger(count),
    FadeIn: (time) => time > 0,
    FadeOut: (time) => time > 0,
    Rev: () => true,
}
const Tonality = {
    'C': 0,
    'G': 7,
    'D': 2,
    'A': 9,
    'E': 4,
    'B': -1,
    '#F': 6,
    '#C': 1,
    'F': 5,
    'bB': -2,
    'bE': 3,
    'bA': 8,
    'bD': 1,
    'bG': 6,
    'bC': -1,

    'F#': 6,
    'C#': 1,
    'Bb': -2,
    'Eb': 3,
    'Ab': 8,
    'Db': 1,
    'Gb': 6,
    'Cb': -1,
}

/**
 * 
 * @param {SMML.GlobalSetting} globalSetting 
 * @param {string} key 
 * @param {number} value 
 * @param {function} criterion 
 */
function AssignSetting(globalSetting, key, value, criterion) {
    if (typeof value !== 'number') throw new TypeError(`Non-numeric value passed in as ${key}`)
    if (!criterion(value)) throw new RangeError(`${key} out of range`)
    globalSetting[key] = value
}

// consider using Proxy
/* new Proxy({}, {
    get (target, key) {}
}) */

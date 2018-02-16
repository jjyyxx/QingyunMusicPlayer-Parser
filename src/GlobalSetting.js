class GlobalSetting {
    constructor({
        Key = 0,
        Bar = 4,
        Beat = 4,
        Speed = 60,
        Volume = 1.0,
        Stac = [0, 1 / 2, 3 / 4],
        Port = 6,
        Appo = 1 / 4,
        Accent = 1,
        Light = 1,
        Trace = 1,
        Duration = 0,
        Oct = 0,
        FadeIn = 0,
        FadeOut = 0,
        Rev = 0,
        ConOct = 0,
        ConOctVolume = 1,
        Ferm = 2
    } = {}) {
        this.Key = Key
        this.Bar = Bar
        this.Beat = Beat
        this.Speed = Speed
        this.Volume = Volume
        this.Stac = Stac
        this.Port = Port
        this.Appo = Appo
        this.Accent = Accent
        this.Light = Light
        this.Trace = Trace
        this.Duration = Duration
        this.Octave = Oct
        this.FadeIn = FadeIn
        this.FadeOut = FadeOut
        this.Rev = Rev
        this.ConOct = ConOct
        this.ConOctVolume = ConOctVolume
        this.Ferm = Ferm
        this.Var = {}
    }

    extend(settingObj = {}) {
        const newSetting = new GlobalSetting()
        Object.assign(newSetting, this, settingObj)
        return newSetting
    }

    update(settingObj) {
        Object.assign(this, settingObj)
    }
}

module.exports = GlobalSetting

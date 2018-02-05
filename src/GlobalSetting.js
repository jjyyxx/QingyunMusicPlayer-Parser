class GlobalSetting {
    constructor({
        Key = 0,
        Bar = 4,
        Beat = 4,
        Speed = 90,
        Volume = 1.0,
        Instr = 'Piano',
        Stac = [1 / 2, 1 / 2, 1 / 2],
        Port = 6,
        Appo = 1 / 4,
        Accent = 1,
        Light = 1,
        Trace = 1,
        Duration = 0,
        Oct = 0,
        FadeIn = 2,
        FadeOut = 2,
        Rev = 0
    } = {}) {
        this.Key = Key
        this.Bar = Bar
        this.Beat = Beat
        this.Speed = Speed
        this.Volume = Volume
        this.Instr = Instr
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

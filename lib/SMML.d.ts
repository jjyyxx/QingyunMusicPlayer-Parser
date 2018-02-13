declare namespace SMML {
    interface FileMetaInfo {
        [key: string]: any
        Title?: string
        Left?: string
        Right?: string
        Bottom?: string
    }

    interface Library {
        Type: string
        Storage: "Internal" | "External"
    }

    interface InternalLibrary extends Library{
        Storage: "Internal"
        Data: any
    }

    interface ExternalLibrary extends Library{
        Storage: "External"
        Content: Library[]
    }

    interface Track {
        ID?: string
        Type: "Track"
        Instruments: Array<{
            Instrument: string
            Proportion: number
        }>
        Content: Array<BaseToken | SubTrack>
    }

    interface SubTrack {
        Type: "SubTrack"
        Repeat: number
        Content: Array<BaseToken | SubTrack>
    }

    interface BaseToken {
        StartIndex: number
        Type: string
        Scopes: string
    }

    interface FunctionToken extends BaseToken {
        Name: string
        Simplfied: boolean
        Argument: any
    }

    interface Section {
        ID: string
        Comments: string[]
        Settings: FunctionToken[]
        Tracks: Track[]
    }

    interface TokenizedData {
        Comments: string[]
        FileMeta: FileMetaInfo
        Library: Library[]
        Sections: Section[]
    }

    interface GlobalSetting {
        Volume: number
        Speed: number
        Key: number
        Octave: number
        Beat: number
        Bar: number
        Duration: number
        Stac: number[]
        Accent: number
        Light: number
        Appo: number
        Port: number
        Trace: number
        FadeIn: number
        FadeOut: number
        Rev: number
        Var: any[]
    }

    interface ParsedNote {
        Type: "Note"
        Pitch: number
        StartTime: number
        Duration: number
        Volume: number
    }

    interface ParsedTrack {
        Meta: {
            FadeIn: number,
            FadeOut: number,
            Duration: number,
            Incomplete: number[],
            Single: boolean,
            Warnings: Error[],
            PitchQueue: number[][]
        },
        Instrument: string
        Content: ParsedNote[]
    }

    interface NoteToken {
        Type: "Note"
        Pitches: Pitch[]
        PitchOperators: string
        DurationOperators: string
        VolumeOperators: string
        Staccato: number
        Arpeggio: boolean
    }

    interface Pitch {
        ScaleDegree: number
        PitchOperators: string
        ChordNotations: string
        ChordOperators: string
    }

    interface ParsedSection {
        ID: string
        Tracks: ParsedTrack[]
    }

    interface Adapter {
        new (parsedSection: ParsedSection)
        adapt(): any
    }
}
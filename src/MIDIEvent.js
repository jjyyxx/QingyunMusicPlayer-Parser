const mask = 0x7F

export class MIDIEvent {
    /**
     * Deal with Variable-Length number
     * @param {number} deltaTime 
     */
    static processDeltaTime (deltaTime) {
        const length = Math.ceil(deltaTime.toString(2).length / 7)
        const uArray = new Uint8Array(length)
        for (let i = length - 1; i >= 0; i--) {
            const offset = 7 * (length - i - 1)
            uArray[i] = ((deltaTime >> offset) & mask) + ((i === length - 1) ? 0 : 0x80)
        }
        return {
            origin: deltaTime,
            length,
            uArray
        }
    }
    /**
     * Construct a MIDI event
     * @param {number} deltaTime 
     * @param {number} type 
     * @param {number} channel 
     * @param {number} param1 
     * @param {number} param2 
     */
    constructor (deltaTime, type, channel, param1, param2) {
        this.deltaTime = MIDIEvent.processDeltaTime(deltaTime)
        this.type = type
        this.channel = channel
        this.param1 = param1
        this.param2 = param2
        this.uArray = new Uint8Array()
    }

    calcLength () {

    }
}
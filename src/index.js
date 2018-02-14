const fs = require('fs')
const Parser = require('./Parser')
const GlobalSetting = require('./GlobalSetting')
const LibLoader = require('./LibLoader')
const process = require('process')
const path = require('path')
const MMAAdapter = require('./adapter/MMAAdapter')
const MIDIAdapter = require('./adapter/MIDIAdapter')

const input = process.argv[2]
if (!input) {
    // eslint-disable-next-line no-console
    console.log('Usage: node index.js <input_path> [output_path]')    
    process.exit(0)
}
const output = process.argv[3] || input.split('.').slice(0, -1).concat(['out', 'json']).join('.')

fs.readFile(path.join(path.resolve('./'), input), 'utf8', (err, data) => {
    const jsonData = JSON.parse(data)
    // const track = {
    //     ID: '1',
    //     Type: 'Track',
    //     Instruments: [{
    //         Instrument: 'Piano',
    //         Proportion: 1
    //     }],
    //     Content: jsonData
    // }
    const parser = new Parser(jsonData)
    const json = JSON.stringify(parser.parse())
    fs.writeFile(path.join(path.resolve('./'), output), json, 'utf8', () => {})
})
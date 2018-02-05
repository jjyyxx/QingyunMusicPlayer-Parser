const fs = require('fs')
const { Parser, TrackParser } = require('./Parser')
const GlobalSetting = require('./GlobalSetting')

fs.readFile(__dirname + '/testcase/test.json', 'utf8', (err, data) => {
    const jsonData = JSON.parse(data)
    const track = {
        ID: '1',
        Type: 'Track',
        Instruments: [{
            Instrument: 'Piano',
            Proportion: 1
        }],
        Contents: jsonData
    }
    const trackParser = new TrackParser(track, new GlobalSetting())
    console.log(JSON.stringify(trackParser.parseTrack()))
})
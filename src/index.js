const fs = require('fs')
const TrackParser = require('./TrackParser')
const GlobalSetting = require('./GlobalSetting')
const LibLoader = require('./LibLoader')

fs.readFile(__dirname + '/testcase/test1.json', 'utf8', (err, data) => {
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
    const trackParser = new TrackParser(track, new GlobalSetting(), new LibLoader().load())
    console.log(JSON.stringify(trackParser.parseTrack()))
})
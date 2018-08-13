'use strict'

/**
 * stats.js
 *  extract player statistics from CS:GO demo files
 */

const fs = require('fs')
const path = require('path')
const demofile = require('demofile')

class Statistics {
    constructor(demo) {
        this.demo = demo
    }
    
    registerEvents() {
        let demo = this.demo

        demo.gameEvents.on('round_officially_ended', e => {
            let teams = demo.teams;

            let t = teams[demofile.TEAM_TERRORISTS]
            let ct = teams[demofile.TEAM_CTS]

            console.log(' T: %d\nCT: %d', t.score, ct.score)
        })

        demo.on('end', e => {
            let teams = demo.teams;

            let t = teams[demofile.TEAM_TERRORISTS]
            let ct = teams[demofile.TEAM_CTS]

            console.log(' T: %d\nCT: %d', t.score, ct.score)
        })
    }
}

class Demo {
    constructor(location) {
        this.buffer = fs.readFileSync(location)
        this.demo = new demofile.DemoFile()
    }

    parse() {
        this.demo.parse(this.buffer)
    }
}

class Parser extends Demo {
    constructor(input, output) {
        super(input)

        this.input = input
        this.outputDir = fs.lstatSync(output).isDirectory ? output : __dirname
        this.isDirectory = fs.lstatSync(input).isDirectory()
        this.stats = new Statistics(this.demo)

        fs.writeFile(path.join(this.outputDir, this.input + '.txt'), '', err => {
            if(err) return console.log(err)
        })
    }

    generateReport() {
        this.stats.registerEvents()
        this.parse()
    }
}

let _p = new Parser('match730_003302074473250816346_0602518765_125.dem', __dirname)
_p.generateReport()
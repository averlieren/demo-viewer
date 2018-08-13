"use strict";

function getTeamColor(team, alpha) {
    alpha = alpha || 1

    if(getTeam(team) == 2)
        //return `rgba(204, 186, 124, ${alpha})` //#CCBA7C
        return `rgba(186, 147, 50, ${alpha})`
    
    if(getTeam(team) == 3)
        return `rgba(93, 121, 174, ${alpha})` //#5D79AE
    
    return `rgba(255, 255, 255, ${alpha})`
}

function getTeam(team) {
    // convert multiple team interperations to integer
    team = String(team)
    switch(team) {
        case 'spectator':
        case '1':
            return 1
        case 'T':
        case '2':
            return 2
        case 'CT':
        case '3':
            return 3
        default:
            return 0
    }
}

const maps = {
    de_mirage: {
        name: 'Mirage',
        pos_x: -3230,
        pos_y:  1713,
        scale: 5
    },
    de_dust2: {
        name: 'Dust II',
        pos_x: -2376,
        pos_y: 3239,
        scale: 4.4
    },
    de_cache: {
        name: 'Cache',
        pos_x: -2000,
        pos_y:  3250,
        scale: 5.5
    },
    de_cbble: {
        name: 'Cobblestone',
        pos_x: -3840,
        pos_y:  3072,
        scale: 6
    },
    de_inferno: {
        name: 'Inferno',
        pos_x: -2087,
        pos_y: 3870,
        scale: 4.9
    },
    de_overpass: {
        name: 'Overpass',
        pos_x: -4831,
        pos_y: 1781,
        scale: 5.2
    },
    de_train: {
        name: 'Overpass',
        pos_x: -2477,
        pos_y: 2392,
        scalee: 4.7
    }
}

function convertMapToImage(map, x, y, offsetX, offsetY){
    //offset in image coordinates not game
    x -= map.pos_x
    x /= map.scale
    x += offsetX || 0

    y *= -1
    y += map.pos_y
    y /= map.scale
    y += offsetY || 0
    
    return [x, y]
}

class Shape {
    // defaults to rectangle
    constructor(x, y) {
        this.x = x
        this.y = y
    }

    hide() {
        this.setPosition([-500, -500])
    }

    setPosition(x, y) {
        this.x = x
        this.y = y
    }
    
    set outline(color) {
        this.outlineStyle = color
    }
    
    set outlineThickness(color) {
        this.thickness = color
    }

    set fill(color) {
        this.fillStyle = color
    }

    draw() {}
}

class Rectangle extends Shape {
    constructor(x, y, width, height) {
        super(x, y)
        this.width = width
        this.height = height
    }

    draw(context) {
        context.fillStyle = this.fillStyle
        context.lineWidth = this.thickness
        context.stroke = this.outlineStyle
        context.fillRect(this.x, this.y, this.width, this.height)
    }
}

class Arc extends Shape {
    constructor(x, y, radius, start, end) {
        super(x, y)
        this.radius = radius
        this.start = start
        this.end = end
    }

    set start(degrees) {
        this.min = degrees * Math.PI / 180
    }

    set end(degrees) {
        this.max = degrees * Math.PI / 180
    }

    draw(context) {
        context.beginPath()
        context.arc(this.x, this.y, this.radius, this.min, this.max, false)

        if(this.thickness && this.outlineStyle) {
            context.lineWidth = this.thickness
            context.strokeStyle = this.outlineStyle
            context.stroke()
        }

        if(this.fillStyle) {
            context.fillStyle = this.fillStyle
            context.fill()
        }
    }
}

class Circle extends Arc {
    constructor(x, y, radius) {
        super(x, y, radius, 0, 360)
    }
}

class Triangle extends Shape {
    constructor(x, y, radius){
        super(x, y)
        this.radius = radius
        this.radians = 0
    }

    draw(context) {
        let x = this.x
        let y = this.y
        context.beginPath()
        context.moveTo(this.radius * Math.cos(this.radians) + x, this.radius * Math.sin(this.radians) + y)
        context.lineTo(this.radius * Math.cos(this.radians + 2 * Math.PI / 3) + x, this.radius * Math.sin(this.radians + 2 * Math.PI / 3) + y)
        context.lineTo(this.radius * Math.cos(this.radians + 4 * Math.PI / 3) + x, this.radius * Math.sin(this.radians + 4 * Math.PI / 3) + y)

        context.closePath()

        if(this.thickness && this.outlineStyle) {
            context.lineWidth = this.thickness
            context.strokeStyle = this.outlineStyle
            context.stroke()
        }

        if(this.fillStyle) {
            context.fillStyle = this.fillStyle
            context.fill()
        }
    }
}

class Line extends Shape {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
    }

    draw(context) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }
}

class Grenade extends Shape {
    constructor(startX, startY, x, y, detonated, radius, scale, entityid) {
        super(x, y, radius / scale)

        this.states = [
            new Circle(x, y, 4), // thrown projectile
            new Circle(x, y, radius / scale) // detonated
        ]

        this.startX = startX
        this.startY = startY
        this.detonated = false
        this.scale = scale
        this.entityid = entityid
    }

    set detonated(status) {
        if(status)
            detonate()
    }

    detonate() {

    }
}

class SmokeGrenade extends Grenade {
    constructor(x, y, scale, entityid, team) {
        super(x, y, 144, scale, entityid)
        console.log(team)
        if(team == 2) {
            this.outline = 'rgba(186, 171, 135, 1)'
            this.fill = 'rgba(186, 171, 135, .5)'
        } else if (team == 3) {
            this.outline = 'rgba(143, 156, 181, 1)'
            this.fill = 'rgba(143, 156, 181, .5)'
        } else {
            this.outline = 'rgba(196, 196, 196, 1)'
            this.fill = 'rgba(196, 196, 196, .5)'
        }
        
        this.outlineThickness = 18 / this.scale
    }
}

class Molotov extends Grenade {
    constructor(x, y, scale, entityid) {
        super(x, y, 144, scale, entityid)
        this.outline = 'rgba(244, 146, 66, 1)'
        this.outlineThickness = 18 / this.scale
        this.fill = 'rgba(244, 146, 66, .5)'
    }
}

class PlayerCircle {
    constructor(x, y) {
        this.player = new Circle(x, y, 8)
        this.outline = new Arc(x, y, 16, 0, 360)
    }

    setPosition(x, y) {
        this.x = x
        this.y = y

        this.player.setPosition(x, y)
        this.outline.setPosition(x, y)
    }

    setObjectivePercentage(percent) {
        this.outline.start = 0
        this.outline.end = percent * 360
    }

    hide() {
        this.player.hide()
        this.outline.hide()
    }

    draw(context) {
        this.outline.draw(context)
        this.player.draw(context)
    }
}

class CanvasImage extends Shape {
    constructor(x, y, src){
        super(x, y)
        this.image = new Image()
        this.src = src
    }

    set src(source) {
        this.image.src = source
    }

    dimensions(w, h) {
        this.width = w
        this.height = h
    }

    draw(context) {
        this.width = this.width || this.image.width
        this.height = this.height || this.image.height
        context.drawImage(this.image, this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height)
    }
}

class Bomb extends Shape {
    constructor(x, y) {
        super(x, y)
        this.sprites = [
            new CanvasImage(x, y, './images/C4_small.png'),
            new CanvasImage(x, y, './images/C4_red_small.png'),
            new CanvasImage(x, y, './images/C4_green_small.png'),
            new CanvasImage(x, y, './images/C4_exploded_small.png')
        ]
        this.armed = false
        this.hold = false

        this.sprites[0].dimensions(19, 22)
        this.sprites[1].dimensions(19, 22)
        this.sprites[2].dimensions(19, 22)
        this.sprites[3].dimensions(19, 22)
    }

    setCurrentSprite(index) {
        this.sprite = this.sprites[index]
        
        for(let sprite in this.sprites)
            this.sprites[sprite].hide()
        
        this.update()
    }

    set status(status) {
        switch(status){
            case 0: //planted
                this.armed = true
                break
            case 1: // defused
                this.defused = true
                break
            case 2: // detonated
                this.detonated = true
                break
            default:
                this.armed = false
                break
        }

        this.update()
    }

    set detonated(status) {
        this.setCurrentSprite(status ? 3 : 0)
    }

    set defused(status) {
        this.setCurrentSprite(status ? 2 : 0)
    }

    set armed(status) {
        this.setCurrentSprite(status ? 1 : 0)
    }

    setPosition(x, y) {
        this.x = x
        this.y = y
        let offsetX = this.hold ? 20 : 0
        let offsetY = this.hold ? 15 : 0
        this.sprite.setPosition(x + offsetX, y + offsetY)
        canvas.bomb.draw()
    }

    update() {
        this.setPosition(this.x, this.y)
    }

    draw(context) {
        this.sprite.draw(context)
    }
}

class CanvasText extends Shape {
    constructor(x, y, text, align, font, color) {
        super(x, y)
        this.text = text
        this.align = align || 'left'
        this.font = font || '18px roboto'
        this.fill = color || '#ffffff'
        this.offsetX = 0
        this.offsetY = 0
    }

    draw(context) {
        let x = this.x + this.offsetX
        let y = this.y + this.offsetY

        context.font = this.font
        context.textAlign = this.align
        context.fillStyle = this.fillStyle
        context.fillText(this.text, x, y)
    }
}

class Player {
    constructor(userid, steamid, name, team) {
        this.userid = userid
        this.steamid = steamid
        this.name = name
        this.team = getTeam(team)
        this.isAlive = true

        this.playerIcon = new PlayerCircle(0, 0)
        this.playerNumber = new CanvasText(0, 0, '', 'center', '12px roboto')
        this.playerList = new CanvasText(0, 0, '', 'left', '20px roboto')
        this.playerAngle = new Triangle(0, 0, 6, 0)
        this.playerIcon.outline.fill = getTeamColor(this.team, .4)

        this.playerNumber.fill = '#ffffff'
        this.playerNumber.offsetY = 4

        this.update()
    }

    set number(num) {
        this.playerNumber.text = num
    }

    swap() {
        if(this.team == 2) {
            this.team = 3
        } else if(this.team == 3) {
            this.team = 2
        }
    }

    update() {
        this.playerIcon.player.fill = getTeamColor(this.team)
        this.playerAngle.fill = getTeamColor(this.team)
        this.playerList.fill = this.isAlive ? getTeamColor(this.team) : '#9D9D9D'
    }

    register(canvas) {
        canvas.add(this.playerIcon)
        canvas.add(this.playerNumber)
        canvas.add(this.playerAngle)
    }

    setPosition(x, y, yaw) {
        yaw = -yaw * Math.PI / 180
        
        this.isAlive = true

        this.playerIcon.setPosition(x, y)
        this.playerNumber.setPosition(x, y)

        this.playerAngle.radians = yaw
        this.playerAngle.setPosition(15 * Math.cos(yaw) + x, 15 * Math.sin(yaw) + y)
    }

    kill() {
        this.isAlive = false
        
        this.playerIcon.outline.fill = getTeamColor(this.team, .4)
        this.playerAngle.hide()
        this.playerIcon.hide()
        this.playerNumber.hide()
    }
}

class Canvas {
    constructor(canvasId) {
        this.canvasId = canvasId
        this.canvas = document.getElementById(canvasId)
        this.context = this.canvas.getContext('2d')
        this.drawable = []
    }

    add(shape) {
        this.drawable.push(shape)
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    draw() {
        this.clear()
            
        for(let obj of this.drawable)
            obj.draw(this.context)
    }
}

// background
const canvas = {
    players: new Canvas('players'),
    grenades: new Canvas('grenades'),
    shots: new Canvas('shots'),
    list: new Canvas('list'),
    bomb: new Canvas('bomb'),
    background: new Canvas('background')
}

let gameInfo = {
    rounds: new CanvasText(512, 128, '0 - 0', 'left', '24px roboto'),
    tick: new CanvasText(960, 222, '0', 'left', '11px roboto'),
    time: new CanvasText(960, 234, '0', 'left', '11px roboto'),
}

let bomb = new Bomb(0, 0)
canvas.bomb.add(bomb)

function init(){
    let xhr = new XMLHttpRequest()
    xhr.overrideMimeType('application/json')
    xhr.open('GET', './mirage.json', true)
    xhr.onreadystatechange = () => {
        if(xhr.readyState == 4 && xhr.status == '200')
            onload(xhr.responseText)
    }
    xhr.send(null)
}

init()

let pause = false
let speed = 3
let rewind = false
let increment = 0

function onload(data) {
    console.log('loaded match data')
    data = JSON.parse(data)

    let data_players = data[0]
    let data_rounds = data[1]
    let data_feed = data[2]
    let data_pos = data[3]
    let data_header = data[4]
    let map = maps[data_header.mapName]

    let phase = undefined
    let tracers = []

    let firstTick = undefined
    let lastTick = undefined
    let tickList = Object.keys(data_pos)
    let totalTicks = tickList.length
    let tickRate = 64
    let players = {}
    let grenades = {}
    let pn = 0

    let buffer = []

    function drawBackground(){
        // load radar image for viewer background
        let image = new Image()
        let listBg = new Rectangle(0, 0, 1024, 512)

        listBg.fill = '#000000'
        image.src = `radar/${data_header.mapName}.png`

        image.onload = () => {
            canvas.background.context.drawImage(image, 0, 0)
        }

        canvas.list.add(listBg)
        canvas.list.draw()

        for(info in gameInfo){
            gameInfo[info].fill = '#ffffff'
            canvas.list.add(gameInfo[info])
        }

        canvas.list.add(new CanvasText(925, 222, 'ticks:', 'left', '11px roboto'))
        canvas.list.add(new CanvasText(925, 234, 'time:', 'left', '11px roboto'))
        canvas.list.add(new CanvasText(11, 245, '© 2018 Brandon Nguyen. All Rights Reserved.', 'left', '11px roboto', '#777'))
    }
    
    drawBackground()

    for(userid in data_players)
        buffer.push([data_players[userid][2] || 4, userid])
    
    buffer.sort((a, b) => {return b[0] - a[0]})

    for(item in buffer) {
        userid = buffer[item][1]

        if(!players.hasOwnProperty(userid)) {
            let data = data_players[userid]
            let player = new Player(userid, data[0], data[1], data[2] || 'BOT')
            
            player.register(canvas.players)
            
            if(player.team != 'BOT' && data[0] != 'BOT'){
                player.number = pn
                player.playerList.text = `${pn}: ${player.name}`
                player.playerList.x = 300 * Math.floor(pn / 5) + 25
                player.playerList.y = (25 * ((pn - 5 * (Math.floor(pn / 5))) + 1)) + 100

                canvas.list.add(player.playerList)
                player.update()

                pn++
            }
            
            players[userid] = player
        }
    }
    let killFeed = []
    
    function render(){
        if(pause){
            renderLoop = setTimeout(render, (2000 / (tickRate * speed)))
            return
        } else {
            if(increment >= totalTicks && !rewind)
                increment = 0
            else if(increment < 0 && rewind)
                increment = totalTicks - 1
        }

        let currentTick = tickList[increment]
        
        if(!firstTick) firstTick = currentTick
        
        if(firstTick !== currentTick)
            if(!lastTick)
                lastTick = currentTick
        
        if(currentTick in data_feed) {
            let kills = data_feed[currentTick]

            for(kill of kills){
                player = players[kill[0]]
                player.kill()
            }
        }

        if(currentTick in data_rounds) {
            let round = data_rounds[currentTick]

            if(phase != round[0]){
                if(round[0] == 2)
                    for(userid in players)
                        players[userid].swap()

                phase = round[0]
            }

            gameInfo.rounds.text = `${round[1]} - ${round[2]}`
        }
        
        let positions = data_pos[currentTick]

        for(userid in players) {
            let player = players[userid]

            if(userid in positions) {
                let position = positions[userid]
                let x = position[0] * 2
                let y = position[1] * 2
                let yaw = position[2] * 2

                player.setPosition(...convertMapToImage(map, x, y), yaw)

                if(bomb.userid == userid && bomb.hold)
                    bomb.setPosition(...convertMapToImage(map, x, y))
            }

            player.update()
        }

        if('Z' in positions) {
            let position = positions['Z']

            let x = position[0] * 2
            let y = position[1] * 2

            bomb.hold = false
            bomb.setPosition(...convertMapToImage(map, x, y))
        }

        if('S' in positions) {
            let status = positions['S']

            bomb.hold = false
            bomb.status = status
        }

        if('B' in positions) {
            // bomb carrier
            userid = positions['B']

            if(userid in players) {
                player = players[userid]

                if(player.team == 2)
                    player.playerIcon.outline.fill = 'rgba(206, 95, 30, .4)'
            }

            if(userid == 0 && bomb.userid in players) {
                player = players[bomb.userid]

                players[bomb.userid].playerIcon.outline.fill = getTeamColor(player.team, .4)
            }

            bomb.userid = userid
            bomb.hold = userid == 0 ? false : true
        }

        if('P' in positions) {
            // defuse pickup
            for(userid of positions['P']){
                if(!(userid in players)) continue
                player = players[userid]

                if(player.team == 3)
                    player.playerIcon.outline.fill = 'rgba(129, 169, 244, .4)'
            }
        }

        if('E' in positions) {
            // defuse begin or aborted
        }

        if('G' in positions) {
            //grenades [userid, type, entityid, x, y]
            let entid, type, event, data, special, x, y
            [entid, type, event, ...data] = positions['G']

            switch(event) {
                case 0:
                    special = data[0]
                    x = data[1]
                    y = data[2]
                    break
                case 1:
                    break
            }

            if(event == 0) {
                special = data[0]
                x = data[1]
                y = data[2]

                console.log('smoke grenade thrown')
            }

            if(event == 1) {
                x = data[0]
                y = data[1]
            }

            /**
             *for(grenade of positions['G']){
                let team = 0
                if(grenade[0] in players) {
                    let player = players[grenade[0]]
                    team = player.team
                }
                
                switch(grenade[1]){
                    case 0: // hegrenade_detonate
                        break
                    case 1: // flashbang_detonate
                        break
                    case 2: // smokegrenade_detonate
                        let gr = new SmokeGrenade(...convertMapToImage(map, grenade[3] * 2, grenade[4] * 2), map.scale, grenade[2], players[grenade[0]].team)
                        //console.log(players[userid].name, players[userid].team, userid)
                        grenades[grenade[2]] = gr
                        canvas.grenades.add(gr)
                        break
                    case 3: // smokegrenade_expired
                        for(drawable in canvas.grenades.drawable){
                            shape = canvas.grenades.drawable[drawable]
                            console.log(shape, drawable, canvas.grenades.drawable)
                            if(shape.entityid == grenades[grenade[2]].entityid){
                                canvas.grenades.drawable = canvas.grenades.drawable.splice(drawable + 1, 1)
                                break
                            }
                        }
                        delete grenades[grenade[2]]
                        break
                    case 4: // molotov_detonate
                        break
                }
            }
            canvas.grenades.draw()
             */
        }

        gameInfo.tick.text = currentTick
        gameInfo.time.text = Math.round((currentTick - firstTick) / tickRate)

        canvas.players.draw()
        canvas.list.draw()

        increment += rewind ? -1 : 1

        renderLoop = setTimeout(render, (2000 / (tickRate * speed)))
    }

    let renderLoop = setTimeout(render, (2000 / (tickRate * speed)))
}
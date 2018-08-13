"use strict"

function rgba(r, g, b, a) {
    // because i'm too lazy to add the quotes
    return `rgba(${r}, ${g}, ${b}, ${a || 1})`
}

function getTeam(team) {
    // convert multiple team represenations into an int
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

function getTeamColor(team, alpha) {
    // get team color for canvas drawing
    if(getTeam(team) == 2)
        return rgba(186, 147, 50, alpha)
    
    if(getTeam(team) == 3)
        return rgba(93, 121, 174, alpha)
    
    return rgba(255, 255, 255, alpha)
}

class Canvas {
    constructor(canvasId) {
        this.canvasId = canvasId
    }

    set canvasId(id) {
        this.canvas = document.getElementById(id)
        this.context = this.canvas.getContext('2d')
        this.drawables = []
        this.id = id
    }

    add(drawable) {
        if(drawable in this.drawables) return false

        this.drawables.push(drawable)

        return true
    }

    remove(drawable) {
        for(let x = 0; x < this.drawables.length; x++) {
            if(this.drawables[x] == drawable) {
                this.drawables = this.drawables.splice(x, 1)
                return true
            }
        }

        return false
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    draw() {
        this.clear()

        for(let drawable of this.drawables)
            if(drawable.updated && drawable.visible) // only draw if updated and visible
                drawable.draw(this.context)
    }
}

class Drawable {
    constructor(x, y) {
        this.x = x
        this.y = y
        this.visible = true
        this.updated = false
        this.outline = undefined
        this.thickness = undefined
        this.fill = undefined
    }

    hide() {
        this.visible = false
        this.updated = true
    }

    show() {
        this.visible = true
        this.updated = true
    }

    draw(context) {
        this.updated = false

        if(this.outline && this.thickness) {
            context.strokeStyle = this.outline
            context.lineWidth = this.thickness
            context.stroke()
        }
        
        if(this.fill) {
            context.fillStyle = this.fill
            context.fill()
        }
    }

    setPosition(x, y) {
        this.updated = true

        this.x = x
        this.y = y
    }
}

class Rectangle extends Drawable {
    constructor(x, y, width, height) {
        super(x, y)
        this.w = width
        this.h = height
    }

    draw(context) {
        this.updated = false

        if(this.outline && this.thickness) {
            context.stroke = this.outline
            context.lineWidth = this.thickness
        }
        
        if(this.fill)
            context.fillStyle = this.fill
        
        context.fillRect(this.x, this.y, this.width, this.height)
    }
}

class Line extends Drawable {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
    }

    draw(context) {
        context.beginPath()

        context.moveTo(this.x1, this.y1)
        context.lineTo(this.x2, this.y2)

        super.draw(context)
    }
}

class Arc extends Drawable {
    constructor(x, y, radius, start, end) {
        super(x, y)
        this.radius = radius
        this.start = start
        this.end = end
    }

    draw(context) {
        context.beginPath()
        context.arc(this.x, this.y, this.radius, this.min, this.max, true)

        super.draw(context)
    }

    set start(degrees) {
        this.min = degrees * Math.PI / 180
    }

    set end(degrees) {
        this.max = degrees * Math.PI / 180
    }

    get start() {
        return this.min
    }

    get end() {
        return this.max
    }
}

class Circle extends Arc {
    constructor(x, y, radius) {
        super(x, y, radius, 0, 360)
    }
}

class Triangle extends Drawable {
    constructor(x, y, radius, orientation, antiClockWise) {
        super(x, y)
        this.radius = radius
        this.orientation = orientation || 0
        this.antiClockWise = antiClockWise || false
    }

    draw(context) {
        let x = this.x
        let y = this.y

        context.beginPath()

        context.moveTo(this.radius * Math.cos(this.angle) + x, this.radius * Math.sin(this.angle) + y) // move to vertex (0 deg rotation)
        context.lineTo(this.radius * Math.cos(this.angle + 2 * Math.PI / 3) + x, this.radius * Math.sin(this.angle + 2 * Math.PI / 3) + y) // line to corner (120 deg rotation)
        context.lineTo(this.radius * Math.cos(this.angle + 4 * Math.PI / 3) + x, this.radius * Math.sin(this.angle + 4 * Math.PI / 3) + y) // line to corner (120 deg rotation)

        super.draw(context)
    }

    set orientation(degrees) {
        this.angle = degrees * Math.PI / 180

        if(this.antiClockWise)
            this.angle *= -1
    }

    get orientation() {
        return this.angle
    }
}

class Grenade extends Circle {
    constructor(entityid, x, y, z, radius, scale) {
        super(x, y, 4)
        this.entityid = entityid
        this.originX = x
        this.originY = y
        this.originZ = z
        this.scale = scale
        this.detonatedRadius = radius / scale
    }

    set detonated(status) {
        this.radius = status ? this.detonatedRadius : 4
        this.thickness = status ? 18 / this.scale : 0
    }
}

class Flashbang extends Grenade {
    constructor(entityid, x, y, z, scale, team) {
        super(entityid, x, y, z, 144, scale)
        this.team = getTeam(team)
        this.fill = '#ff0000'
    }

    set detonated(status) {}
}

class Decoy extends Grenade {
    constructor(entityid, x, y, z, scale, team) {
        super(entityid, x, y, z, 144, scale)
        this.team = getTeam(team)
        this.fill = '#00ff00'
    }

    set detonated(status) {}
}

class HEGrenade extends Grenade {
    constructor(entityid, x, y, z, scale, team) {
        super(entityid, x, y, z, 144, scale)
        this.team = getTeam(team)
        this.fill = '#0000ff'
    } 

    set detonated(status) {}
}

class SmokeGrenade extends Grenade {
    constructor(entityid, x, y, z, scale, team) {
        super(entityid, x, y, z, 144, scale)
        this.team = getTeam(team)

        switch(this.team) {
            case 2:
                this.outline = rgba(186, 171, 135, 1)
                this.fill = rgba(186, 171, 135, .5)
                break
            case 3:
                this.outline = rgba(143, 156, 181, 1)
                this.fill = rgba(143, 156, 181, .5)
                break
            default:
                this.outline = rgba(196, 196, 196, 1)
                this.fill = rgba(196, 196, 196, .5)
        }
    }
}

class Molotov extends Grenade {
    constructor(entityid, x, y, z, scale) {
        super(entityid, x, y, z, 144, scale)
        
        this.outline = rgba(244, 146, 68, 1)
        this.fill = rgba(244, 146, 68, .5)
        this.thickness = 18 / this.scale
    }
}

class CanvasImage extends Drawable {
    constructor(x, y, src, w, h) {
        super(x, y)
        this.image = new Image()
        this.image.src = src
        this.center = true

        this.dimensions(w, h)
    }

    dimensions(w, h) {
        this.updated = true

        this.w = w
        this.h = h
    }

    draw(context) {
        this.updated = false
        let w = this.w || this.image.width
        let h = this.h || this.image.height

        if(this.center){
            context.drawImage(this.image, this.x - (w / 2), this.y - (h / 2), w, h)
        } else {
            context.drawImage(this.image, this.x, this.y, w, h)
        }
    }


    set src(source) {
        this.updated = true

        this.image.src = src
    }

    get src() {
        return this.image.src
    }
}

class CanvasText extends Drawable {
    constructor(x, y, text, color, font, align) {
        super(x, y)
        this.text = text
        this.fill = color || '#ffffff'
        this.font = font || '18px roboto'
        this.align = align || 'left'
        this.updated = true
        this.visible = true

        this.offsetX = 0
        this.offsetY = 0
    }

    draw(context) {
        let x = this.x + this.offsetX
        let y = this.y + this.offsetY

        context.font = this.font
        context.textAlign = this.align
        context.fillStyle = this.fill
        context.fillText(this.text, x, y)
    }

    set text(text) {
        this.content = text
    }

    get text() {
        return this.content
    }
}

class Bomb extends Drawable {
    constructor(x, y) {
        super(x, y)
        this.sprites = [
            new CanvasImage(x, y, './images/C4_small.png', 19, 22),
            new CanvasImage(x, y, './images/C4_red_small.png', 19, 22),
            new CanvasImage(x, y, './images/C4_green_small.png', 19, 22),
            new CanvasImage(x, y, './images/C4_exploded_small.png', 19, 22)
        ]

        this.updated = true
        this.visible = true
        this.userid = 0

        this.setCurrentSprite(0)
    }

    reset() {
        this.setCurrentSprite(0)
    }

    plant() {
        this.setCurrentSprite(1)
    }

    defuse() {
        this.setCurrentSprite(2)
    }

    detonate() {
        this.setCurrentSprite(3)
    }

    setCurrentSprite(index) {
        this.sprite = this.sprites[index]

        for(let sprite of this.sprites)
            sprite.hide()

        this.sprite.show()
        this.setPosition(this.x, this.y)
    }

    setPosition(x, y, z) {
        super.setPosition(x, y)

        let offsetX = this.userid == 0 ? 0 : 20
        let offsetY = this.userid == 0 ? 0 : 15

        this.sprite.setPosition(x + offsetX, y + offsetY)
        this.z = z
    }

    hide() {
        this.visible = false

        for(let sprite of this.sprites)
            sprite.hide()
    }

    show() {
        this.visible = true

        for(let sprite of this.sprites)
            sprite.show()
    }

    draw(context) {
        this.sprite.draw(context)
        this.sprite.updated = true
    }
}

class PlayerCircle extends Drawable {
    constructor(x, y) {
        super(x, y)
        this.player = new Circle(x, y, 8)
        this.outline = new Arc(x, y, 8, 0, 360)
        this.outline.thickness = 16
        this.updated = true
        this.visible = true
    }

    setPosition(x, y) {
        this.x = x
        this.y = y

        this.player.setPosition(x, y)
        this.outline.setPosition(x, y)

        this.updated = true
    }

    setObjectivePercentage(percent) {
        this.outline.start = 0
        this.outline.end = percent * 360
    }

    hide() {
        this.visible = false
        this.player.hide()
        this.outline.hide()
    }

    show() {
        this.visible = true
        this.player.show()
        this.outline.show()
    }

    draw(context) {
        this.updated = false
        this.player.draw(context)
        this.outline.draw(context)
    }
}

class PlayerIcon {
    constructor(x, y, team) {
        this.circle = new PlayerCircle(x, y)
        this.id = new CanvasText(x, y, '', '#ffffff', '12px roboto', 'center')
        this.view = new Triangle(x, y, 6, 0, true)
        this.team = getTeam(team)

        this.circle.outline.outline = getTeamColor(team, .4)
        this.id.offsetY = 4
        
        this.update()
    }

    update() {
        this.circle.player.fill = getTeamColor(this.team)
        this.circle.outline.outline = getTeamColor(this.team, .4)
        this.view.fill = getTeamColor(this.team)
    }

    setPosition(x, y, z, yaw) {
        this.circle.setPosition(x, y)
        this.id.setPosition(x, y)
        this.view.orientation = yaw
        this.view.setPosition(15 * Math.cos(this.view.orientation) + x, 15 * Math.sin(this.view.orientation) + y)
        this.z = z
    }

    hide() {
        this.circle.hide()
        this.id.hide()
        this.view.hide()
    }
    
    show() {
        this.circle.show()
        this.id.show()
        this.view.show()
    }

    draw(context) {
        this.circle.draw(context)
        this.id.draw(context)
        this.view.draw(context)
    }

    setObjectivePercentage(percent) {
        this.circle.setObjectivePercentage(percent)
    }

    set number(num) {
        this.id.text = num
    }
}

class Player extends PlayerIcon {
    constructor(userid, steamid, name, team) {
        super(0, 0, team)

        this.userid = userid
        this.steamid = steamid
        this.name = name
        this.text = new CanvasText(0, 0, '', '#fff', '20px roboto', 'left')
        this.text.fill = getTeamColor(this.team)
        this.isAlive = true
        this.hasKit = false
    }

    set isAlive(status) {
        this.alive = status
        this.updated = status
        this.visible = status

        this.text.fill = status ? getTeamColor(this.team) : '#9D9D9D'
    }

    get isAlive() {
        return this.alive
    }

    swap() {
        if(this.team == 2) {
            this.team = 3
        } else if(this.team == 3) {
            this.team = 2
        }

        this.text.fill = getTeamColor(this.team)

        this.update()
    }

    draw(context) {
        super.draw(context)

        this.circle.updated = this.isAlive
        this.id.updated = this.isAlive
        this.view.updated = this.isAlive
        this.updated = this.isAlive
        this.visible = this.isAlive
    }

    update() {
        super.update()
    }
}

const canvas = {
    players: new Canvas('players'),
    grenades: new Canvas('grenades'),
    shots: new Canvas('shots'),
    list: new Canvas('list'),
    bomb: new Canvas('bomb'),
    background: new Canvas('background')
}

let viewerInfo = {
    rounds: new CanvasText(768, 128, '0 - 0', '#ffffff', '24px roboto'),
    currentTick: new CanvasText(960, 210, '0', '#ffffff', '11px roboto'),
    currentTime: new CanvasText(960, 222, '0', '#ffffff', '11px roboto'),
    currentRound: new CanvasText(960, 234, '0', '#ffffff', '11px roboto'),
    copyright: new CanvasText(11, 245, '© 2018 Brandon Nguyen. All Rights Reserved.', '#777', '11px roboto'),
    tick: new CanvasText(925, 210, 'ticks:', '#ffffff', '11px roboto'),
    time: new CanvasText(925, 222, 'time:', '#ffffff', '11px roboto'),
    round: new CanvasText(925, 234, 'round:', '#ffffff', '11px roboto')
}

let tickrate = 64
let speed = 15
let index = 0
let duration = 0
let loop = false
let pause = false
let scale = 1

function init() {
    let xhr = new XMLHttpRequest()

    xhr.overrideMimeType('application/json')
    xhr.open('GET', './mirage.json', true)
    xhr.onreadystatechange = () => {
        if(xhr.readyState == 4 && xhr.status == '200')
            startViewer(xhr.responseText)
    }
    xhr.send(null)
}

function parsePlayers(playerList) {
    let players = {}
    let num = 0
    let buffer = []
    for(let userid in playerList)
        buffer.push([playerList[userid][2] || 4, userid])
    
    buffer.sort((a, b) => {return b[0] - a[0]}) // use buffer to sort players into teams

    for(let item in buffer) {
        let userid = buffer[item][1]

        if(!players.hasOwnProperty(userid)) {
            let data = playerList[userid]
            let player = new Player(userid, data[0], data[1], data[2] || 'BOT')

            //player.register(canvas.players)
            canvas.players.add(player)

            if(data[0] != 'BOT') {
                player.number = num
                player.text.text = `${num}: ${player.name}`
                player.text.setPosition(300 * Math.floor(num / 5) + 25, (25 * ((num - 5 * (Math.floor(num / 5))) + 1)) + 100)
                
                canvas.list.add(player.text)
                player.update()

                num++
            }

            players[userid] = player
        }
    }

    return players
}

function startViewer(data) {
    console.log('match data loaded, viewer started')

    for(let c in canvas) {
        c = canvas[c]
        let w = window.getComputedStyle(c.canvas, null).getPropertyValue('width')
        let h = window.getComputedStyle(c.canvas, null).getPropertyValue('height')

        if(c.id == 'background')
            scale = parseInt(w) / 1024
        
        c.canvas.setAttribute('width', w)
        c.canvas.setAttribute('height', h)
    }

    let demo = JSON.parse(data)
    let playerData = demo[0]
    let header = demo[1]
    let rounds = demo[2]
    let currentRound = 2
    let bomb = new Bomb(0, 0)

    let players = parsePlayers(playerData)
    
    drawBackground(header.mapName)
    canvas.bomb.add(bomb)

    let start, end, grenadeEvents, events, ticks, totalTicks, tickList, deaths, holder, defuser, bombStatus, firstTick, lastRound, grenades

    function render() {
        if(!(currentRound in rounds)) {
            console.log('stop')
            return
        } // stop loop completely if finished
        setTimeout(render, (2000 / ((tickrate * speed) || 1))) // keep looping ad infinitum
    
        if(pause) return // if paused then don't do anything, but keep looping
    
        /**
         * if(tick >= duration && loop) // loop back to beginning
            tick = 0
        else if(tick >= duration && !loop) // do not loop; stop rendering completely
            return
         */

        /**
         * round data: 
         * 0 = start tick, 
         * 1 array of round end, 
         * 2 grenades, 
         * 3 player events
         * 4 ticks
         */

        if(lastRound != currentRound || lastRound == undefined) {
            [start, end, grenadeEvents, events, ticks] = rounds[currentRound] // all the data encoded in the round object
            tickList = Object.keys(ticks) // this is so that i can map the number of render loops (frames) to ticks
            totalTicks = tickList.length // this is so that it doesnt fucking crash

            lastRound = currentRound
            deaths = [] // people are alive until they're dead
            holder = [] // whomst holdth the bomb
            defuser = [] // anyone have a kit?
            bombStatus = [] // everytime anyone touches the bomb
            grenades = {} // list of existing nades
            canvas.grenades.drawables = [] // clear the drawables list
            bomb.setCurrentSprite(0) // bomb not boom

            if(firstTick == undefined)
                firstTick = tickList[0]

            for(let event of grenadeEvents) {
                let id, time, type, rest, grenade
                [id, time, type, ...rest] = event

                if(!(id in grenades))
                    grenades[id] = {}
                
                grenade = grenades[id]

                switch(type) {
                    case 0: // thrown
                        grenade.begin = time
                        grenade.thrower = rest[4]

                        switch(rest[3]) {
                            case 0: // HE grenade
                                grenade.grenade = new HEGrenade(id, rest[0], rest[1], rest[2], 5, players[rest[4]].team)
                                break
                            case 1: // smokegrenade
                                grenade.grenade = new SmokeGrenade(id, rest[0], rest[1], rest[2], 5, players[rest[4]].team)
                                break
                            case 2: // flash
                                grenade.grenade = new Flashbang(id, rest[0], rest[1], rest[2], 5, players[rest[4]].team)
                                break
                            case 3: // molotov
                                grenade.grenade = new Molotov(id, rest[0], rest[1], rest[2], 5, players[rest[4]].team)
                                break
                            case 4: // decoy
                                grenade.grenade = new Decoy(id, rest[0], rest[1], rest[2], 5, players[rest[4]].team)
                                break // TODO: do some fucking shit here
                            default:
                                console.log(rest[3], id, '?')
                                break
                        }

                        grenade.grenade.hide()

                        canvas.grenades.add(grenades[id].grenade)
                        break
                    case 2: // bounce (X/Y)
                    case 3: // bounce (Z)
                        break
                    case 4: // detonate
                        grenade.detonate = time
                        break
                    case 5: // expired
                        grenade.end = time
                        break
                }
            }

            for(let event of events) {
                switch(event[0]) {
                    case 0: //death [0, death tick, killed, killer, assister, weapon, headshot, penetrated]
                        deaths.push([event[1], event[2]]) // used to set visibility of player, only care about who and when
                        break
                    case 1: // pickup bomb [1, drop tick, userid]
                    case 2: // drop bomb (planting's dropping the bomb too, right?) [2, drop tick, userid]
                        holder.push(event)
                        break
                    case 3: // defuser pickup (you can't drop kits until you die ergo no drop event) [3, pickup tick, userid]
                        defuser.push([event[1], event[2]])
                        break
                    case 4: // begin defuse
                    case 5: // stop defuse (faking)
                    case 6: // bomb defused
                    case 7: // begin bomb plant
                    case 8: // stop bomb plant (faking)
                    case 10: // bomb exploded
                        bombStatus.push(event)
                        break
                    case 9: // bomb planted
                        holder.push(event)
                        bombStatus.push(event)
                        break
                    default: // i'm a fucking idiot and forgot something here
                        console.log('unknown event: ', event)
                        break
                }
            }
        }
        
        if(index < totalTicks) {
            let tick = ticks[tickList[index]]

            for(let id in grenades) {
                let grenade = grenades[id]

                if(tickList[index] > grenade.end) {
                    grenade.grenade.hide()
                } else if(tickList[index] > grenade.begin) {
                    grenade.grenade.show()
                }

                grenade.grenade.detonated = tickList[index] > grenade.detonate
            }

            for(let death of deaths) {
                let time, killed

                [time, killed] = death

                players[killed].isAlive = tickList[index] < time // make them fucking disappear if dead
            }

            for(let pickup of defuser) {
                let time, userid
                
                [time, userid] = pickup

                players[userid].hasKit = tickList[index] > time
            }

            for(let x = 0; x < holder.length; x++) {
                let y = x + 1
                let event, time, userid
                [event, time, userid] = holder[x]

                if(tickList[index] >= time) {
                    let next = y < holder.length ? holder[y][1] : tickList[index]

                    if(tickList[index] <= next) {
                        switch(event) {
                            case 2:
                            case 9:
                                bomb.userid = 0
                                break
                            default:
                                bomb.userid = userid
                                break
                        }
                    }
                }
            }

            for(let x = 0; x < bombStatus.length; x++) {
                let y = x + 1
                let event, time, userid

                [event, time, userid] = bombStatus[x]

                if(tickList[index] >= time) {
                    let next = y < bombStatus.length ? bombStatus[y][1] : tickList[index]

                    if(tickList[index] <= next) {
                        switch(event) {
                            case 4: // defuse start
                                let player = players[userid]
                                let defuseTime = 5 * tickrate * (player.hasKit ? 1 : 2)

                                player.setObjectivePercentage((defuseTime - (tickList[index] - time)) / defuseTime)
                                break
                            case 5: // defuse end
                                players[userid].setObjectivePercentage(1)
                                break
                            case 6: // defuse success - turn green
                                players[userid].setObjectivePercentage(1)
                                bomb.setCurrentSprite(2)
                                break
                            case 7: // plant start
                                players[userid].setObjectivePercentage((200 - (tickList[index] - time)) / 200)
                                break
                            case 8: // plant end
                                players[userid].setObjectivePercentage(1)
                                break
                            case 9: // plant success - turn red
                                players[userid].setObjectivePercentage(1)
                                bomb.setCurrentSprite(1)
                                break
                            case 10: // bomb exploded - turn grey
                                bomb.setCurrentSprite(3)
                                break
                        }
                    }
                }
            }

            for(let entity in tick) {
                if(entity in players) { // entity ID == player user ID
                    let userid = entity
                    let player = players[userid]

                    let x, y, z, yaw

                    [x, y, z, yaw] = tick[entity]
                    
                    x *= scale
                    y *= scale
                    z *= 2 * scale
                    yaw *= 2 

                    player.setPosition(x, y, z, yaw)

                    if(bomb.userid == userid)
                        bomb.setPosition(x, y, z)
                }

                if(entity == 'B') { // B stands for bomb... wow! this is only sent when the bomb is dropped.
                    let x, y, z

                    [x, y, z] = tick['B']
                    
                    x *= scale
                    y *= scale
                    z *= 2 * scale

                    bomb.setPosition(x, y, z)
                }

                if(entity == 'G') {
                    let entid, event, rest

                    for(let grenade of tick['G']) {
                        [entid, event, ...rest] = grenade

                        switch(event){
                            case 1: // move
                                let x = rest[0]
                                let y = rest[1]
                                let z = rest[2]

                                grenades[entid].grenade.setPosition(x, y, z)
                                break
                        }
                    }
                }
            }

            viewerInfo.currentTick.text = tickList[index]
            viewerInfo.currentTime.text = Math.round((tickList[index] - firstTick) / 64)
            viewerInfo.currentRound.text = currentRound + 1

            canvas.bomb.draw()
            canvas.players.draw()
            canvas.list.draw()
            canvas.grenades.draw()

            index ++
        } else {
            for(let userid in players) {
                let player = players[userid]
                player.isAlive = true // fucking zombies

                if(currentRound + 1 == 15)
                    player.swap()
            }

            viewerInfo.rounds.text = `${end[2]} - ${end[3]}`
            canvas.list.draw()

            index = 0
            currentRound++
        }
    }

    render() // start render loop
}

function drawBackground(map) {
    // load radar image for viewer
    let bg = new CanvasImage(0, 0, `radar/${map}.png`)
    bg.center = false
    bg.dimensions(1024 * scale, 1024 * scale)
    canvas.background.add(bg)
    bg.image.onload = () => {
        canvas.background.draw()
        drawList()
    }
}

function drawList() {
    // initialize list
    for(let info in viewerInfo) {
        info = viewerInfo[info]
        canvas.list.add(info)
    }

    canvas.list.draw()
}

init()
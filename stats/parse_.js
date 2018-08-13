const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const demofile = require('demofile')

const keepZData = true

const maps = {
    de_mirage: {
        name: 'Mirage',
        x: -3230,
        y: 1713,
        scale: 5
    },
    de_dust2: {
        name: 'Dust II',
        x: -2376,
        y: 3239,
        scale: 4.4
    },
    de_cache: {
        name: 'Cache',
        x: -2000,
        y: 3250,
        scale: 5.5
    },
    de_cbble: {
        name: 'Cobblestone',
        x: -3840,
        y: 3072,
        scale: 6
    },
    de_inferno: {
        name: 'Inferno',
        x: -2087,
        y: 3870,
        scale: 4.9
    },
    de_overpass: {
        name: 'Overpass',
        x: -4831,
        y: 1781,
        scale: 5.2
    },
    de_train: {
        name: 'Train',
        x: -2477,
        y: 2392,
        scale: 4.7
    }
}

let grenadeList = {
    DT_BaseCSGrenadeProjectile: 0, 
    DT_SmokeGrenadeProjectile: 1,
    DT_MolotovProjectile: 3,
    DT_DecoyProjectile: 4
}

function isDifferent(first, second) {
    if(first.length != second.length) return true

    for(let x = first.length; x--;) {
        if(first[x] !== second[x])
            return true
    }

    return false
}

function parse(path) {
    fs.readFile(path, (err, buffer) => {
        const demo = new demofile.DemoFile()
        let rounds = []
        let map = null
        let players = {}
        let grenades = {} // do not export
        let defusing = false

        function updatePlayers() {
            for(team of demo.entities.teams){
                for(player of team.members){
                    if(!player) continue
                    if(!(players.hasOwnProperty(player.userId))){
                        players[player.userId] = [player.steamId, player.name, player.teamNumber]
                    }
                }
            }
        }

        function convertX(x, offset) {
            /**
             * Convert in-game coordinates to coordinates on a 1024 x 1024px image.
             * Offset is in image coordinates, not game, jeeping consistency on any map.
             * Only convert X/Y coordinate, not required for Z
             */
            x -= map.x
            x /= map.scale
            x += offset || 0

            return Math.round(x)
        }

        function convertY(y, offset) { // look at convertX
            y *= -1
            y += map.y
            y /= map.scale
            y += offset || 0

            return Math.round(y)
        }

        demo.entities.on('create', e => {
            if(e.entity.serverClass.name !== 'CCSPlayer') return
            updatePlayers()
        })

        demo.on('tickend', e => {
            updatePlayers()
        })

        demo.gameEvents.on('round_announce_match_start', e => {
            round_start(e)
            demo.gameEvents.on('round_start', round_start)
        })

        let round_start = e => {
            let lastTick = null
            grenades = {}

            if(!map)
                map = maps[demo.header.mapName]

            let round = [
                demo.currentTick, // start
                new Array(4), // end, 0 = tick, 1 = reason, 2 = t score, 3 = ct score
                [], // grenades -- keep track so that we can skip forward in demos
                [], // events, 0: death, 1: bomb pickup, 2: bomb drop, 3: defuser pickup, 4: defuse begin, 5: defuse end, 6: defused, 7: bomb start plant, 8: bomb stop plant, 9: bomb planted, 10: bomb exploded
                {} // ticks
            ]

            for(let player of demo.entities.players) {
                if(player.hasC4)
                    round[3].push([1, demo.currentTick, player.userId])
            
                if(player.hasKit)
                    round[3].push([3, demo.currentTick, player.userId])
            }

            let tickstart = e => {
                if(lastTick == null)
                    lastTick = demo.currentTick
                
                if(!round[4][demo.currentTick])
                    round[4][demo.currentTick] = {}
            }

            let tickend = e => {
                let tick = round[4][demo.currentTick]
                let prevTick = round[4][lastTick]

                for(let player of demo.entities.players) {
                    /**
                     * Keep all 3D data even if working in 2D, can be useful
                     * on maps like Nuke to determine if players are on A or
                     * B bomb sites and on Train if in B halls or A main.
                     * 
                     * Divide all data by 3 and round, reduces storage space
                     * at the cost of resolution. Best balance is around 2/3.
                     */

                    if(!player.isAlive) continue // only the living have positions
                    let position = []

                    if(keepZData) {
                        position = [
                            convertX(player.position.x),
                            convertY(player.position.y),
                            Math.round(player.position.z / 2),
                            Math.round(player.eyeAngles.yaw / 2),
                            //Math.round(player.eyeAngles.pitch / 2)
                        ]
                    } else {
                        position = [
                            convertX(player.position.x),
                            convertY(player.position.y),
                            Math.round(player.eyeAngles.yaw / 2),
                            //Math.round(player.eyeAngles.pitch / 2)
                        ]
                    }
                    let lastPosition = []
                    
                    if(player.userId in prevTick)
                        lastPosition = prevTick[player.userId]

                    if(isDifferent(position, lastPosition))
                        tick[player.userId] = position

                    if(defusing == player.userId && !player.isDefusing) {
                        round[3].push([5, demo.currentTick, player.userId])
                        defusing = false
                    }
                }

                for(let index in demo.entities.entities) {
                    entity = demo.entities.entities[index]

                    //if(!entity) return // where the fuck did it go?

                    if(entity && entity.serverClass.dtName == 'DT_WeaponC4') {
                        if(!isDifferent([0, 0, 0], [entity.position.x, entity.position.y, entity.position.z])) return // bomb is fucking dead
                        let position = []
                        let lastPosition = []

                        if(keepZData) {
                            position = [
                                convertX(entity.position.x),
                                convertY(entity.position.y),
                                Math.round(player.position.z / 2)
                            ]
                        } else {
                            position = [
                                convertX(entity.position.x),
                                convertY(entity.position.y)
                            ]
                        }

                        if('B' in prevTick)
                            lastPosition = prevTick['B']
                        
                        if(isDifferent(position, lastPosition))
                            tick['B'] = position

                    }
                    
                    if(entity && grenadeList.hasOwnProperty(entity.serverClass.dtName)) {
                        /**
                         * [entityID, event, x, y, z, ?special]
                         * 
                         * entityID = entityID of projectile
                         * event = grenade event
                         *  0: thrown
                         *  1: move
                         *  2: bounce (X/Y plane) keep X/Y and Z bounces different
                         *  3: bounce (Z plane)
                         *  4: detonated
                         *  5: special (smoke/molotov expiration, decoy noise)
                         * grenade = grenade type
                         *  0: HE
                         *  1: Smoke
                         *  2: Flashbang
                         *  3: Molotov
                         *  4: Decoy
                         */

                        if(!tick['G'])
                            tick['G'] = [] // multiple nades can be active at the same time
                        
                        let id = entity.index
                        let velocity = entity.getProp('DT_BaseGrenade', 'm_vecVelocity')
                        let position = []
                        let lastPosition = []

                        if(keepZData) {
                            position = [
                                convertX(entity.position.x),
                                convertY(entity.position.y),
                                Math.round(entity.position.z / 2)
                            ]
                        } else {
                            position = [
                                convertX(entity.position.x),
                                convertY(entity.position.y)
                            ]
                        }

                        if(!grenades[id]) { // grenade thrown
                            let thrower = entity.getProp('DT_BaseEntity', 'm_hOwnerEntity')
                            let nade = grenadeList[entity.serverClass.dtName]

                            thrower = demo.entities.getByHandle(thrower)

                            if(nade == 0 && entity.getProp('DT_BaseEntity', 'm_nModelIndex') == 112)
                                nade = 2

                            if(nade != 1)
                                continue

                            grenades[id] = [velocity.x, velocity.x, velocity.z] // velocity data not transmitted, keep here to determine bounce

                            if(keepZData) {
                                round[2].push([id, demo.currentTick, 0, position[0], position[1], position[2], nade, thrower.userId])
                            } else {
                                round[2].push([id, demo.currentTick, 0, position[0], position[1], nade, thrower.userId])
                            }
                        }
                        
                        /**
                        if(isDifferent([grenades[id][0], grenades[id][1]], [velocity.x, velocity.y])) // bounced horizontally
                            round[2].push([id, demo.currentTick, 2, position[0], position[1], position[2]])
                        
                        if(keepZData && grenades[id][2] != velocity.z) // bounced vertically
                            round[2].push([id, demo.currentTick, 3, position[0], position[1], position[2]])
                         */
                        if(lastTick['G']) {
                            for(let grenade of lastTick['G']) {
                                if(grenade[0] == id && grenade[1] == 1) {
                                    if(keepZData) {
                                        lastPosition = [grenade[2], grenade[3], grenade[4]]
                                    } else {
                                        lastPosition = [grenade[2], grenade[3]]
                                    }
                                }
                            }
                        }

                        if(isDifferent(position, lastPosition)){
                            if(keepZData) {
                                tick['G'].push([id, 1, position[0], position[1], position[2]])
                            } else {
                                tick['G'].push([id, 1, position[0], position[1]])
                            }
                        }
                        
                        grenades[id] = [velocity.x, velocity.y, velocity.z]

                        if(tick['G'].length == 0)
                            delete tick['G']
                    }
                }
                
                lastTick = demo.currentTick
            }

            let item_pickup = e => {
                if(e.item == 'defuser')
                    round[3].push([3, demo.currentTick, e.userid])
            }

            let player_death = e => {
                round[3].push([0, demo.currentTick, e.userid, e.attacker, e.assister, e.weapon, e.headshot, e.penetrated])
            }

            let round_end = e => {
                round[1][1] = e.reason
            }

            let bomb_defused = e => {
                round[3].push([6, demo.currentTick, e.userid])
            }

            let bomb_beginplant = e => {
                round[3].push([7, demo.currentTick, e.userid])
            }

            let bomb_abortplant = e => {
                round[3].push([8, demo.currentTick, e.userid])
            }

            let bomb_planted = e => {
                round[3].push([9, demo.currentTick, e.userid])
            }

            let bomb_exploded = e => {
                round[3].push([10, demo.currentTick, 0])
            }

            let bomb_dropped = e => {
                round[3].push([2, demo.currentTick, e.userid])
            }

            let bomb_pickup = e => {
                round[3].push([1, demo.currentTick, e.userid])
            }

            let bomb_begindefuse = e => {
                defusing = e.userid
                round[3].push([4, demo.currentTick, e.userid, e.haskit])
            }

            let bomb_abortdefuse = e => {
                round[3].push([5, demo.currentTick, e.userid])
            }

            let beforeRemove = e => {
                if(e.entity.serverClass.name !== 'CCSPlayer') return
                round[3].push([0, demo.currentTick, e.entity.userid, 0])
            }

            let smokegrenade_detonate = e => {
                round[2].push([e.entityid, demo.currentTick, 4])
            }

            let smokegrenade_expired = e => {
                round[2].push([e.entityid, demo.currentTick, 5])
            }

            let hegrenade_detonate = e => {
                round[2].push([e.entityid, demo.currentTick, 4])
            }

            let flashbang_detonate = e => {
                round[2].push([e.entityid, demo.currentTick, 4])
            }

            let decoy_detonate = e => {
                round[2].push([e.entityid, demo.currentTick, 4])
            }

            let decoy_firing = e => {
                round[2].push([e.entityid, demo.currentTick, 5])
            }

            //molotov_detonate, inferno_startburn, inferno_expire, inferno_extinguish
            

            let round_officially_ended = e => {
                round[1][0] = demo.currentTick
                round[1][2] = demo.teams[2].score
                round[1][3] = demo.teams[3].score
                rounds.push(round)

                demo.removeListener('tickstart', tickstart)
                demo.removeListener('tickend', tickend)
                demo.removeListener('end', end)
                //demo.gameEvents.removeListener('round_announce_match_start', round_announce_match_start)
                demo.gameEvents.removeListener('item_pickup', item_pickup)
                demo.gameEvents.removeListener('bomb_abortplant', bomb_abortplant)
                demo.gameEvents.removeListener('bomb_beginplant', bomb_beginplant)
                demo.gameEvents.removeListener('round_end', round_end)
                demo.gameEvents.removeListener('round_officially_ended', round_officially_ended)
                demo.gameEvents.removeListener('player_death', player_death)
                demo.gameEvents.removeListener('bomb_defused', bomb_defused)
                demo.gameEvents.removeListener('bomb_planted', bomb_planted)
                demo.gameEvents.removeListener('bomb_exploded', bomb_exploded)
                demo.gameEvents.removeListener('bomb_dropped', bomb_dropped)
                demo.gameEvents.removeListener('bomb_pickup', bomb_pickup)
                demo.gameEvents.removeListener('bomb_begindefuse', bomb_begindefuse)
                demo.gameEvents.removeListener('bomb_abortdefuse', bomb_abortdefuse)
                demo.gameEvents.removeListener('smokegrenade_detonate', smokegrenade_detonate)
                demo.gameEvents.removeListener('smokegrenade_expired', smokegrenade_expired)
                /*demo.gameEvents.removeListener('hegrenade_detonate', hegrenade_detonate)
                demo.gameEvents.removeListener('flashbang_detonate', flashbang_detonate)
                demo.gameEvents.removeListener('decoy_detonate', decoy_detonate)
                demo.gameEvents.removeListener('decoy_firing', decoy_firing)
                /*demo.gameEvents.removeListener('inferno_startburn', inferno_startburn)
                demo.gameEvents.removeListener('inferno_extinguish', inferno_extinguish)
                demo.gameEvents.removeListener('inferno_expire', inferno_expire)*/
                demo.entities.removeListener('beforeRemove', beforeRemove)
                //demo.entities.removeListener(create)

                //process.exit()
            }

            let end = e => {
                round_officially_ended(e)                
                console.error(rounds.length)
                console.log(JSON.stringify([players, demo.header, rounds]))
            }

            demo.on('end', end)
            demo.on('tickend', tickend)
            demo.on('tickstart', tickstart)
            //demo.gameEvents.on('round_announce_match_start', round_announce_match_start)
            demo.gameEvents.on('item_pickup', item_pickup)
            demo.gameEvents.on('bomb_abortplant', bomb_abortplant)
            demo.gameEvents.on('bomb_beginplant', bomb_beginplant)
            demo.gameEvents.on('player_death', player_death) 
            demo.gameEvents.on('round_end', round_end)
            demo.gameEvents.on('bomb_defused', bomb_defused)
            demo.gameEvents.on('bomb_planted', bomb_planted)
            demo.gameEvents.on('bomb_exploded', bomb_exploded)
            demo.gameEvents.on('bomb_dropped', bomb_dropped)
            demo.gameEvents.on('bomb_pickup', bomb_pickup)
            demo.gameEvents.on('bomb_begindefuse', bomb_begindefuse)
            demo.gameEvents.on('bomb_abortdefuse', bomb_abortdefuse)
            demo.gameEvents.on('round_officially_ended', round_officially_ended)
            demo.gameEvents.on('smokegrenade_detonate', smokegrenade_detonate)
            demo.gameEvents.on('smokegrenade_expired', smokegrenade_expired)
            /*demo.gameEvents.on('hegrenade_detonate', hegrenade_detonate)
            demo.gameEvents.on('flashbang_detonate', flashbang_detonate)
            demo.gameEvents.on('decoy_detonate', decoy_detonate)
            demo.gameEvents.on('decoy_firing', decoy_firing)
            /*demo.gameEvents.on('inferno_startburn', inferno_startburn)
            demo.gameEvents.on('inferno_extinguish', inferno_extinguish)
            demo.gameEvents.on('inferno_expire', inferno_expire)*/
            demo.entities.on('beforeRemove', beforeRemove)
        }

        demo.parse(buffer)
    })
}

parse(process.argv[2])
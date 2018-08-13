const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const demofile = require('demofile')

let db = new sqlite3.Database('./test.db')

/**
 * TABLE: match
 * map (TEXT) date (TEXT) duration (INTEGER) score (TEXT) players (TEXT) stats (TEXT)
 * 
 * map: map name
 * date: date of match
 * duration: duration of match in ticks
 * score: scoreline of both teams on both halves
 *      [
 *          [11, 12], // first int = team, second int half
 *          [21, 22]
 *      ]
 * players: list of players
 *      [
 *          [steamid, name],
 *          [steamid, name],
 *          [steamid, name],
 *          ...
 *      ]
 * stats: overall player statistics
 *      {
 *          steamid: {
 *              kills: {
 *                  total: int,
 *                  headshot: int,
 *                  wallbang: int,
 *                  flashed: int,
 *                  team: int,
 *                  self: int,
 *                  trade: int
 *              },
 *              assists: int,
 *              deaths: int,
 *              damage: int,
 *              damage_utility: int,
 *              damage_armor: int,
 *              enemies_flashed: int,
 *              survived: int,
 *              traded: int,
 *              rounds_played: int
 *          },
 *          ...
 *      }
 * 
 * TABLE: match_data
 * match (INTEGER) tick (INTEGER) data (TEXT)
 * 
 * match: associated match
 * tick: associated tick
 * data: payload
 * 
 * TABLE: players
 * steamid (TEXT) matches (TEXT) record (TEXT) stats (TEXT)
 * 
 * steamid: user's steamid
 * matches: list of match IDs player has played in
 * record: W/T/L record of the player
 *      [
 *          wins (int),
 *          ties (int),
 *          losses (int)
 *      ]
 * stats: overall player statistics, see stats column in match table
 */

db.serialize(() => {
    // create tables
    db.run(
        'CREATE TABLE IF NOT EXISTS match (' +
        'map TEXT' +
        'date TEXT' +
        'server TEXT' +
        'ticks INTEGER' +
        'frames INTEGER' +
        'time NUMERIC' +
        'tickrate INTEGER' +
        'score TEXT' +
        'players TEXT' +
        'stats TEXT' +
        ')'
    )
    db.run(
        'CREATE TABLE IF NOT EXISTS match_data (' +
        'match INTEGER' +
        'tick INTEGER' +
        'data TEXT' +
        ')'
    )
    db.run(
        'CREATE TABLE IF NOT EXISTS player (' +
        'steamid TEXT' +
        'matches TEXT' +
        'record TEXT' +
        'stats TEXT' +
        ')'
    )
})
let lastTick = 0
function parseDemo(path){
    fs.readFile(path, (err, buffer) => {
        const demo = new demofile.DemoFile()
        let position = {}
        let killfeed = {}
        let rounds   = {}
        let plyrs = {}
        /**
         * grenades = {
            hegrenade: {},
            flashbang: {},
            smokegrenade: {
                detonate: {},
                expired: {}
            },
            molotov: {},
            decoy: {
                started: {},
                firing: {},
                detonate: {}
            }
        }
         */

        let grenades = {}

        function isDifferent(first, second){
            if(first.length != second.length) return true

            for(let x = first.length; x--;) {
                if(first[x] !== second[x])
                    return true
            }

            return false

            //return first.toString() == second.toString()
            //return !!first.reduce((a, b) => {return  (a == b) ? a : NaN})
        }
        demo.gameEvents.on('round_start', e => {
            console.error(100, demo.currentTick)
        })
        demo.gameEvents.on('round_officially_ended', e => {
            console.error(200, demo.currentTick)
        })

        demo.gameEvents.on('round_announce_match_start', e => {
            if(!position[demo.currentTick])
                position[demo.currentTick] = {}
            
            for(player of demo.entities.players)
                if(player.hasC4)
                    position[demo.currentTick]['B'] = player.userId
            
            demo.on('tickstart', e => {
                if(lastTick == 0)
                    lastTick = demo.currentTick
                
                if(!position[demo.currentTick])
                    position[demo.currentTick] = {}
            })
            let vlad = 0
            demo.on('tickend', e => {
                if(!position[demo.currentTick])
                    position[demo.currentTick] = {}
            
                for(player of demo.entities.players){
                    let pos = {}
                    let data = []
                    pos.x = Math.round(player.position.x / 2)
                    pos.y = Math.round(player.position.y / 2)
                    //pos.z = Math.round(player.position.z / 2)
                    //pos.pitch = Math.round(player.eyeAngles.pitch / 2)
                    pos.yaw = Math.round(player.eyeAngles.yaw / 2)
                    data = [pos.x, pos.y, pos.yaw]
                    
                    let lastPos = []
                    if(lastTick in position && player.userId in position[lastTick])
                        lastPos = position[lastTick][player.userId]
                    

                    if(player.isAlive && isDifferent(data, lastPos))
                        position[demo.currentTick][player.userId] = data
                }
                
                for(entindex in demo.entities.entities) {
                    entity = demo.entities.entities[entindex]
                    if(entity && entity.serverClass.dtName == 'DT_WeaponC4'){
                        let pos = {}
                        let data = []
                        pos.x = Math.round(entity.position.x / 2)
                        pos.y = Math.round(entity.position.y / 2)
                        //pos.z = Math.round(entity.position.z / 2)
                        data = [pos.x, pos.y]

                        let lastPos = []
                        if(lastTick in position && 'Z' in position[lastTick])
                            lastPos = position[lastTick]['Z']
                        
                        if(isDifferent(data, lastPos) && isDifferent([0, 0,  0], [entity.position.x, entity.position.y, entity.position.z]))
                            position[demo.currentTick]['Z'] = data
                    }
                }

                for(entindex in demo.entities.entities) {
                    entity = demo.entities.entities[entindex]
                    if(entity && entity.serverClass.dtName == 'DT_SmokeGrenadeProjectile'){
                        /**
                         * 'G' structure: [entityID, grenade, event, ?special, x, y]
                         * 
                         * entityID = entityID of projectile
                         * grenade = grenade type
                         *  0: HE
                         *  1: Smoke
                         *  2: Flashbang
                         *  3: Molotov
                         *  4: Decoy
                         * event = grenade event
                         *  0: thrown
                         *  1: move
                         *  2: bounce (X/Y plane)
                         *  3: bounce (Z plane)
                         *  4: detonated
                         *  5: special (smoke/molotov expiration, decoy noise)
                         */
                        if(!position[demo.currentTick]['G'])
                            position[demo.currentTick]['G'] = []

                        let velocity = entity.getProp('DT_BaseGrenade', 'm_vecVelocity')
                        let lastPos = []
                        let data = [Math.round(entity.position.x / 2), Math.round(entity.position.y / 2)]
                        //pos.z = Math.round(entity.position.z / 2)

                        if(!grenades[entindex]) { // the grenade is thrown, transmit 'G' struct with event=0
                            let thrower = entity.getProp('DT_BaseEntity', 'm_hOwnerEntity') // not networked for molotovs?
                            thrower = demo.entities.getByHandle(thrower)

                            grenades[entindex] = [velocity.x, velocity.y]

                            position[demo.currentTick]['G'].push([entindex, 1, 0, thrower.userid, data[0], data[1]])
                        } else if(isDifferent(grenades[entindex], [velocity.x, velocity.y])){
                            // the grenade has bounced (changed velo in X/Y plane), transmit 'G' struct with event=1
                            grenades[entindex].velocity = {x: velocity.x, y: velocity.y} 
                            position[demo.currentTick]['G'].push([entindex, 1, 1])
                        }

                        if(lastTick in position && 'G' in position[lastTick]) {
                            for(ent of position[lastTick]['G']) {
                                if(ent[0] == entindex && ent[1] == 1) { // check if same entity index and is smoke
                                    if(ent[2] == 0) { // thrown has special that makes x and y go up 1 in index
                                        lastPos = [ent[4], ent[5]]
                                    } else if(ent[2] == 1){
                                        lastPos = [ent[3], ent[4]]
                                    }
                                }
                            }
                        }

                        if(isDifferent(data, lastPos))
                            position[demo.currentTick]['G'].push([entindex, 1, 2, data[0], data[1]])
                        
                        if(position[demo.currentTick]['G'].length == 0)
                            delete position[demo.currentTick]['G']
                    }
                }

                lastTick = demo.currentTick
            })

            demo.gameEvents.on('bomb_defused', e => {
                position[demo.currentTick]['S'] = 1
            })
            demo.gameEvents.on('bomb_planted', e => {
                position[demo.currentTick]['S'] = 0
                position[demo.currentTick]['B'] = 0
            })
            demo.gameEvents.on('bomb_exploded', e => {
                position[demo.currentTick]['S'] = 2
            })
            demo.gameEvents.on('bomb_dropped', e => {
                position[demo.currentTick]['B'] = 0
            })
            demo.gameEvents.on('bomb_pickup', e => {
                position[demo.currentTick]['B'] = e.userid
            })
            demo.gameEvents.on('bomb_begindefuse', e => {
                position[demo.currentTick]['E'] = [e.userid, 0]
            })
            demo.gameEvents.on('bomb.abortdefuse', e => {
                position[demo.currentTick]['E'] = [e.userid, 0]
            })
            demo.gameEvents.on('bot_takeover', e => {
                console.error('bot_takeover', e.userid, e.botid, e.index)
            })
            /** TODO: finish rest of nades
             demo.gameEvents.on('hegrenade_detonate', e => {
                if(!position[demo.currentTick]['G'])
                    position[demo.currentTick]['G'] = []
                position[demo.currentTick]['G'].push([e.userid, 0, e.entityid, Math.round(e.x / 2), Math.round(e.y / 2)])
            })
            demo.gameEvents.on('flashbang_detonate', e => {
                if(!position[demo.currentTick]['G'])
                    position[demo.currentTick]['G'] = []
                position[demo.currentTick]['G'].push([e.userid, 1, e.entityid, Math.round(e.x / 2), Math.round(e.y / 2)])
            })
            demo.gameEvents.on('molotov_detonate', e => {
                if(!position[demo.currentTick]['G'])
                    position[demo.currentTick]['G'] = []
                position[demo.currentTick]['G'].push([e.userid, 4, e.entityid, Math.round(e.x / 2), Math.round(e.y / 2)])
            })
             */
            demo.gameEvents.on('smokegrenade_detonate', e => {
                if(!position[demo.currentTick]['G'])
                    position[demo.currentTick]['G'] = []
                position[demo.currentTick]['G'].push([e.entityid, 1, 4])
            })
            demo.gameEvents.on('smokegrenade_expired', e => {
                if(!position[demo.currentTick]['G'])
                    position[demo.currentTick]['G'] = []
                position[demo.currentTick]['G'].push([e.entityid, 1, 4])
            })

            demo.gameEvents.on('item_pickup', e => {
                if(e.item == 'defuser'){
                    if(!position[demo.currentTick]['P'])
                        position[demo.currentTick]['P'] = []
                    position[demo.currentTick]['P'].push(e.userid)
                }
            })

            demo.gameEvents.on('weapon_fire', e => {
                /** 
                 * for(entindex in demo.entities.entities) {
                    entity = demo.entities.entities[entindex]
                    if(entity && entity.serverClass.dtName == 'DT_SmokeGrenadeProjectile'){
                        let pos = {}
                        let data = []
                        pos.x = Math.round(entity.position.x / 2)
                        pos.y = Math.round(entity.position.y / 2)
                        //pos.z = Math.round(entity.position.z / 2)
                        data = [pos.x, pos.y]

                        let lastPos = []
                        if(lastTick in position && 'Z' in position[lastTick])
                            lastPos = position[lastTick]['Z']
                        
                        if(isDifferent(data, lastPos) && isDifferent([0, 0,  0], [entity.position.x, entity.position.y, entity.position.z]))
                            position[demo.currentTick]['Z'] = data
                    }
                }
                 */
            })

            demo.gameEvents.on('round_start', e => {
                position[demo.currentTick]['S'] = 3

                for(team of demo.entities.teams)
                    for(pl of team.members)
                        if(!(plyrs.hasOwnProperty(pl.userId)))
                            plyrs[pl.userId] = [pl.steamId, pl.name, team.teamNumber]
            })

            demo.gameEvents.on('round_end', z => {
                tick = demo.currentTick
                do_round_end = e => {
                    let teams = demo.teams;
                
                    let terrorists = teams[demofile.TEAM_TERRORISTS];
                    let cts = teams[demofile.TEAM_CTS];
                    
                    rounds[tick] = [demo.gameRules.phase == 'first' ? 1 : 2, terrorists.score, cts.score, z.reason]
                    demo.gameEvents.removeListener('round_officially_ended', do_round_end)
                    demo.removeListener('end', do_round_end)
                    position[tick]['B'] = 0
                }
                demo.gameEvents.on('round_officially_ended', do_round_end)
                demo.on('end', do_round_end)
            })

            demo.gameEvents.on('player_death', e => {
                if(killfeed[demo.currentTick] == undefined)
                    killfeed[demo.currentTick] = []
                killfeed[demo.currentTick].push([e.userid, e.attacker, e.assister, e.weapon, e.headshot, e.penetrated])
            })
        })
        function dump(){
            keys = Object.keys(position).sort((a, b) => {return a - b})
            p = {}
            for(i = 0; i < keys.length; i++)
                p[keys[i]] = position[keys[i]]
            
            obj = [
                plyrs,
                rounds,
                killfeed,
                p,
                demo.header
            ]
            console.log(JSON.stringify(obj))
        }
        demo.on('end', () => {
            dump()
        })

        demo.parse(buffer)
    })
}

parseDemo(process.argv[2])
db.close()
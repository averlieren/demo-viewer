import itertools
import numpy as np
import json
from matplotlib import pyplot as plt, animation as animation
from math import floor

fig = plt.figure(figsize=(10,10), facecolor='#dddddd')
ax = fig.add_subplot(111)

img = plt.imread('de_mirage_radar.png')
tick = ax.text(0, -25, 'tick: ', color='#ffffff')
duration = ax.text(0, -50, 'time: ', color='#ffffff')
cur_tick = ax.text(100, -25, '0', color='#ffffff')
cur_time = ax.text(100, -50, '0', color='#ffffff')
cptxt = ax.text(0, -75, '© Brandon Nguyen', color='#ffffff')
rounds = ax.text(600, 1050, '0 - 0', color='#ffffff', size='20')
player_list = ax.text(200, -25, f'Players:', color='#ffffff')
text = [
    'map: de_mirage',
    'server: Valve CS:GO US SouthWest Server (srcds100.115.42)',
    'playback_time: 2446.25',
    'playback_ticks: 156560',
    'date: 20180801T180100Z'
]
for line in range(0, len(text)):
    ax.text(0, 1050 + (25 * line), text[line], color='#ffffff')

# left right bottom top
coords = [0, 1024, 0, 1024] 
ax.axis(coords)
ax.imshow(img, extent = coords)

fig.figsize = (8, 8)

map_x = -3230 # top left corner of map
map_y =  1713 # bottom right corner of map
map_s =  5

# minimap dimensions
img_x = 1024
img_y = 1024

Writer = animation.writers['ffmpeg']
writer = Writer(fps=60, bitrate=1200)

players = {}
def set_team_color(player, team):
    p = players[player]
    if team == 3: #terrorists = 2
        p[3].set_color('#000000')
        p[4].set_color('#CCBA7C')
        p[5].set_color('#CCBA7C')
    elif team == 2: #cts = 3
        p[3].set_color('#ffffff')
        p[4].set_color('#5D79AE')
        p[5].set_color('#5D79AE')

with open('positions.txt', 'r', encoding = 'utf-8') as f:
    data = json.loads(f.read())
    data_players = data[0]
    data_rounds  = data[1]
    data_feed    = data[2]
    data_pos     = data[3]
    phase        = None

    tracers = []

    first_tick = None
    last_tick = None
    total_tick = len(data_pos)
    tick_list = list(data_pos)
    p_num = 0
    teams = {2: [], 3: []}
    team_text = {2: [], 3: []}

    for player in data_players:
        p = data_players[player]
        if player not in teams[2] and player not in teams[3]:
            if len(p) == 3 and p[0] != 'BOT':
                teams[p[2]].append(player)
            elif player not in players:
                player_number = ax.text(0, 0, '', color = '#ffffff', size = '6.5', ha = 'center', va = 'center')
                player_text = ax.text(0, 0, '', color = '#ffffff', size = '6.5', ha = 'center', va = 'center')
                player_point, = ax.plot(0, 0, marker = 'o', markersize = '10')
                player_point.set_color('#ffffff')

                players[player] = [
                    p[0],
                    p[1],
                    'BOT',
                    player_number,
                    player_text,
                    player_point
                ]
    
    for team in teams:
        for player in teams[team]:
            if player not in players:
                p = data_players[player]
                player_number = ax.text(0, 0, p_num, color = '#ffffff', size = '6.5', ha = 'center', va = 'center')
                player_point, = ax.plot(0, 0, marker = 'o', markersize = '10')
                player_text   = ax.text(300 * team - 400, -20 * (p_num % 5) - 50, f'{p_num}: {p[1]}', color = '#CCBA7C' if team == 2 else '#5D79AE', size = '9')

                players[player] = [
                    p[0],
                    p[1],
                    p[2],
                    player_number,
                    player_text,
                    player_point
                ]
                
                set_team_color(player, team)

                p_num += 1

    def animate(i):
        global first_tick, phase, tracers, last_tick
        i += 0
        if i < total_tick: #data_pos will have every tick in the game even if no player position is recorded
            if last_tick == None:
                last_tick = tick_list[i]
            else:
                last_tick = tick_list[i - 1]
            current_tick = tick_list[i]

            for x in range(0, len(tracers)):
                tracer = tracers[x]
                tracer.remove()
            
            tracers = []

            if first_tick == None:
                first_tick = int(current_tick)
            
            if current_tick in data_feed:
                # killed killer assister weapon headshot wallbang
                kills = data_feed[current_tick]

                for kill in kills:
                    x1, x2, y1, y2 = [0, 0, 0, 0]
                    color = '#cc9f06'
                    
                    if str(kill[0]) in data_pos[last_tick]:
                        victim = data_pos[last_tick][str(kill[0])]
                        x1 = (victim['x'] + 3230) / 5
                        y1 = (victim['y'] + 3407) / 5
                    
                    if str(kill[1]) in data_pos[current_tick]:
                        attacker = data_pos[current_tick][str(kill[1])]
                        x2 = (attacker['x'] + 3230) / 5
                        y2 = (attacker['y'] + 3407) / 5

                        if players[str(kill[1])][2] == 2:
                            color = '#5D79AE'
                    
                    tracer, = plt.plot((x1, x2), (y1, y2), color, linewidth='1.5')
                    tracers.append(tracer)

                
            
            for player in players:
                if player in data_pos[current_tick]:
                    x = (data_pos[current_tick][player]['x'] + 3230) / 5
                    y = (data_pos[current_tick][player]['y'] + 3407) / 5
                    players[player][3].set_x(x)
                    players[player][3].set_y(y)
                    players[player][5].set_data(x, y)
                    set_team_color(player, players[player][2])
                else:
                    players[player][3].set_x(-100)
                    players[player][3].set_y(-100)
                    players[player][5].set_data(-100, -100)
                    players[player][4].set_color('#9B9B9B')
            
            if current_tick in data_rounds:
                round_data = data_rounds[current_tick]
                rounds.set_text(f'{round_data[1]} - {round_data[2]}')
                if phase != round_data[0]:
                    if phase != None:
                        for player in players:
                            if players[player][2] != 'BOT':
                                if players[player][2] == 2:
                                    players[player][2] = 3
                                elif players[player][2] == 3:
                                    players[player][2] = 2
                                
                                set_team_color(player, players[player][2])
                    
                    phase = round_data[0]
                print(i, current_tick, phase)


            cur_tick.set_text(current_tick)
            cur_time.set_text(round((int(current_tick) - first_tick) / 64))
    
    ani = animation.FuncAnimation(fig, animate, interval = 1, repeat = False, frames = 1500)
    #ani.save('movement.mp4', writer=writer, savefig_kwargs={'facecolor': '#000000'})
    plt.show()
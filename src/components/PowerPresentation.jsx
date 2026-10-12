'use client';

import {Flame,Shield,Orbit,Snowflake,Gem,Zap,TimerReset,Shuffle,Rocket,Flower2,ScanEye,Ghost,Move,Skull,Sun,Wind,CloudMoon,Waves,Anchor,History,FlameKindling} from 'lucide-react';
import {POWER_CATALOG} from '../lib/game-engine/index';

const presentation={
 fire:{icon:Flame,color:'#ff955f',element:'Fire',sprite:0},
 shield:{icon:Shield,color:'#7ecfff',element:'Light',sprite:1},
 portal:{icon:Orbit,color:'#9ae9cd',element:'Void',sprite:2},
 ice:{icon:Snowflake,color:'#8be5ff',element:'Ice'},
 crystal:{icon:Gem,color:'#bd9fff',element:'Crystal'},
 surge:{icon:Zap,color:'#f1d78a',element:'Arcane'},
 lightning:{icon:Zap,color:'#f8ed7f',element:'Lightning'},
 time:{icon:TimerReset,color:'#9eb5ff',element:'Time'},
 shadow:{icon:Shuffle,color:'#c298ee',element:'Shadow'},
 meteor:{icon:Rocket,color:'#f8a076',element:'Cosmic fire'},
 bloom:{icon:Flower2,color:'#8adba8',element:'Nature'},
 mirror:{icon:ScanEye,color:'#c9e6ff',element:'Light'},
 phantom:{icon:Ghost,color:'#bda8eb',element:'Spectral'},
 gravity:{icon:Move,color:'#b79cfa',element:'Gravity'},
 poison:{icon:Skull,color:'#b8d080',element:'Venom'},
 purify:{icon:Sun,color:'#f0e3aa',element:'Radiance'},
 dragon:{icon:FlameKindling,color:'#ffb285',element:'Dragon fire'},
 eclipse:{icon:CloudMoon,color:'#d6b2ed',element:'Eclipse'},
 tide:{icon:Waves,color:'#88d3e2',element:'Water'},
 wind:{icon:Wind,color:'#a6e4cd',element:'Wind'},
 root:{icon:Anchor,color:'#b0ce8d',element:'Earth'},
 echo:{icon:History,color:'#b9beef',element:'Time'},
};
const roles={offense:'Offense',defense:'Defense',positioning:'Mobility',control:'Control',energy:'Utility',tempo:'Tempo',restoration:'Restoration',deception:'Illusion',counterplay:'Counterplay',ultimate:'Ultimate'};
export const POWER_INFO=POWER_CATALOG.map(power=>({...power,...presentation[power.id],role:roles[power.category]||power.category}));
export const powerInfo=id=>POWER_INFO.find(power=>power.id===id);
export function PowerIcon({id,size=22,...props}){const Icon=powerInfo(id)?.icon||Orbit;return <Icon size={size} {...props}/>;}
export const POWER_TONES={fire:[110,60,'sawtooth'],shield:[620,880,'sine'],portal:[170,700,'triangle'],ice:[1100,650,'sine'],crystal:[800,1200,'triangle'],surge:[200,950,'sine'],lightning:[1600,90,'sawtooth'],time:[720,360,'sine'],shadow:[90,280,'triangle'],meteor:[85,35,'sawtooth'],bloom:[440,880,'sine'],mirror:[1300,720,'triangle'],phantom:[340,220,'sine'],gravity:[240,65,'triangle'],poison:[130,260,'sawtooth'],purify:[980,1480,'sine'],dragon:[190,45,'sawtooth'],eclipse:[55,220,'triangle'],tide:[250,540,'sine'],wind:[780,1450,'triangle'],root:[130,95,'triangle'],echo:[560,1120,'sine']};

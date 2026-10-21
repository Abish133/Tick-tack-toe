import {Cinzel, Inter, Rajdhani} from 'next/font/google';
import './globals.css';
import './board-hud.css';
import './game-theme.css';
import './ascendant-theme.css';
import './polish.css';
import './glass.css';
import './ascendant-motion.css';
import './game-ui.css';
import './dominion-theme.css';
import ArenaApp from '@/components/ArenaApp';
const display=Cinzel({subsets:['latin'],weight:['700','900'],variable:'--font-cinzel',display:'swap'});
const ui=Rajdhani({subsets:['latin'],weight:['600','700'],variable:'--font-rajdhani',display:'swap'});
const body=Inter({subsets:['latin'],variable:'--font-inter',display:'swap'});
export const metadata={title:'Elemental Arena · Think. Strike. Conquer.',description:'Tactical 3×3 through 6×6 battles. Three equipped powers. Your strategy wins.',icons:{icon:'/favicon.svg'}};
export const viewport={width:'device-width',initialScale:1,themeColor:'#070e21'};
export default function RootLayout({children}) {return <html lang="en" className={`${display.variable} ${ui.variable} ${body.variable}`}><body><ArenaApp/>{children}</body></html>;}

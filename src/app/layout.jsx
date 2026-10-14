import './globals.css';
import './game-theme.css';
import './board-hud.css';
import ArenaApp from '@/components/ArenaApp';
export const metadata = { title: 'Elemental Arena · Think. Strike. Conquer.', description: 'Tactical 3×3 through 6×6 battles. Three equipped powers. Your strategy wins.', icons:{icon:'/favicon.svg'} };
export const viewport = { width:'device-width', initialScale:1, themeColor:'#080d16' };
export default function RootLayout({children}) { return <html lang="en"><body><ArenaApp />{children}</body></html>; }

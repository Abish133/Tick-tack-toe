import './globals.css';
import ArenaApp from '@/components/ArenaApp';
export const metadata = { title: 'Elemental Arena · Think. Strike. Conquer.', description: 'A tactical 3×3 arena. Three equipped powers. One winning move.', icons:{icon:'/favicon.svg'} };
export const viewport = { width:'device-width', initialScale:1, themeColor:'#080d16' };
export default function RootLayout({children}) { return <html lang="en"><body><ArenaApp />{children}</body></html>; }

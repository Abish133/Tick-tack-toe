import {notFound} from 'next/navigation';
import {isArenaRoute} from '@/lib/routes';
// The arena shell lives in the persistent root layout so route changes keep the live socket and selected match.
export default async function Page({params}) { const {route=[]}=await params; if(!isArenaRoute('/'+route.join('/')))notFound(); return null; }

export const ARENA_ROUTES = ['/', '/login', '/register', '/battle', '/powers', '/leaderboard', '/shop', '/inventory', '/friends', '/history', '/missions', '/profile', '/settings', '/admin', '/tournaments', '/forgot-password', '/reset-password', '/verify-email', '/daily-puzzle', '/local-play', '/tutorial', '/achievements', '/notifications', '/season-pass', '/rules', '/privacy', '/terms'];
export function isArenaRoute(path) {
 return ARENA_ROUTES.includes(path) || /^\/(players|replay|tournaments|watch)\/[A-Za-z0-9_-]{1,80}$/.test(path) || /^\/invite\/[A-Za-z0-9]{6}$/.test(path);
}

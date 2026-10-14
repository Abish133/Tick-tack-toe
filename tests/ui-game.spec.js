import {test,expect} from '@playwright/test';
import {createGame,applyAction} from '../src/lib/game-engine/index.js';
import {scoresForBoard} from '../src/lib/game-engine/geometry.js';

test('title, new game, larger local scoring, saving, Continue and keyboard Journey work on mobile',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');const title=page.getByRole('region',{name:'Elemental Arena title screen',exact:true});await expect(title).toBeVisible();await expect(title.getByRole('button',{name:'Continue',exact:false})).toBeDisabled();
 const size=await title.boundingBox();expect(size.width).toBeGreaterThan(1300);
 await title.getByRole('button',{name:'Your first battle',exact:true}).click();await expect(title).toContainText('Equip three powers');await expect(title).toContainText('Equal powers');
 await title.getByRole('button',{name:'New game',exact:true}).click();const choose=page.getByRole('dialog',{name:'Choose your battle',exact:true});await expect(choose).toBeVisible();await choose.getByRole('button',{name:'Local & offline play',exact:false}).click();
 const local=page.getByRole('region',{name:'Local classic arena',exact:true});await local.getByRole('button',{name:'4 by 4 board',exact:true}).click();let board=local.getByRole('group',{name:'Local 4 by 4 classic board',exact:true});
 await board.getByRole('button').nth(0).click();await board.getByRole('button').nth(4).click();await page.reload();board=page.getByRole('group',{name:'Local 4 by 4 classic board',exact:true});await expect(board.getByRole('button').nth(0)).toHaveAttribute('aria-label',/: X$/);await expect(board.getByRole('button').nth(4)).toHaveAttribute('aria-label',/: O$/);
 await page.evaluate(()=>sessionStorage.removeItem('ea:entered'));await page.goto('/');await expect(page.getByRole('button',{name:/^Continue/})).toBeEnabled();await page.getByRole('button',{name:/^Continue/}).click();await expect(page).toHaveURL(/\/local-play$/);
 await page.setViewportSize({width:390,height:844});board=page.getByRole('group',{name:'Local 4 by 4 classic board',exact:true});for(const cell of [1,5,2,6,3,7,8,11,9,12,10,13,15,14])await board.getByRole('button').nth(cell).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('elemental-arena-local-classic-v1')));expect(saved.game.status).toBe('finished');expect(saved.game.board.every(Boolean)).toBe(true);expect(saved.game.roundScores).toEqual(scoresForBoard(saved.game.board,['local-x','local-o'],4));await expect(board.getByRole('button')).toHaveCount(16);expect(await board.getByRole('button').evaluateAll(cells=>cells.every(cell=>cell.disabled))).toBe(true);
 await page.reload();await expect(page.getByLabel('Three-in-a-row score',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole('button',{name:'Journey',exact:true}).click();const journey=page.getByRole('dialog',{name:'Your arena journey',exact:true});await expect(journey).toBeVisible();await page.keyboard.press('Escape');await expect(journey).toBeHidden();await expect(page.getByRole('button',{name:'Journey',exact:true})).toBeFocused();expect(errors).toEqual([]);
});

test('a pre-update 3 by 3 local save resumes without being replaced',async({page})=>{
 let game=createGame({mode:'classic',rounds:1,now:0,players:[{id:'local-x',name:'Player X'},{id:'local-o',name:'Player O'}]});game=applyAction(game,'local-x',{type:'place',cell:8,revision:0},1000);for(const key of ['boardSize','scoringMode','roundScores','matchBankMs'])delete game[key];
 const old={game,config:{opponent:'human',difficulty:'Hard',humanMark:'X'},score:{X:2,O:1,draws:3}};
 await page.addInitScript(saved=>{if(!localStorage.getItem('elemental-arena-local-classic-v1'))localStorage.setItem('elemental-arena-local-classic-v1',JSON.stringify(saved));},old);
 await page.goto('/');await page.getByRole('button',{name:/^Continue/}).click();const board=page.getByRole('group',{name:'Local three by three classic board',exact:true});await expect(board.getByRole('button')).toHaveCount(9);await expect(board.getByRole('button').nth(8)).toHaveAttribute('aria-label',/: X$/);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('elemental-arena-local-classic-v1')));expect(saved.game.boardSize).toBe(3);expect(saved.game.board[8]).toBe('local-x');expect(saved.score).toEqual(old.score);
});

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

async function read(page, route) {
  return page.evaluate(async (route) => {
    const response = await fetch(route, { cache:"no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || String(response.status));
    return result;
  }, route);
}

async function guest(page, suffix) {
  await page.goto("/");
  await page.getByRole("button", {name:"Enter the arena",exact:true}).click();
  await page.getByRole("button", {name:"Player account",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await dialog.getByLabel("Player name",{exact:true}).fill(`E2E Net ${suffix} ${Date.now().toString(36)}`.slice(0,20));
  await dialog.getByRole("button",{name:"Enter as a guest",exact:true}).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".connection")).toHaveText("Arena connected");
  const user=(await read(page,"/api/auth/session")).user;
  const file=path.resolve(".runtime/e2e-test-users.json");
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const ids=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):[];
  if(!ids.includes(user.id))fs.writeFileSync(file,JSON.stringify([...ids,user.id]));
  return user;
}

async function roomDialog(page) {
  await page.getByRole("button",{name:"Select battle mode",exact:true}).click();
  await page.getByRole("dialog",{name:"Choose your battle",exact:true}).getByRole("button",{name:"Challenge a Friend",exact:true}).click();
  return page.getByRole("dialog",{name:"A friendly rivalry",exact:true});
}

const board=(page)=>page.getByRole("group",{name:"4 by 4 classic game board",exact:true});

test("network loss, closing a player tab and server-forced reconnect restore the authoritative battle and an offline result",async({browser})=>{
  test.setTimeout(180000);
  // Keep the public HTTP and authentication request budgets unchanged in CI.
  await new Promise(resolve=>setTimeout(resolve,60000));
  const options={baseURL:process.env.E2E_BASE_URL||"http://localhost:3000",viewport:{width:390,height:844},reducedMotion:"reduce"};
  const contexts=await Promise.all([browser.newContext(options),browser.newContext(options)]);
  const pages=await Promise.all(contexts.map(context=>context.newPage()));
  const errors=[];
  const observe=(page)=>page.on("pageerror",error=>errors.push(error.message));
  pages.forEach(observe);
  let matchId;
  try {
    const users=[await guest(pages[0],"A"),await guest(pages[1],"B")];
    const create=await roomDialog(pages[0]);
    await create.getByRole("button",{name:"4 by 4 board",exact:true}).click();
    await create.getByRole("button",{name:"Classic",exact:true}).click();
    await create.getByRole("button",{name:"Create a room",exact:true}).click();
    const code=await pages[0].locator(".room-code").innerText();
    const join=await roomDialog(pages[1]);
    await join.getByRole("textbox",{name:"Room code",exact:true}).fill(code);
    await join.getByRole("button",{name:"Join room",exact:true}).click();
    for(const page of pages)await expect(board(page)).toBeVisible();
    const initial=(await read(pages[0],"/api/matches/active")).match;
    matchId=initial.matchId;
    const actorIndex=users.findIndex(user=>user.id===initial.state.currentPlayerId), peerIndex=1-actorIndex;
    const actor=pages[actorIndex], actorContext=contexts[actorIndex];
    await expect(board(actor).getByRole("button").first()).toBeEnabled();

    // A real tab close removes presence. Returning to /battle restores the
    // participant from the server instead of treating the exit as surrender.
    await pages[peerIndex].close();
    await expect(actor.getByText("Opponent disconnected · clock continues",{exact:true})).toBeVisible();
    pages[peerIndex]=await contexts[peerIndex].newPage();
    const peer=pages[peerIndex];
    observe(peer);
    await peer.goto("/battle");
    await expect(board(peer)).toBeVisible();
    await expect(actor.getByText("Opponent disconnected · clock continues",{exact:true})).toBeHidden();
    await expect(actor.locator(".connection")).toHaveText("Arena connected");

    await actorContext.setOffline(true);
    await expect(actor.locator('[data-arena-connection="offline"]')).toBeVisible();
    await expect(board(actor).locator("button:enabled")).toHaveCount(0);
    expect((await read(peer,`/api/matches/${matchId}`)).state.revision).toBe(initial.state.revision);
    await actorContext.setOffline(false);
    await expect(actor.locator(".connection")).toHaveText("Arena connected");
    await expect(actor.locator("[data-arena-connection]")).toHaveCount(0);
    await expect(board(actor).getByRole("button").first()).toBeEnabled();
    await board(actor).getByRole("button").first().click();
    await expect.poll(async()=>(await read(peer,`/api/matches/${matchId}`)).state.revision).toBe(initial.state.revision+1);

    // Pass through real Socket.IO traffic, injecting its deliberate namespace
    // disconnect packet. This is the packet that does not auto-reconnect by
    // default during a server restart; a new live socket must be established.
    let proxy, socketCount=0, blockServerMessages=false;
    await actor.routeWebSocket(/\/socket\.io\//,ws=>{
      socketCount++;
      proxy=ws;
      const server=ws.connectToServer();
      server.onMessage(message=>{if(!blockServerMessages)ws.send(message);});
    });
    await actor.reload();
    await expect(actor.locator(".connection")).toHaveText("Arena connected");
    await expect.poll(()=>socketCount).toBeGreaterThanOrEqual(1);
    proxy.send('42["server:restarting",{"retryAfterMs":1000}]');
    proxy.send("41");
    await expect.poll(()=>socketCount).toBeGreaterThanOrEqual(2);
    await expect(actor.locator(".connection")).toHaveText("Arena connected");
    await expect(board(actor).getByRole("button").first()).toHaveAttribute("aria-label",/X$/);
    expect((await read(actor,`/api/matches/${matchId}`)).state.revision).toBe(initial.state.revision+1);

    // The player misses the finished-state packet. A full reload must still
    // recover the settled result, although /matches/active is now empty.
    blockServerMessages=true;
    await actorContext.setOffline(true);
    await expect(actor.locator('[data-arena-connection="offline"]')).toBeVisible();
    await peer.getByRole("button",{name:"Back to arena",exact:true}).click();
    await peer.getByRole("dialog",{name:"Leave this battle?",exact:true}).getByRole("button",{name:"Surrender",exact:true}).click();
    await expect(peer.locator(".result-panel")).toBeVisible();
    await expect(actor.locator(".result-panel")).toHaveCount(0);
    blockServerMessages=false;
    await actorContext.setOffline(false);
    await actor.reload();
    await expect(actor.locator(".result-panel")).toBeVisible();
    await expect(actor.getByRole("button",{name:"Play again",exact:true})).toBeEnabled();
    const final=await read(actor,`/api/matches/${matchId}`);
    expect(final.state.status).toBe("finished");
    expect(final.settlement.settled).toBe(true);
    expect(final.state.board[0]).toBe(initial.state.currentPlayerId);
    await actorContext.setOffline(true);
    await expect(actor.locator('[data-arena-connection="offline"]')).toBeVisible();
    await expect(actor.getByRole("button",{name:"Play again",exact:true})).toBeDisabled();
    await actorContext.setOffline(false);
    await expect(actor.getByRole("button",{name:"Play again",exact:true})).toBeEnabled();
    await expect(actor.locator("[data-arena-connection]")).toHaveCount(0);
    expect(await actor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    for(const context of contexts)await context.setOffline(false).catch(()=>{});
    const page=pages.find(page=>!page.isClosed());
    if(page&&matchId)await page.evaluate(async id=>{await fetch(`/api/matches/${id}/surrender`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({requestId:crypto.randomUUID()})});},matchId).catch(()=>{});
    for(const context of contexts)await context.close();
  }
});

import {AsyncLocalStorage} from 'node:async_hooks';

// Track a complete outer service operation, including all nested methods and
// transactions. Shutdown keeps ownership until these operations have settled.
export function manageArenaLifecycle(service,lock) {
  const context=new AsyncLocalStorage();
  const pending=new Set();
  let accepting=true;
  for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(service))) {
    const original=service[name];
    if (typeof original!=='function' || original.constructor.name!=='AsyncFunction') continue;
    service[name]=function(...args) {
      lock.assertOwned();
      if (context.getStore()?.active) return original.apply(this,args);
      if (!accepting) return Promise.reject(Object.assign(new Error('The coordinator is draining. Please reconnect.'),{code:'SERVER_DRAINING',status:503}));
      // Timer callbacks inherit AsyncLocalStorage. An expired parent context
      // must not let a later pulse bypass both admission and drain tracking.
      const operation={active:true};
      const work=context.run(operation,()=>Promise.resolve().then(()=>original.apply(this,args)));
      pending.add(work);
      const finish=()=>{operation.active=false;pending.delete(work);};
      work.then(finish,finish);
      return work;
    };
  }
  const scheduleAI=service.scheduleAI;
  service.scheduleAI=function(...args) {
    if (!accepting || !lock.owned) return;
    // An AI timer is a separate operation, not a nested continuation of the
    // HTTP request or pulse that scheduled it.
    return context.exit(()=>scheduleAI.apply(this,args));
  };
  return {
    get accepting(){return accepting;},
    get pending(){return pending.size;},
    stop(){accepting=false;service.close();},
    async drain(){accepting=false;service.close();while(pending.size)await Promise.allSettled([...pending]);},
  };
}

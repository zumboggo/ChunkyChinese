self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()))
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()))
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url)
 if(event.request.mode==='navigate'&&(url.pathname==='/tests/fixtures/'||url.pathname==='/tests/fixtures/index.html'))event.respondWith(new Response('<h1>Old cached app</h1>',{headers:{'Content-Type':'text/html'}}))
})

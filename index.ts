const server = Bun.serve({
  port: 3000,
  fetch() {
    return new Response("Hallo Welt", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
});

console.log(`Läuft auf http://localhost:${server.port}`);

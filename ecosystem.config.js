module.exports = {
  apps: [{
    name: "quantum",
    script: "server/server.mjs",
    env: {
      PM2: "true"
    }
  }]
}
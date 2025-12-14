module.exports = {
  bot: {
    appId: "102818285",
    clientSecret: "79BDFILORUXaeimquy27CHMRWbgmsy4A"
  },
  
  proxy: {
    hostname: "118.25.65.235",
    port: 80
  },
  
  websocket: {
    intents: (1 << 25) | (1 << 26) | (1 << 27),
    shard: [0, 1],
    properties: {
      $os: process.platform,
      $browser: "my_qq_bot",
      $device: "my_qq_bot"
    }
  }
};
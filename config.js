module.exports = {
  bot: {
    appId: "",
    clientSecret: ""
  },
  
  proxy: {
    hostname: "",
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
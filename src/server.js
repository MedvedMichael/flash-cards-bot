const bot = require('./bot')
const express = require('express')
const packageInfo = require('../package.json')
const port = process.env.PORT || 3000

const app = express()

app.get('/', (req, res) => {
  res.json({
    version: packageInfo.version
  })
})

app.post('/' + bot.token, (req, res) => {
  bot.processUpdate(req.body)
  res.sendStatus(200)
})

app.listen(port, () => {
  console.log(`Web server started at port ${port}`);
})
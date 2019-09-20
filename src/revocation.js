'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Script = bcoin.Script
const Coin = bcoin.Coin
const Stack = bcoin.Stack

function verifyArgs(rings, delays, commTX, fee) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Object.values(delays).map(Utils.delayVerify)
  Utils.ensureCommitmentTX(commTX)
  Utils.amountVerify(fee)
}

function getCoins(scripts, tx) {
  return scripts.map((script, i) => Utils.getCoinFromTX(script, tx, i))
}

function getOutput(ring) {
  return Utils.getP2WPKHOutput(ring)
}

function getRevocationTX({
  rings: {
    aliceRevRing, bobRevRing, wRevRing1, wRevRing2,
    aliceDelRing, bobDelRing, bobOwnRing
  },
  delays: {
    aliceDelay, bobDelay
  }, commTX, fee
}) {
  verifyArgs(arguments[0].rings, arguments[0].delays, commTX, fee)

  const [key1, key2] = Utils.sortKeys(aliceRevRing.publicKey, wRevRing1.publicKey)
  aliceRevRing.script = wRevRing1.script = Scripts.commScript(
    key1, key2, bobDelay, aliceDelRing.publicKey
  )
  const outputScript1 = Utils.outputScrFromRedeemScr(aliceRevRing.script)

  const [key3, key4] = Utils.sortKeys(bobRevRing.publicKey, wRevRing2.publicKey)
  bobRevRing.script = wRevRing2.script = Scripts.commScript(
    key3, key4, aliceDelay, bobDelRing.publicKey
  )
  const outputScript2 = Utils.outputScrFromRedeemScr(bobRevRing.script)

  const rtx = new MTX({version: 2})

  const output = getOutput(bobOwnRing)
  const value = commTX.outputs[0].value + commTX.outputs[1].value - fee
  rtx.addOutput(output, value)

  const coins = getCoins([outputScript1.toJSON(), outputScript2.toJSON()], commTX)
  coins.map((coin) => rtx.addCoin(coin))

  Utils.sign(rtx, Utils.sortRings(aliceRevRing, wRevRing1), 0, Scripts.cheatWitScr)
  Utils.sign(rtx, Utils.sortRings(bobRevRing, wRevRing2), 1, Scripts.cheatWitScr)

  return rtx
}

module.exports = getRevocationTX

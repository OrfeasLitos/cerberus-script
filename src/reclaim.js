'use strict'

const bcoin = require('bcoin')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Script = bcoin.Script
const Coin = bcoin.Coin
const Stack = bcoin.Stack

function verifyArgs(rings, delays, colTX, fee) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Object.values(delays).map(Utils.delayVerify)
  Utils.ensureCollateralTX(colTX)
  Utils.amountVerify(fee)
}

function getOutput(bobKey, watchKey, shortDelay, longDelay) {
  const [key1, key2] = Utils.sortKeys(bobKey, watchKey)
  const redeemScript = Scripts.reclaimScript(key1, key2, watchKey, shortDelay, longDelay)
  return Utils.outputScrFromRedeemScr(redeemScript)
}

function getReclaimTX({
  rings: {
    bobColRing, wColRing,
    bobPenaltyRing, wPenaltyRing
  },
  delays: {shortDelay, longDelay},
  colTX, fee
}) {
  verifyArgs(arguments[0].rings, arguments[0].delays, colTX, fee)

  bobColRing.script = wColRing.script = Script.fromMultisig(2, 2, [
    bobColRing.publicKey, wColRing.publicKey
  ])
  const outputScript = Utils.outputScrFromRedeemScr(bobColRing.script)

  const reclaimTX = new MTX({version: 2})

  const output = getOutput(
    bobPenaltyRing.publicKey, wPenaltyRing.publicKey, shortDelay, longDelay
  )
  const value = colTX.outputs[0].value - fee
  reclaimTX.addOutput(output, value)

  const coin = Utils.getCoinFromTX(outputScript.toJSON(), colTX, 0)
  reclaimTX.addCoin(coin)

  reclaimTX.sign([bobColRing, wColRing])

  return reclaimTX
}

module.exports = getReclaimTX

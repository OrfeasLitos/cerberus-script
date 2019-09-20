'use strict'

const bcoin = require('bcoin')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Script = bcoin.Script
const Coin = bcoin.Coin
const Stack = bcoin.Stack

function verifyArgs(rings, delays, commTX, reclaimTX, fee) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Object.values(delays).map(Utils.delayVerify)
  Utils.ensureReclaimTX(reclaimTX)
  Utils.ensureCommitmentTX(commTX)
  Utils.amountVerify(fee)
}

function getOutput(ring) {
  return Utils.getP2WPKHOutput(ring)
}

function getPenaltyTX({
  rings: {
    bobOwnRing, bobDelRing,
    bobRevRing, wRevRing,
    bobPenaltyRing, wPenaltyRing
  },
  delays: {shortDelay, longDelay, bobDelay},
  commTX, reclaimTX, fee
}) {
  verifyArgs(arguments[0].rings, arguments[0].delays, commTX, reclaimTX, fee)

  const [key1, key2] = Utils.sortKeys(bobRevRing.publicKey, wRevRing.publicKey)
  bobDelRing.script = Scripts.commScript(
    key1, key2, bobDelay, bobDelRing.publicKey
  )
  const commOutputScript = Utils.outputScrFromRedeemScr(bobDelRing.script)

  const [key3, key4] = Utils.sortKeys(bobPenaltyRing.publicKey, wPenaltyRing.publicKey)
  bobPenaltyRing.script = wPenaltyRing.script = Scripts.reclaimScript(
    key3, key4, wPenaltyRing.publicKey, shortDelay, longDelay
  )
  const reclaimOutputScript = Utils.outputScrFromRedeemScr(bobPenaltyRing.script)

  const ptx = new MTX({version: 2})

  const output = getOutput(bobOwnRing)
  const value = commTX.outputs[1].value + reclaimTX.outputs[0].value - fee
  ptx.addOutput(output, value)

  const commCoin = Utils.getCoinFromTX(commOutputScript.toJSON(), commTX, 1)
  ptx.addCoin(commCoin)
  // trick OP_CHECKSEQUENCEVERIFY
  // into thinking ptx is deep enough on-chain
  ptx.inputs[0].sequence = bobDelay

  const reclaimCoin = Utils.getCoinFromTX(reclaimOutputScript.toJSON(), reclaimTX, 0)
  ptx.addCoin(reclaimCoin)
  // trick OP_CHECKSEQUENCEVERIFY again
  ptx.inputs[1].sequence = shortDelay

  // builtin TX.sign() only signs conventional inputs
  // so we have to sign the 2 custom inputs by hand
  Utils.sign(ptx, [bobDelRing], 0, Scripts.honestWitScr)
  Utils.sign(ptx, Utils.sortRings(bobPenaltyRing, wPenaltyRing), 1, Scripts.cheatWitScr)

  return ptx
}

module.exports = getPenaltyTX

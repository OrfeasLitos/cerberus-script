'use strict'

const bcoin = require('bcoin')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Script = bcoin.Script
const Coin = bcoin.Coin
const Stack = bcoin.Stack

function verify2Args(rings, delays, commTX, reclaimTX, fee) {
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

function getPenalty1TX({}) {
}

function getPenalty2TX({
  rings: {
    bobOwnRing, bobDelRing,
    bobRevRing, wRevRing,
    bobPenaltyRing, wPenaltyRing
  },
  delays, commTX, reclaimTX, fee
}) {
  verify2Args(arguments[0].rings, arguments[0].delays, commTX, reclaimTX, fee)

  const getReclaimScript = (bobPenaltyKey, wPenaltyKey, delay) => {
    const keys = Utils.sortKeys(bobPenaltyKey, wPenaltyKey)
    return Scripts.commReclaimScript(...keys, delay, wPenaltyKey)
  }

  const sign = (tx, bobPenaltyRing, wPenaltyRing) => {
    Utils.sign(tx, Utils.sortRings(bobPenaltyRing, wPenaltyRing), 1, Scripts.cheatWitScr)
  }

  return getPenaltyTX({
    rings: {
      bobOwnRing, bobDelRing, bobRevRing, wRevRing,
      bobColPenaltyRing: bobPenaltyRing,
      wColPenaltyRing: wPenaltyRing,
    },
    delays, commTX, colReclaimTX: reclaimTX,
    fee, getColReclaimScript: getReclaimScript, sign
  })
}

function getPenaltyTX({
  rings: {
    bobOwnRing, bobDelRing,
    bobRevRing, wRevRing,
    bobColPenaltyRing, wColPenaltyRing
  },
  delays: {longDelay, bobDelay},
  commTX, colReclaimTX, fee, getColReclaimScript, sign
}) {
  const [key1, key2] = Utils.sortKeys(bobRevRing.publicKey, wRevRing.publicKey)
  bobDelRing.script = Scripts.commReclaimScript(
    key1, key2, bobDelay, bobDelRing.publicKey
  )
  const commOutputScript = Utils.outputScrFromRedeemScr(bobDelRing.script)

  bobColPenaltyRing.script = wColPenaltyRing.script = getColReclaimScript(
    bobColPenaltyRing.publicKey, wColPenaltyRing.publicKey, longDelay
  )
  const colReclaimOutputScript = Utils.outputScrFromRedeemScr(bobColPenaltyRing.script)

  const ptx = new MTX({version: 2})

  const output = getOutput(bobOwnRing)
  const value = commTX.outputs[1].value + colReclaimTX.outputs[0].value - fee
  ptx.addOutput(output, value)

  const commCoin = Utils.getCoinFromTX(commOutputScript.toJSON(), commTX, 1)
  ptx.addCoin(commCoin)
  // trick OP_CHECKSEQUENCEVERIFY
  // into thinking ptx is deep enough on-chain
  ptx.inputs[0].sequence = bobDelay

  const colReclaimCoin = Utils.getCoinFromTX(colReclaimOutputScript.toJSON(), colReclaimTX, 0)
  ptx.addCoin(colReclaimCoin)

  // builtin TX.sign() only signs conventional inputs
  // so we have to sign the 2 custom inputs by hand
  Utils.sign(ptx, [bobDelRing], 0, Scripts.honestWitScr)
  sign(ptx, bobColPenaltyRing, wColPenaltyRing)

  return ptx
}

module.exports = {getPenalty1TX: getPenaltyTX, getPenalty2TX}

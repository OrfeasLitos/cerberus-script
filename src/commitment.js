'use strict'

const bcoin = require('bcoin')
const assert = require('bcoin/node_modules/bsert')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Coin = bcoin.Coin
const Script = bcoin.Script

function verifyArgs(rings, delays, amounts, wRevRing1, wRevRing2) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Object.values(delays).map(Utils.delayVerify)
  Object.values(amounts).map(Utils.amountVerify)
  assert(
    Buffer.isBuffer(wRevRing1.publicKey)
    && wRevRing1.publicKey.equals(wRevRing2.publicKey),
    'watchtower revocation keys must be equal'
  )
}

function getOutput(commKey, watchKey, delay, delKey, amount) {
  const [key1, key2] = Utils.sortKeys(commKey, watchKey)
  const redeemScript = Scripts.commReclaimScript(key1, key2, delay, delKey)
  return Utils.outputScrFromRedeemScr(redeemScript)
}

function getCommitmentTX({
  rings: {
    aliceFundRing, bobFundRing, aliceRevRing,
    wRevRing1, aliceDelRing, bobRevRing,
    wRevRing2, bobDelRing
  },
  delays: {bobDelay, aliceDelay},
  amount: {aliceAmount, bobAmount, fee},
  ftx
}) {
  const arg = arguments[0]
  verifyArgs(arg.rings, arg.delays, arg.amount, wRevRing1, wRevRing2)

  const totalAmount = aliceAmount + bobAmount + fee

  aliceFundRing.script = bobFundRing.script = Script.fromMultisig(2, 2, [
    aliceFundRing.publicKey, bobFundRing.publicKey
  ])
  const outputScript = Utils.outputScrFromRedeemScr(aliceFundRing.script)

  let ctx = new MTX({version: 2})

  const aliceOutput = getOutput(
    aliceRevRing.publicKey, wRevRing1.publicKey,
    bobDelay, aliceDelRing.publicKey
  )
  ctx.addOutput(aliceOutput, aliceAmount)

  const bobOutput = getOutput(
    bobRevRing.publicKey, wRevRing2.publicKey,
    aliceDelay, bobDelRing.publicKey
  )
  ctx.addOutput(bobOutput, bobAmount)

  const coin = Utils.getCoinFromTX(outputScript.toJSON(), ftx, 0)
  ctx.addCoin(coin)

  ctx.sign([aliceFundRing, bobFundRing])

  return ctx
}

module.exports = getCommitmentTX

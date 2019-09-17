'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Coin = bcoin.Coin
const Script = bcoin.Script

function verifyInput(rings, delays, amounts, wRevRing1, wRevRing2) {
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

function getCoin(value, script, tx){
  return Coin.fromJSON({
    version: 1,
    height: -1,
    value,
    coinbase: false,
    script,
    hash: tx.hash('hex'),
    index: 0
  })
}

function getOutput(commKey, watchKey, delay, delKey, amount) {
  const [key1, key2] = Utils.sortKeys(commKey, watchKey)
  const witnessScript = Scripts.commScript(key1, key2, delay, delKey)
  return Utils.outputScrFromWitScr(witnessScript)
}

function getCommitmentTX({
  rings: {
    aliceFundRing, bobFundRing, aliceCommRing,
    wRevRing1, aliceDelRing, bobCommRing,
    wRevRing2, bobDelRing
  },
  delays: {bobDelay, aliceDelay},
  amount: {aliceAmount, bobAmount, fee},
  ftx
}) {
  const arg = arguments[0]
  verifyInput(arg.rings, arg.delays, arg.amount, wRevRing1, wRevRing2)

  const totalAmount = aliceAmount + bobAmount + fee

  aliceFundRing.script = bobFundRing.script = Script.fromMultisig(2, 2, [
    aliceFundRing.publicKey, bobFundRing.publicKey
  ])
  const outputScript = Utils.outputScrFromWitScr(aliceFundRing.script)

  let ctx = new MTX()

  const aliceOutput = getOutput(
    aliceCommRing.publicKey, wRevRing1.publicKey,
    bobDelay, aliceDelRing.publicKey
  )
  ctx.addOutput(aliceOutput, aliceAmount)

  const bobOutput = getOutput(
    bobCommRing.publicKey, wRevRing2.publicKey,
    aliceDelay, bobDelRing.publicKey
  )
  ctx.addOutput(bobOutput, bobAmount)

  const coin = getCoin(totalAmount, outputScript.toJSON(), ftx)
  ctx.addCoin(coin)

  ctx.sign([aliceFundRing, bobFundRing])

  return ctx
}

module.exports = getCommitmentTX

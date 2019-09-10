'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Coin = bcoin.Coin
const Input = bcoin.Input
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
  ) // TODO: discuss if equality desired
}

function getFundingCoin(prevout, ring, pubKey1, pubKey2, amount) {
  ring.script = Script.fromMultisig(2, 2,
    Utils.sortKeys(pubKey1, pubKey2)
  )
  const address = ring.getAddress()
  const script = Script.fromAddress(address)
  const txinfo = {
    hash: prevout.hash,
    index: prevout.index,
    value: amount,
    script: script
  }
  return Coin.fromOptions(txinfo)
}

function getCommitmentOutput(colKey, watchKey, delay, delKey, amount) {
  const [key1, key2] = Utils.sortKeys(colKey, watchKey)
  const witnessScript = Scripts.commScript(key1, key2, delay, delKey)
  return Utils.outputScrFromWitScr(witnessScript)
}

async function addCommitmentInput(ctx, prevout, ring, pubKey1, pubKey2, amount) {
  const fundingCoin = getFundingCoin(prevout, ring, pubKey1, pubKey2, amount)
  const changeAddress = ring.getAddress()

  await ctx.fund([fundingCoin], {changeAddress})
  ctx.scriptInput(0, fundingCoin, ring)
}

async function getCommitmentTX({
  rings: {
    aliceFundRing, bobFundRing, aliceColRing,
    wRevRing1, aliceDelRing, bobColRing,
    wRevRing2, bobDelRing
  },
  delays: {bobDelay, aliceDelay},
  amount: {aliceAmount, bobAmount, fee},
  prevout
}) {
  const arg = arguments[0]
  verifyInput(arg.rings, arg.delays, arg.amount, wRevRing1, wRevRing2)

  const ctx = new MTX()

  const aliceOutput = getCommitmentOutput(
    aliceColRing.publicKey, wRevRing1.publicKey,
    bobDelay, aliceDelRing.publicKey
  )
  ctx.addOutput(aliceOutput, aliceAmount)

  const bobOutput = getCommitmentOutput(
    bobColRing.publicKey, wRevRing2.publicKey,
    aliceDelay, bobDelRing.publicKey
  )
  ctx.addOutput(bobOutput, bobAmount)

  await addCommitmentInput(
    ctx, prevout, aliceFundRing, aliceFundRing.publicKey,
    bobFundRing.publicKey, aliceAmount + bobAmount + fee
  )

  return ctx
}

module.exports = getCommitmentTX

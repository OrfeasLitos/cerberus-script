'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Coin = bcoin.Coin
const Input = bcoin.Input
const Script = bcoin.Script
const Witness = bcoin.Witness

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

function getInput(prevout, pubKey1, pubKey2, amount) {
  const witnessScript = Script.fromMultisig(2, 2, [pubKey1, pubKey2])
  return new Input({
    prevout,
    script: new Script(),
    witness: Witness.fromStack({items: [witnessScript.toRaw()]})
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
  prevout
}) {
  const arg = arguments[0]
  verifyInput(arg.rings, arg.delays, arg.amount, wRevRing1, wRevRing2)

  const ctx = new MTX()
  const totalAmount = aliceAmount + bobAmount + fee

  const input = getInput(
    prevout, aliceFundRing.publicKey,
    bobFundRing.publicKey, totalAmount
  )
  ctx.addInput(input)

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

  return ctx
}

module.exports = getCommitmentTX

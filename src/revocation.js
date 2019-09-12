'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Input = bcoin.Input
const Outpoint = bcoin.Outpoint
const Witness = bcoin.Witness
const Script = bcoin.Script

function verifyInput(rings, delays, commTX, fee) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Object.values(delays).map(Utils.delayVerify)
  Utils.ensureCommitmentTX(commTX)
  Utils.amountVerify(fee)
}

function getInputs({
  aliceCommKey, bobCommKey, wRevKey1, wRevKey2,
  aliceDelKey, bobDelKey, aliceDelay, bobDelay,
  commTX
}) {
  const [aliceInputKey1, aliceInputKey2] = Utils.sortKeys(aliceCommKey, wRevKey1)
  const aliceWitnessScript = Scripts.commScript(
    aliceInputKey1, aliceInputKey2,
    bobDelay, aliceDelKey
  )
  const aliceWitness = Witness.fromStack({items: [aliceWitnessScript.toRaw()]})

  const [bobInputKey1, bobInputKey2] = Utils.sortKeys(bobCommKey, wRevKey1)
  const bobWitnessScript = Scripts.commScript(
    bobInputKey1, bobInputKey2,
    bobDelay, bobDelKey
  )
  const bobWitness = Witness.fromStack({items: [bobWitnessScript.toRaw()]})

  return [
    new Input({
      prevout: Outpoint.fromTX(commTX, 0),
      script: new Script(),
      witness: aliceWitness
    }),
    new Input({
      prevout: Outpoint.fromTX(commTX, 1),
      script: new Script(),
      witness: bobWitness
    })
  ]
}

function getOutput(ring) {
  return Utils.getP2WPKHOutput(ring)
}

function getRevocationTX({
  rings: {
    aliceCommRing, bobCommRing, wRevRing1, wRevRing2,
    aliceDelRing, bobDelRing, bobRevRing
  },
  delays: {
    aliceDelay, bobDelay
  }, commTX, fee
}) {
  verifyInput(arguments[0].rings, arguments[0].delays, commTX, fee)

  const rtx = new MTX()

  const [aliceInput, bobInput] = getInputs({
    aliceCommKey: aliceCommRing.publicKey, bobCommKey: bobCommRing.publicKey,
    wRevKey1: wRevRing1.publicKey, wRevKey2: wRevRing2.publicKey,
    aliceDelKey: aliceDelRing.publicKey, bobDelKey: bobDelRing.publicKey,
    aliceDelay, bobDelay, commTX
  })
  rtx.addInput(aliceInput)
  rtx.addInput(bobInput)

  const output = getOutput(bobRevRing)
  const value = commTX.outputs[0].value + commTX.outputs[1].value - fee
  rtx.addOutput(output, value)

  return rtx
}

module.exports = getRevocationTX

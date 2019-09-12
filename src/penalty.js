'use strict'

const bcoin = require('bcoin')

const Scripts = require('./scripts')
const Utils = require('./utils')

const Outpoint = bcoin.Outpoint
const MTX = bcoin.MTX
const Script = bcoin.Script
const Witness = bcoin.Witness
const Input = bcoin.Input

function verifyInput(rings, delay, commTX, colTX, fee) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Utils.delayVerify(delay)
  Utils.ensureCommitmentTX(commTX)
  Utils.ensureCollateralTX(colTX)
  Utils.amountVerify(fee)
}

function getInputFromCommitment(commTX, bobRevKey, wRevKey, delay, delKey) {
  const prevout = Outpoint.fromTX(commTX, 1)

  const [key1, key2] = Utils.sortKeys(bobRevKey, wRevKey)
  const witnessScript = Scripts.commScript(key1, key2, delay, delKey)
  const witness = Witness.fromStack({items: [witnessScript.toRaw()]})

  return new Input({
    prevout,
    script: new Script(),
    witness
  })
}

function getInputFromCollateral(colTX, bobColKey, wColKey) {
  const prevout = Outpoint.fromTX(colTX, 0)

  const keys = Utils.sortKeys(bobColKey, wColKey)
  const witnessScript = Script.fromMultisig(2, 2, keys)
  const witness = Witness.fromStack({items: [witnessScript.toRaw()]})
  // const witness = Witness.fromStack({items: [Buffer.from([]), Buffer.from([]), Buffer.from([]), witnessScript.toRaw()]}) TODO: figure out if the above suffices, or we need the commented out

  return new Input({
    prevout,
    script: new Script(),
    witness
  })
}

function getOutput(ring) {
  return Utils.getP2WPKHOutput(ring)
}

function getPenaltyTX({
  rings: {
    bobPenaltyRing, bobDelRing,
    bobCommRing, wRevRing,
    bobColRing, wColRing
  },
  bobDelay, commTX, colTX, fee
}) {
  verifyInput(arguments[0].rings, bobDelay, commTX, colTX, fee)

  const ptx = new MTX()

  const inFromCom = getInputFromCommitment(
    commTX, bobCommRing.publicKey, wRevRing.publicKey, bobDelay, bobDelRing.publicKey
  )
  ptx.addInput(inFromCom)

  const inFromCol = getInputFromCollateral(
    colTX, bobColRing.publicKey, wColRing.publicKey
  )
  ptx.addInput(inFromCol)

  const output = getOutput(bobPenaltyRing)
  const value = commTX.outputs[1].value + colTX.outputs[0].value - fee
  ptx.addOutput(output, value)

  return ptx
}

module.exports = getPenaltyTX

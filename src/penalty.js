'use strict'

const bcoin = require('bcoin')

const Scripts = require('./scripts')
const Utils = require('./utils')

const Outpoint = bcoin.Outpoint
const MTX = bcoin.MTX
const Script = bcoin.Script
const Witness = bcoin.Witness
const Input = bcoin.Input

function getPenaltyCommitmentInput(commTX, bobRevKey, wRevKey, delay, delKey) {
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

function getPenaltyCollateralInput(colTX, bobColKey, wColKey) {
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

function getPenaltyOutput(ring) {
  const address = ring.getAddress()
  return Script.fromAddress(address)
}

function getPenaltyTX({
  rings: {
    bobPenaltyRing, bobDelRing,
    bobComRing, wRevRing,
    bobColRing, wColRing
  },
  bobDelay, commTX, colTX, fee
}) {
  const ptx = new MTX()

  const inFromCom = getPenaltyCommitmentInput(
    commTX, bobComRing.publicKey, wRevRing.publicKey, bobDelay, bobDelRing.publicKey
  )
  ptx.addInput(inFromCom)

  const inFromCol = getPenaltyCollateralInput(
    colTX, bobColRing.publicKey, wColRing.publicKey
  )
  ptx.addInput(inFromCol)

  const output = getPenaltyOutput(bobPenaltyRing)
  const value = commTX.outputs[1].value + colTX.outputs[0].value - fee
  ptx.addOutput(output, value)

  return ptx
}

module.exports = getPenaltyTX

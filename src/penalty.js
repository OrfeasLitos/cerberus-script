'use strict'

const bcoin = require('bcoin')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Script = bcoin.Script
const Coin = bcoin.Coin
const Stack = bcoin.Stack

function verifyArgs(rings, delay, commTX, colTX, fee) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Utils.delayVerify(delay)
  Utils.ensureCommitmentTX(commTX)
  Utils.ensureCollateralTX(colTX)
  Utils.amountVerify(fee)
}

function getOutput(ring) {
  return Utils.getP2WPKHOutput(ring)
}

function signCommInput(ptx, ring) {
  const inputIndex = 0
  const {prevout} = ptx.inputs[inputIndex]
  const value = ptx.view.getOutput(prevout).value

  const sighashVersion = 1
  const sig = ptx.signature(
    inputIndex, ring.script, value, ring.privateKey, null, sighashVersion
  )
  let stack = new Stack()
  stack.pushData(sig)
  stack.pushInt(0)
  stack.push(ring.script.toRaw())

  ptx.inputs[inputIndex].witness.fromStack(stack)
}

function getPenaltyTX({
  rings: {
    bobOwnRing, bobDelRing,
    bobRevRing, wRevRing,
    bobColRing, wColRing
  },
  bobDelay, commTX, colTX, fee
}) {
  verifyArgs(arguments[0].rings, bobDelay, commTX, colTX, fee)

  const [key1, key2] = Utils.sortKeys(bobRevRing.publicKey, wRevRing.publicKey)
  bobDelRing.script = Scripts.commScript(
    key1, key2, bobDelay, bobDelRing.publicKey
  )
  const commOutputScript = Utils.outputScrFromWitScr(bobDelRing.script)

  bobColRing.script = wColRing.script = Script.fromMultisig(2, 2, [
    bobColRing.publicKey, wColRing.publicKey
  ])
  const colOutputScript = Utils.outputScrFromWitScr(bobColRing.script)

  const ptx = new MTX({version: 2})

  const output = getOutput(bobOwnRing)
  const value = commTX.outputs[1].value + colTX.outputs[0].value - fee
  ptx.addOutput(output, value)

  const commCoin = Utils.getCoinFromTX(commOutputScript.toJSON(), commTX, 1)
  ptx.addCoin(commCoin)
  // trick OP_CHECKSEQUENCEVERIFY
  // into thinking ptx is deep enough on-chain
  ptx.inputs[0].sequence = bobDelay

  const colCoin = Utils.getCoinFromTX(colOutputScript.toJSON(), colTX, 0)
  ptx.addCoin(colCoin)

  // builtin TX.sign() only signs multisig input from colTX
  ptx.sign([bobColRing, wColRing])
  // so we have to sign the custom input from commTX by hand
  signCommInput(ptx, bobDelRing, commCoin)

  return ptx
}

module.exports = getPenaltyTX

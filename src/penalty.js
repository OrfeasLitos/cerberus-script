'use strict'

const bcoin = require('bcoin')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Script = bcoin.Script
const Coin = bcoin.Coin
const Stack = bcoin.Stack

function verifyInput(rings, delay, commTX, colTX, fee) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Utils.delayVerify(delay)
  Utils.ensureCommitmentTX(commTX)
  Utils.ensureCollateralTX(colTX)
  Utils.amountVerify(fee)
}

function getCommCoin(script, tx) {
  return Coin.fromJSON({
    version: 2,
    height: -1,
    value: tx.outputs[1].value,
    coinbase: false,
    script,
    hash: tx.hash('hex'),
    index: 1
  })
}

function getColCoin(script, tx) {
  return Coin.fromJSON({
    version: 2,
    height: -1,
    value: tx.outputs[0].value,
    coinbase: false,
    script,
    hash: tx.hash('hex'),
    index: 0
  })
}

function getOutput(ring) {
  return Utils.getP2WPKHOutput(ring)
}

function signCommInput(ptx, ring) {
  const inputIndex = 0
  const {prevout} = ptx.inputs[inputIndex]
  const coin = ptx.view.getOutput(prevout)

  const sighashVersion = 1
  const sig = ptx.signature(
    inputIndex, ring.script, coin.value, ring.privateKey, null, sighashVersion
  )
  let stack = new Stack()
  stack.pushData(sig)
  stack.pushInt(0)
  stack.push(ring.script.toRaw())

  ptx.inputs[inputIndex].witness.fromStack(stack)
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

  const [key1, key2] = Utils.sortKeys(bobCommRing.publicKey, wRevRing.publicKey)
  bobDelRing.script = Scripts.commScript(
    key1, key2, bobDelay, bobDelRing.publicKey
  )
  const commOutputScript = Utils.outputScrFromWitScr(bobDelRing.script)

  bobColRing.script = wColRing.script = Script.fromMultisig(2, 2, [
    bobColRing.publicKey, wColRing.publicKey
  ])
  const colOutputScript = Utils.outputScrFromWitScr(bobColRing.script)

  const ptx = new MTX({version: 2})

  const output = getOutput(bobPenaltyRing)
  const value = commTX.outputs[1].value + colTX.outputs[0].value - fee
  ptx.addOutput(output, value)

  const commCoin = getCommCoin(commOutputScript.toJSON(), commTX)
  ptx.addCoin(commCoin)
  // trick OP_CHECKSEQUENCEVERIFY
  // into thinking ptx is deep enough on-chain
  ptx.inputs[0].sequence = bobDelay

  const colCoin = getColCoin(colOutputScript.toJSON(), colTX)
  ptx.addCoin(colCoin)

  // builtin TX.sign() only signs multisig input from colTX
  ptx.sign([bobColRing, wColRing])
  // so we have to sign the custom input from commTX by hand
  signCommInput(ptx, bobDelRing, commCoin)

  return ptx
}

module.exports = getPenaltyTX

'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.MTX
const Script = bcoin.Script
const Coin = bcoin.Coin
const Stack = bcoin.Stack

function verifyArgs(rings, delays, commTX, fee) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Object.values(delays).map(Utils.delayVerify)
  Utils.ensureCommitmentTX(commTX)
  Utils.amountVerify(fee)
}

function getCoins(scripts, tx) {
  return scripts.map((script, i) => Utils.getCoinFromTX(script, tx, i))
}

function getOutput(ring) {
  return Utils.getP2WPKHOutput(ring)
}

function sign(rtx, scripts, keys) {
  [0, 1].map((index) => {
    const {prevout} = rtx.inputs[index]
    const value = rtx.view.getOutput(prevout).value

    const sighashVersion = 1
    const sigs = [0, 1].map((key) =>
      rtx.signature(index, scripts[index], value, keys[index][key], null, sighashVersion)
    )

    let stack = new Stack()
    stack.pushInt(0)
    sigs.map((sig) => stack.pushData(sig))
    stack.pushInt(1)
    stack.push(scripts[index].toRaw())

    rtx.inputs[index].witness.fromStack(stack)
  })
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
  verifyArgs(arguments[0].rings, arguments[0].delays, commTX, fee)

  const [key1, key2] = Utils.sortKeys(aliceCommRing.publicKey, wRevRing1.publicKey)
  aliceCommRing.script = Scripts.commScript(
    key1, key2, bobDelay, aliceDelRing.publicKey
  )
  const outputScript1 = Utils.outputScrFromWitScr(aliceCommRing.script)

  const [key3, key4] = Utils.sortKeys(bobCommRing.publicKey, wRevRing2.publicKey)
  bobCommRing.script = Scripts.commScript(
    key3, key4, aliceDelay, bobDelRing.publicKey
  )
  const outputScript2 = Utils.outputScrFromWitScr(bobCommRing.script)

  const rtx = new MTX({version: 2})

  const output = getOutput(bobRevRing)
  const value = commTX.outputs[0].value + commTX.outputs[1].value - fee
  rtx.addOutput(output, value)

  const coins = getCoins([outputScript1.toJSON(), outputScript2.toJSON()], commTX)
  coins.map((coin) => rtx.addCoin(coin))

  sign(rtx, [aliceCommRing.script, bobCommRing.script], [
    Utils.sortRings(aliceCommRing, wRevRing1).map((ring) => ring.privateKey),
    Utils.sortRings(bobCommRing, wRevRing2).map((ring) => ring.privateKey)
  ])

  return rtx
}

module.exports = getRevocationTX

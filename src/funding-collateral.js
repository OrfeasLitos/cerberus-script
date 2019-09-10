'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Utils = require('./utils')

const MTX = bcoin.primitives.MTX
const Script = bcoin.script.Script

function interpretInput(args) {
  Utils.publicKeyVerify(args.fundKey1)
  Utils.publicKeyVerify(args.fundKey2)

  if (args.ftx !== undefined) {
    Utils.mtxVerify(args.ftx)
    Utils.coinVerify(args.amount)

    return true // fromMTX
  } else {
    Utils.coinVerify(args.inCoin)
    Utils.ensureWitness(args.ring)
    Utils.amountVerify(args.outAmount)

    return false
  }
}

function addFundColOutput(ftx, fundKey1, fundKey2, amount) {
  const witnessScript = Script.fromMultisig(2, 2, [fundKey1, fundKey2])
  const outputScript = Utils.outputScrFromWitScr(witnessScript)
  ftx.addOutput(outputScript, amount)
}

function getFundColTXFromMTX({ftx, fundKey1, fundKey2, amount}) { // TODO: test
  addFundColOutput(ftx, fundKey1, fundKey2, amount)
  return fctx
}

async function getFundColTXFromCoin({inCoin, ring, fundKey1, fundKey2, outAmount}) {
  const fctx = new MTX()
  addFundColOutput(fctx, fundKey1, fundKey2, outAmount)
  const changeAddress = ring.getAddress()

  await fctx.fund([inCoin], {changeAddress})
  fctx.scriptInput(0, inCoin, ring)

  return fctx
}

async function getFundColTX(args) {
  const fromMTX = interpretInput(args)

  return (fromMTX) ? getFundColTXFromMTX(args)
                   : await getFundColTXFromCoin(args)
}

module.exports = getFundColTX

'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Utils = require('./utils')

const MTX = bcoin.primitives.MTX
const Script = bcoin.script.Script

function interpretInput(args) {
  // TODO
}

function addFundingOutput(ftx, fundKey1, fundKey2, amount) {
  const witnessScript = Script.fromMultisig(2, 2, [fundKey1, fundKey2])
  const outputScript = Utils.outputScrFromWitScr(witnessScript)
  ftx.addOutput(outputScript, amount)
}

function getFundingTXFromMTX({ftx, fundKey1, fundKey2, amount}) { // TODO: test
  addFundingOutput(ftx, fundKey1, fundKey2, amount)
  return ftx
}

async function getFundingTXFromCoin({inCoin, ring, fundKey1, fundKey2, outAmount}) {
  const ftx = new MTX()
  addFundingOutput(ftx, fundKey1, fundKey2, outAmount)
  const changeAddress = ring.getAddress()

  await ftx.fund([inCoin], {changeAddress})
  ftx.scriptInput(0, inCoin, ring)

  return ftx
}

async function getFundingTX(args) {
  const fromMTX = false //interpretInput(args)

  return (fromMTX) ? getFundingTXFromMTX(args)
                   : await getFundingTXFromCoin(args)
}

module.exports = getFundingTX

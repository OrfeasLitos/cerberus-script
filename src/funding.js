'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Utils = require('./utils')

const MTX = bcoin.primitives.MTX
const Script = bcoin.script.Script

function interpretInput(args) {
  // TODO
}

function addFundingOutput(ftx, fundKey1, fundKey2, coins) {
  const witnessScript = Script.fromMultisig(2, 2, [fundKey1, fundKey2])
  const outputScript = Utils.outputScrFromWitScr(witnessScript)
  ftx.addOutput(outputScript, coins)
}

function getFundingTXFromMTX({ftx, fundKey1, fundKey2, coins}) { // TODO: test
  addFundingOutput(ftx, fundKey1, fundKey2, coins)
  return ftx
}

async function getFundingTXFromCoin({inCoin, ring, fundKey1, fundKey2, outCoins}) {
  const ftx = new MTX()
  addFundingOutput(ftx, fundKey1, fundKey2, outCoins)
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

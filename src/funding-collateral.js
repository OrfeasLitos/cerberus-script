'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Utils = require('./utils')

const MTX = bcoin.MTX
const Script = bcoin.Script
const Coin = bcoin.Coin

function interpretInput(args) {
  Utils.publicKeyVerify(args.fundKey1)
  Utils.publicKeyVerify(args.fundKey2)

  if (args.fctx !== undefined) {
    Utils.mtxVerify(args.fctx)
    Utils.amountVerify(args.outAmount)

    return true // fromMTX
  } else {
    Utils.outpointVerify(args.outpoint)
    Utils.ensureWitness(args.ring)
    Utils.amountVerify(args.outAmount)

    return false
  }
}

function getOutput(fundKey1, fundKey2) {
  const witnessScript = Script.fromMultisig(2, 2, [fundKey1, fundKey2])
  return Utils.outputScrFromWitScr(witnessScript)
}

function getFundColTXFromMTX({fctx, fundKey1, fundKey2, outAmount}) {
  const outputScript = getOutput(fundKey1, fundKey2)
  fctx.addOutput(outputScript, outAmount)
  return fctx
}

function getFundColTXFromRing({outpoint, ring, fundKey1, fundKey2, outAmount}) {
  const fctx = new MTX({version: 2})

  const output = getOutput(fundKey1, fundKey2)
  fctx.addOutput(output, outAmount)

  const program = ring.getProgram().toRaw().toString('hex')
  const coin = Utils.getCoinFromOutpoint(outAmount, program, outpoint)
  fctx.addCoin(coin)

  fctx.sign(ring)

  return fctx
}

function getFundColTX(args) {
  const fromMTX = interpretInput(args)

  return (fromMTX) ? getFundColTXFromMTX(args)
                   : getFundColTXFromRing(args)
}

module.exports = getFundColTX

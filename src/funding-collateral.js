'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Utils = require('./utils')

const MTX = bcoin.MTX
const Script = bcoin.Script
const Input = bcoin.Input
const Outpoint = bcoin.Outpoint
const Witness = bcoin.Witness

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

function getInput(prevout, ring) {
  return new Input({
    prevout,
    script: new Script(),
    witness: Witness.fromStack({items: [ring.getProgram().toRaw()]})
  })
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
  const fctx = new MTX()

  const input = getInput(outpoint, ring)
  fctx.addInput(input)

  const output = getOutput(fundKey1, fundKey2)
  fctx.addOutput(output, outAmount)

  return fctx
}

function getFundColTX(args) {
  const fromMTX = interpretInput(args)

  return (fromMTX) ? getFundColTXFromMTX(args)
                   : getFundColTXFromRing(args)
}

module.exports = getFundColTX

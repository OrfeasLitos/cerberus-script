'use strict'

const bcoin = require('bcoin')
const assert = require('bsert')

const Scripts = require('./scripts')
const Utils = require('./utils')

const MTX = bcoin.primitives.MTX
const Coin = bcoin.primitives.Coin
const Input = bcoin.primitives.Input
const Script = bcoin.script.Script

function verifyInput(rings, delays, coins, wRevRing1, wRevRing2) {
  Object.values(rings).map(Utils.ensureWitness)
  Object.values(rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
  Object.values(delays).map(Utils.delayVerify)
  Object.values(coins).map(Utils.coinVerify)
  assert(
    Buffer.isBuffer(wRevRing1.publicKey)
    && wRevRing1.publicKey.equals(wRevRing2.publicKey),
    'watchtower revocation keys must be equal'
  ) // TODO: discuss if equality desired
}

function getFundingCoin(prevout, ring1, ring2, coins1, coins2, fee) {
  ring1.script = Script.fromMultisig(2, 2,
    Utils.orderKeys(ring1.publicKey, ring2.publicKey)
  )
  const address = ring1.getAddress()
  const script = Script.fromAddress(address)
  const txinfo = {
    hash: prevout.hash,
    index: prevout.index,
    value: coins1 + coins2 + fee,
    script: script
  }
  return Coin.fromOptions(txinfo)
}

function addCommitmentOutput(tx, colRing, watchRing, delay, delRing, coins) {
  const [key1, key2] = Utils.orderKeys(colRing.publicKey, watchRing.publicKey)
  const witnessScript = Scripts.commScript(key1, key2, delay, delRing.publicKey)
  const outputScript = Utils.outputScrFromWitScr(witnessScript)

  tx.addOutput(outputScript, coins)
}

async function addCommitmentInput(ctx, prevout, fundRing1, fundRing2, coins1, coins2, fee) {
  const fundingCoin = getFundingCoin(prevout, fundRing1, fundRing2, coins1, coins2, fee)
  const changeAddress = fundRing1.getAddress()

  await ctx.fund([fundingCoin], {changeAddress})
  ctx.scriptInput(0, fundingCoin, fundRing1)
}

async function getCommitmentTX({
  rings: {
    aliceFundRing, bobFundRing, aliceColRing,
    wRevRing1, aliceDelRing, bobColRing,
    wRevRing2, bobDelRing
  },
  delays: {bobDelay, aliceDelay},
  coins: {aliceCoins, bobCoins, fee},
  prevout
}) {
  const arg = arguments[0]
  verifyInput(arg.rings, arg.delays, arg.coins, wRevRing1, wRevRing2)

  const ctx = new MTX()

  addCommitmentOutput(ctx, aliceColRing, wRevRing1, bobDelay, aliceDelRing, aliceCoins)
  addCommitmentOutput(ctx, bobColRing, wRevRing2, aliceDelay, bobDelRing, bobCoins)
  await addCommitmentInput(
    ctx, prevout, aliceFundRing, bobFundRing, aliceCoins, bobCoins, fee
  )

  return ctx
}

module.exports = getCommitmentTX

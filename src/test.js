'use strict'

const bcoin = require('bcoin')
const sha256 = require('bcrypto/lib/sha256')
const assert = require('bsert')

const KeyRing = bcoin.primitives.KeyRing
const Amount = bcoin.btc.Amount
const Coin = bcoin.primitives.Coin
const Script = bcoin.script.Script
const Outpoint = bcoin.primitives.Outpoint

const WchTwr = require('./watchtower')

;(async () => {
  const rings = Array.apply(null, Array(8))
        .map(x => KeyRing.generate())
  rings.map(ring => {ring.witness = true})
  const delay = 42
  const aliceCoins = Amount.fromBTC(10).toValue()
  const bobCoins = Amount.fromBTC(20).toValue()
  const hash = sha256.digest(Buffer.from('')).toString('hex')
  const fundingFee = 2330
  const commitmentFee = 14900

  // Funding TX

  const inCoin = new Coin({
    value: aliceCoins + bobCoins + fundingFee,
    script: Script.fromPubkeyhash(rings[0].getAddress().hash),
    hash,
    index: 0,
    address: rings[0].getAddress()
  })

  const ftx = await WchTwr.getFundingTX({
    inCoin, ring: rings[0],
    fundKey1: rings[1].publicKey,
    fundKey2: rings[2].publicKey,
    outCoins: aliceCoins + bobCoins
  })

  // Commitment TX

  const ctx = await WchTwr.getCommitmentTX({
    rings: {
      aliceFundRing: rings[1], bobFundRing: rings[2],
      aliceColRing: rings[3], wRevRing1: rings[4],
      aliceDelRing: rings[5], bobColRing: rings[6],
      wRevRing2: rings[4], bobDelRing: rings[7]
    },
    delays: {bobDelay: delay, aliceDelay: delay},
    coins: {aliceCoins, bobCoins, fee: fundingFee},
    prevout: Outpoint.fromTX(ftx, 0)
  })

  const witnessHash = ftx.outputs[0].script.code[1].data
  const witnessScript = ctx.inputs[0].witness.getRedeem().sha256()
  assert(witnessHash.equals(witnessScript),
    'Funding output witness hash doesn\'t correspond to commitment input witness script')

  console.log('Funding TX:\n', ftx, '\n')
  console.log('Commitment TX:\n', ctx, '\n')
})()

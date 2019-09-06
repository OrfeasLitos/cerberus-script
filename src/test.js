'use strict'

const bcoin = require('bcoin')
const sha256 = require('bcrypto/lib/sha256')
const KeyRing = bcoin.primitives.KeyRing
const Amount = bcoin.btc.Amount

const WchTwr = require('./watchtower')

;(async () => {
  const rings = Array.apply(null, Array(7))
        .map(x => KeyRing.generate())
  rings.map(ring => {ring.witness = true})
  const delay = 42
  const aliceCoins = Amount.fromBTC(10).toValue()
  const bobCoins = Amount.fromBTC(20).toValue()
  const hash = sha256.digest(Buffer.from('')).toString('hex')
  const fee = 14900

  const ctx = await WchTwr.getCommitmentTX({
    rings: {
      aliceFundRing: rings[0], bobFundRing: rings[1],
      aliceColRing: rings[2], wRevRing1: rings[3],
      aliceDelRing: rings[4], bobColRing: rings[5],
      wRevRing2: rings[3], bobDelRing: rings[6]
    },
    delays: {bobDelay: delay, aliceDelay: delay},
    coins: {aliceCoins, bobCoins, fee},
    prevout: {hash, index: 0}
  })

  console.log(ctx)
})()

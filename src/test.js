const bcoin = require('bcoin')
const sha256 = require('bcrypto/lib/sha256')
const KeyRing = bcoin.primitives.KeyRing

const WchTwr = require('./watchtower')

const rev_key1 = KeyRing.generate().publicKey
const rev_key2 = KeyRing.generate().publicKey
const delay = 42
const del_key = KeyRing.generate().publicKey
const aliceCoins = 10
const bobCoins = 20
const hash = sha256.digest(Buffer.from('')).toString('hex')

const ctx = WchTwr.commitmentTX({
  prevout: {hash, index: 0},
  aliceOut: {aliceColKey: rev_key1, wRevKey1: rev_key2,
             aliceDelKey: del_key, bobDelay: delay, aliceCoins},
  bobOut: {bobColKey: rev_key1, wRevKey2: rev_key2,
           bobDelKey: del_key, aliceDelay: delay, bobCoins}
})

console.log(ctx)

const bcoin = require('bcoin')
const KeyRing = bcoin.primitives.KeyRing

const ComTX = require('./txs')

const rev_key1 = KeyRing.generate().publicKey
const rev_key2 = KeyRing.generate().publicKey
const delay = 42
const del_key = KeyRing.generate().publicKey

const comTX = new ComTX({rev_key1, rev_key2, delay, del_key, prevout : {hash: '0', index: 0}})


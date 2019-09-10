'use strict'

const bcoin = require('bcoin')
const bcrypto = require('bcrypto')
const assert = require('bsert')

const secp256k1 = bcrypto.secp256k1
const Script = bcoin.script.Script
const KeyRing = bcoin.primitives.KeyRing
const MTX = bcoin.primitives.MTX
const Coin = bcoin.primitives.Coin

module.exports = {
  mtxVerify: function (mtx) {
    assert(MTX.isMTX(mtx), 'ftx must be an instance of MTX')
  },

  ensureWitness: function (ring) {
    assert(KeyRing.isKeyRing(ring), 'Ring not an instance of KeyRing')
    assert(ring.witness, 'Ring must have the witness property true')
  },

  publicKeyVerify: function (key) {
    assert(secp256k1.publicKeyVerify(key), 'Not a valid public key')
  },

  delayVerify: function (num) {
    assert(Number.isInteger(num) && (num > 0), 'Delay must be a positive integer')
  },

  amountVerify: function (num) {
    assert(Number.isInteger(num) && (num > 0), 'Amount must be a positive integer in Satoshi')
  },

  coinVerify: function (coin) {
    assert(Coin.isCoin(coin), 'Coin must be an instance of Coin')
  },

  sortKeys: function (key1, key2) {
    switch (Buffer.compare(key1, key2)) {
      case -1:
        return [key1, key2]
      case 1:
        return [key2, key1]
      case 0:
        throw new Error('keys must be different')
      default:
        throw new Error('unreachable')
    }
  },

  outputScrFromWitScr: function (witnessScript) {
    const res = new Script()

    res.pushSym('OP_0')
    res.pushData(witnessScript.sha256())
    res.compile()

    return res
  }
}

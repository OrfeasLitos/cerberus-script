'use strict'

const bcoin = require('bcoin')
const bcrypto = require('bcrypto')
const assert = require('bsert')

const secp256k1 = bcrypto.secp256k1
const Script = bcoin.script.Script
const KeyRing = bcoin.primitives.KeyRing

const Utils = {
  ensureWitness: function (ring) {
    assert(KeyRing.isKeyRing(ring), 'ring not an instance of KeyRing')
    assert(ring.witness, 'ring must have the witness property true')
  },

  publicKeyVerify: function (key) {
    assert(secp256k1.publicKeyVerify(key), 'not a valid public key')
  },

  delayVerify: function (num) {
    assert(Number.isInteger(num) && (num > 0), 'delay must be a positive integer')
  },

  coinVerify: function (num) {
    assert(Number.isInteger(num) && (num > 0), 'coins must be a positive integer in Satoshi')
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

module.exports = Utils

'use strict'

const bcoin = require('bcoin')
const bcrypto = require('bcrypto')
const assert = require('bsert')

const secp256k1 = bcrypto.secp256k1
const Script = bcoin.script.Script

const Utils = {
  publicKeyVerify: function (key) {
    assert(secp256k1.publicKeyVerify(key), 'not a valid public key')
  },

  delayVerify: function (num) {
    assert(Number.isInteger(num) && (num > 0), 'delay must be a positive integer')
  },

  coinVerify: function (num) {
    assert(Number.isInteger(num) && (num > 0), 'coins must be a positive integer in Satoshi')
  },

  orderKeys: function (key1, key2) {
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

  outputScrFromWitnessScr: function (witnessScript) {
    const res = new Script()

    res.pushSym('OP_0')
    res.pushData(witnessScript.sha256())
    res.compile()

    return res
  }
}

module.exports = Utils
'use strict'

const bcoin = require('bcoin')
const bcrypto = require('bcrypto')
const assert = require('bsert')

const secp256k1 = bcrypto.secp256k1
const Script = bcoin.Script
const KeyRing = bcoin.KeyRing
const MTX = bcoin.MTX
const Coin = bcoin.Coin
const Opcodes = bcoin.Opcodes

const KEY_SIZE = 33

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

  ensureCommitmentTX: function (tx) {
    assert(MTX.isMTX(tx),
      'tx is not an instance of MTX')
    assert(tx.inputs.length === 1,
      'Commitment TX must have 1 input')
    assert(tx.inputs[0].getType() === 'witnessscripthash',
      'Commitment TX input must be P2SH')

    const keys = Array.apply(null, Array(2)).map(x => Buffer.from('0'.repeat(KEY_SIZE)))
    const desiredCode = Script.fromMultisig(2, 2, keys).code
    const actualCode = tx.inputs[0].getRedeem().code
    assert(desiredCode.every((op, i) => op.value === actualCode[i].value),
      'Commitment TX input must have a multisig redeem script')

    assert(tx.outputs.length === 2,
      'Commitment TX must have 2 outputs')
    assert(tx.outputs.every(output => output.getType() === 'witnessscripthash'),
      'Commitment TX outputs must be P2SH')
  },

  ensureCollateralTX: function (tx) {
    assert(MTX.isMTX(tx),
      'tx is not an instance of MTX')
    assert(tx.inputs.length === 1,
      'Collateral TX must have 1 input')
    //assert(tx.inputs[0].getType() === 'witnesspubkeyhash', // TODO: make p2wpkh
    //  'Collateral TX input must be of type pay to witness public key hash')
    assert(tx.outputs.length === 1,
      'Collateral TX must have 1 output')
    assert(tx.outputs[0].getType() === 'witnessscripthash',
      'Collateral TX output must be P2SH')
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
  },

  getP2WPKHOutput: function (ring) {
    const address = ring.getAddress()
    return Script.fromAddress(address)
  }
}

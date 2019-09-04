'use strict'

const bcoin = require('bcoin')
const bcrypto = require('bcrypto')
const assert = require('bsert')

const MTX = bcoin.primitives.MTX
const Input = bcoin.primitives.Input
const Script = bcoin.script.Script
const secp256k1 = bcrypto.secp256k1

function publicKeyVerify(key) {
  assert(secp256k1.publicKeyVerify(key), 'not a valid public key')
}

function delayVerify(num) {
  assert(Number.isInteger(num) && (num > 0), 'delay must be a positive integer')
}

function coinVerify(num) {
  assert(Number.isInteger(num) && (num > 0), 'coins must be a positive integer in Satoshi')
}

function orderKeys(key1, key2) {
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
}

const Watchtower = {}

Watchtower.getCommScript = function (rev_key1, rev_key2, delay, del_key) {
  const res = new Script()

  res.pushSym('OP_IF')
  res.pushInt(2)
  res.pushData(rev_key1)
  res.pushData(rev_key2)
  res.pushInt(2)
  res.pushSym('OP_CHECKMULTISIG')
  res.pushSym('OP_ELSE')
  res.pushInt(delay)
  res.pushSym('OP_CHECKSEQUENCEVERIFY')
  res.pushSym('OP_DROP')
  res.pushData(del_key)
  res.pushSym('OP_CHECKSIG')
  res.pushSym('OP_ENDIF')

  res.compile()
  return res
}

Watchtower.commitmentTX = function ({
    rings: {
      aliceFundRing, bobFundRing, aliceColRing,
      wRevRing1, aliceDelRing, bobColRing,
      wRevRing2, bobDelRing
    },
    delays: {bobDelay, aliceDelay},
    coins: {aliceCoins, bobCoins, fee},
    prevout
  }) {
    Object.values(arguments[0].rings).map(ring => publicKeyVerify(ring.publicKey))
    Object.values(arguments[0].delays).map(delayVerify)
    Object.values(arguments[0].coins).map(coinVerify)
    assert(
      Buffer.isBuffer(wRevRing1.publicKey)
      && wRevRing1.publicKey.equals(wRevRing2.publicKey),
      'watchtower revocation keys must be equal'
    ) // TODO: discuss if equality desired
  const ctx = new MTX()

  ctx.addInput({
    prevout,
    script: Script.fromMultisig(2, 2, orderKeys(aliceFundKey, bobFundKey)),
    witness: // TODO
  })

  let [key1, key2] = orderKeys(aliceColKey, wRevKey1)
  const aliceScript = Watchtower.getCommScript(key1, key2, bobDelay, aliceDelKey)
  ctx.addOutput(aliceScript, aliceCoins)

  [key1, key2] = orderKeys(bobColKey, wRevKey2)
  const bobScript = Watchtower.getCommScript(key1, key2, aliceDelay, bobDelKey)
  ctx.addOutput(bobScript, bobCoins)

  return ctx
}

module.exports = Watchtower
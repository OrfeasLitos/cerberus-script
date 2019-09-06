'use strict'

const bcoin = require('bcoin')
const bcrypto = require('bcrypto')
const assert = require('bsert')
const Utils = require('./utils')

const MTX = bcoin.primitives.MTX
const Coin = bcoin.primitives.Coin
const Input = bcoin.primitives.Input
const Script = bcoin.script.Script

const Watchtower = {
  fee: 14900,
  getCommScript: function (rev_key1, rev_key2, delay, del_key) {
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
  },

  commitmentTX: async function ({
    rings: {
      aliceFundRing, bobFundRing, aliceColRing,
      wRevRing1, aliceDelRing, bobColRing,
      wRevRing2, bobDelRing
    },
    delays: {bobDelay, aliceDelay},
    coins: {aliceCoins, bobCoins},
    prevout
  }) {
    Object.values(arguments[0].rings).map(ring => Utils.publicKeyVerify(ring.publicKey))
    Object.values(arguments[0].delays).map(Utils.delayVerify)
    Object.values(arguments[0].coins).map(Utils.coinVerify)
    assert(
      Buffer.isBuffer(wRevRing1.publicKey)
      && wRevRing1.publicKey.equals(wRevRing2.publicKey),
      'watchtower revocation keys must be equal'
    ) // TODO: discuss if equality desired

    aliceFundRing.script = Script.fromMultisig(2, 2,
      Utils.orderKeys(aliceFundRing.publicKey, bobFundRing.publicKey))
    const aliceAddress = aliceFundRing.getAddress()
    const script = Script.fromAddress(aliceAddress)
    const txinfo = {
      hash: prevout.hash,
      index: prevout.index,
      value: aliceCoins + bobCoins + this.fee,
      script: script
    }
    const coin = Coin.fromOptions(txinfo)

    const ctx = new MTX()

    let [key1, key2] = Utils.orderKeys(aliceColRing.publicKey, wRevRing1.publicKey)
    const aliceWitScript = Watchtower.getCommScript(key1, key2, bobDelay, aliceDelRing.publicKey)
    ctx.addOutput(Utils.outputScriptFromWitnessScript(aliceWitScript), aliceCoins)

    ; [key1, key2] = Utils.orderKeys(bobColRing.publicKey, wRevRing2.publicKey) // we all love ;-bugs
    const bobWitScript = Watchtower.getCommScript(key1, key2, aliceDelay, bobDelRing.publicKey)
    ctx.addOutput(Utils.outputScriptFromWitnessScript(bobWitScript), bobCoins)

    await ctx.fund([coin], {changeAddress: aliceAddress})
    ctx.scriptInput(0, coin, aliceFundRing)

    return ctx
  }
}

module.exports = Watchtower

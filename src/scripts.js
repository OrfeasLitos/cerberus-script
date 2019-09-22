'use strict'

const bcoin = require('bcoin')
const Script = bcoin.Script

const Scripts = {
  commReclaimScript: function (key1, key2, delay, delKey) {
    const res = new Script()

    res.pushSym('OP_IF')
    res.pushInt(2)
    res.pushData(key1)
    res.pushData(key2)
    res.pushInt(2)
    res.pushSym('OP_CHECKMULTISIG')
    res.pushSym('OP_ELSE')
    res.pushInt(delay)
    res.pushSym('OP_CHECKSEQUENCEVERIFY')
    res.pushSym('OP_DROP')
    res.pushData(delKey)
    res.pushSym('OP_CHECKSIG')
    res.pushSym('OP_ENDIF')

    res.compile()
    return res
  },

  get emptySig() {
    return Buffer.from([])
  },

  get cheatWitScr() {
    return [0, this.emptySig, this.emptySig, 1]
  },

  get honestWitScr() {
    return [this.emptySig, 0]
  }
}

module.exports = Scripts

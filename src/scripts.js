'use strict'

const bcoin = require('bcoin')
const Script = bcoin.Script

const Scripts = {
  commScript: function (revKey1, revKey2, delay, delKey) {
    const res = new Script()

    res.pushSym('OP_IF')
    res.pushInt(2)
    res.pushData(revKey1)
    res.pushData(revKey2)
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
}

module.exports = Scripts

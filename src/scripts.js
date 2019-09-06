const bcoin = require('bcoin')
const Script = bcoin.script.Script

const Scripts = {
  commScript: function (rev_key1, rev_key2, delay, del_key) {
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
}

module.exports = Scripts

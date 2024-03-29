'use strict'

const bcoin = require('bcoin')
const sha256 = require('bcoin/node_modules/bcrypto').SHA256
const assert = require('bcoin/node_modules/bsert')

const KeyRing = bcoin.KeyRing
const Amount = bcoin.Amount
const Script = bcoin.Script
const Outpoint = bcoin.Outpoint
const MTX = bcoin.MTX
const Input = bcoin.Input
const Witness = bcoin.Witness
const Coin = bcoin.Coin

const WchTwr = require('../src/watchtower')

const rings = Array.apply(null, Array(15))
      .map(x => KeyRing.generate())
rings.map(ring => {ring.witness = true})

const shortDelay = 42
const longDelay = 420

const fundingHash = sha256.digest(Buffer.from('funding'))
const colHash = sha256.digest(Buffer.from('collateral'))

const aliceAmount = Amount.fromBTC(10).toValue()
const bobAmount = Amount.fromBTC(20).toValue()
const colEpsilon = 40000
const fundingColFee = 2330
const commitmentFee = 14900
const penaltyFee = 7512 // estimatesmartfee 313 or sth
const revocationFee = 8520
const reclaimFee = 5000

const aliceOrigRing = rings[0]
const aliceFundRing = rings[1]
const bobFundRing = rings[2]
const aliceRevRing = rings[3]
const bobRevRing = rings[4]
const wRevRing1 = rings[5]
const wRevRing2 = KeyRing.fromPrivate(wRevRing1.privateKey)
wRevRing2.witness = true
const aliceDelRing = rings[6]
const bobDelRing = rings[7]
const bobPenaltyRing = rings[8]
const wPenaltyRing = rings[9]
const bobOwnRing = rings[10]
const wOrigRing = rings[11]
const bobColRing = rings[12]
const wColRing = rings[13]

describe('End-to-end test', () => {
  const ftx = WchTwr.getFundingTX({
    outpoint: new Outpoint(fundingHash, 0),
    ring: aliceOrigRing,
    fundKey1: aliceFundRing.publicKey,
    fundKey2: bobFundRing.publicKey,
    outAmount: aliceAmount + bobAmount
  })

  describe('Funding TX', () => {
    it('should verify correctly', () => {
      assert(ftx.verify(),
        'Funding TX does not verify correctly')
    })

    let ftx2 = new MTX({version: 2})

    ftx2.addCoin(Coin.fromJSON({
      version: 2,
      height: -1,
      value: aliceAmount + bobAmount,
      coinbase: false,
      script: aliceOrigRing.getProgram().toRaw().toString('hex'),
      hash: fundingHash.toString('hex'),
      index: 0
    }))

    ftx2 = WchTwr.getFundingTX({
      fctx: ftx2, fundKey1: aliceFundRing.publicKey,
      fundKey2: bobFundRing.publicKey, outAmount: aliceAmount + bobAmount
    })

    ftx2.sign(aliceOrigRing)

    it('should be generatable both from MTX and from KeyRing', () => {
      assert(ftx.hash().equals(ftx2.hash()) &&
        ftx.witnessHash().equals(ftx2.witnessHash()),
        'The two funding-collateral TX generation methods do not produce same results')
    })
  })

  const commTX = WchTwr.getCommitmentTX({
    rings: {
      aliceFundRing, bobFundRing,
      aliceRevRing, wRevRing1,
      aliceDelRing, bobRevRing,
      wRevRing2, bobDelRing
    },
    delays: {bobDelay: shortDelay, aliceDelay: shortDelay},
    amount: {aliceAmount, bobAmount, fee: fundingColFee},
    ftx
  })

  describe('Commitment TX', () => {
    it('should verify correctly', () => {
      assert(commTX.verify(),
        'Commitment TX does not verify correctly')
    })

    const fundingWitnessHash = ftx.outputs[0].script.code[1].data
    const commWitnessScript = commTX.inputs[0].witness.getRedeem().sha256()
    it('should spend Funding TX', () => {
      assert(fundingWitnessHash.equals(commWitnessScript),
        'Funding output witness hash doesn\'t correspond to commitment input witness script')
    })
  })

  // Similar to Funding TX, already tested
  const colTX = WchTwr.getCollateralTX({
    outpoint: new Outpoint(colHash, 0),
    ring: wOrigRing,
    fundKey1: bobColRing.publicKey,
    fundKey2: wColRing.publicKey,
    outAmount: aliceAmount + bobAmount + colEpsilon
  })

  describe('Collateral TX', () => {
    it('should verify correctly', () => {
      assert(ftx.verify(),
        'Collateral TX does not verify correctly')
    })

    let colTX2 = new MTX({version: 2})

    colTX2.addCoin(Coin.fromJSON({
      version: 2,
      height: -1,
      value: aliceAmount + bobAmount + colEpsilon,
      coinbase: false,
      script: wOrigRing.getProgram().toRaw().toString('hex'),
      hash: colHash.toString('hex'),
      index: 0
    }))

    colTX2 = WchTwr.getCollateralTX({
      fctx: colTX2, fundKey1: bobColRing.publicKey,
      fundKey2: wColRing.publicKey, outAmount: aliceAmount + bobAmount + colEpsilon
    })

    colTX2.sign(wOrigRing)

    it('should be generatable both from MTX and from KeyRing', () => {
      assert(colTX.hash().equals(colTX2.hash()) &&
        colTX.witnessHash().equals(colTX2.witnessHash()),
        'The two funding-collateral TX generation methods do not produce same results')
    })
  })

  const reclaimTX = WchTwr.getReclaimTX({
    rings: {
      bobColRing, wColRing,
      bobPenaltyRing, wPenaltyRing
    },
    delay: longDelay,
    colTX, fee: reclaimFee
  })

  describe('Reclaim TX', () => {
    it('should verify correctly', () => {
      assert(reclaimTX.verify(),
        'Reclaim TX does not verify correctly')
    })

    const colWitnessHash = colTX.outputs[0].script.code[1].data
    const reclaimWitnessScriptForCol = reclaimTX.inputs[0].witness.getRedeem().sha256()
    it('should spend Collateral TX', () => {
      assert(colWitnessHash.equals(reclaimWitnessScriptForCol),
        'Collateral output witness hash doesn\'t correspond to reclaim input witness script')
    })
  })

  const p1tx = WchTwr.getPenalty1TX({
    rings: {
      bobOwnRing, bobDelRing,
      bobRevRing, wRevRing: wRevRing1,
      bobColRing, wColRing
    },
    bobDelay: shortDelay, commTX,
    colTX, fee: penaltyFee
  })

  describe('Penalty 1 TX', () => {
    it('should verify correctly', () => {
      assert(p1tx.verify(),
        'Penalty 1 TX does not verify correctly')
    })

    const commWitnessHash = commTX.outputs[1].script.code[1].data
    const penalty1WitnessScriptForComm = p1tx.inputs[0].witness.getRedeem().sha256()
    it('should spend Commitment TX output 1', () => {
      assert(commWitnessHash.equals(penalty1WitnessScriptForComm),
        'Commitment output witness hash doesn\'t correspond to penalty 1 input witness script'
      )
    })

    const colWitnessHash = colTX.outputs[0].script.code[1].data
    const penalty1WitnessScriptForCol = p1tx.inputs[1].witness.getRedeem().sha256()
    it('should spend Collateral TX', () => {
      assert(colWitnessHash.equals(penalty1WitnessScriptForCol),
        'Collateral output witness hash doesn\'t correspond to penalty 1 input witness script'
      )
    })
  })

  const p2tx = WchTwr.getPenalty2TX({
    rings: {
      bobOwnRing, bobDelRing,
      bobRevRing, wRevRing: wRevRing1,
      bobPenaltyRing, wPenaltyRing
    },
    delays: {longDelay, bobDelay: shortDelay},
    commTX, reclaimTX, fee: penaltyFee
  })

  describe('Penalty 2 TX', () => {
    it('should verify correctly', () => {
      assert(p2tx.verify(),
        'Penalty 2 TX does not verify correctly')
    })

    const commWitnessHash = commTX.outputs[1].script.code[1].data
    const penalty2WitnessScriptForComm = p2tx.inputs[0].witness.getRedeem().sha256()
    it('should spend Commitment TX output 1', () => {
      assert(commWitnessHash.equals(penalty2WitnessScriptForComm),
        'Commitment output witness hash doesn\'t correspond to penalty 2 input witness script'
      )
    })

    const reclaimWitnessHash = reclaimTX.outputs[0].script.code[1].data
    const penalty2WitnessScriptForReclaim = p2tx.inputs[1].witness.getRedeem().sha256()
    it('should spend Reclaim TX', () => {
      assert(reclaimWitnessHash.equals(penalty2WitnessScriptForReclaim),
        'Reclaim output witness hash doesn\'t correspond to penalty 2 input witness script')
    })
  })

  const rtx = WchTwr.getRevocationTX({
    rings: {
      aliceRevRing, bobRevRing, wRevRing1, wRevRing2,
      aliceDelRing, bobDelRing, bobOwnRing
    },
    delays: {aliceDelay: shortDelay, bobDelay: shortDelay},
    commTX, fee: revocationFee
  })

  describe('Revocation TX', () => {
    it('should verify correctly', () => {
      assert(rtx.verify(),
        'Revocation TX does not verify correctly')
    })

    const aliceWitnessHash = commTX.outputs[0].script.code[1].data
    const aliceWitnessScript = rtx.inputs[0].witness.getRedeem().sha256()
    it('should spend Commitment TX output 0', () => {
      assert(aliceWitnessHash.equals(aliceWitnessScript),
        'Alice output witness hash doesn\'t correspond to revocation input witness script')
    })

    const bobWitnessHash = commTX.outputs[1].script.code[1].data
    const bobWitnessScript = rtx.inputs[1].witness.getRedeem().sha256()
    it('should spend Commitment TX output 1', () => {
      assert(bobWitnessHash.equals(bobWitnessScript),
        'Bob output witness hash doesn\'t correspond to revocation input witness script')
    })
  })
})

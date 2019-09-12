'use strict'

const bcoin = require('bcoin')
const sha256 = require('bcrypto/lib/sha256')
const assert = require('bsert')

const KeyRing = bcoin.KeyRing
const Amount = bcoin.Amount
const Script = bcoin.Script
const Outpoint = bcoin.Outpoint
const MTX = bcoin.MTX
const Input = bcoin.Input
const Witness = bcoin.Witness

const WchTwr = require('./watchtower')

;(async () => {
  const rings = Array.apply(null, Array(13))
        .map(x => KeyRing.generate())
  rings.map(ring => {ring.witness = true})

  const delay = 42

  const fundingHash = sha256.digest(Buffer.from('funding')).toString('hex')
  const colHash = sha256.digest(Buffer.from('collateral')).toString('hex')

  const aliceAmount = Amount.fromBTC(10).toValue()
  const bobAmount = Amount.fromBTC(20).toValue()
  const colEpsilon = 40000
  const fundingColFee = 2330
  const commitmentFee = 14900
  const penaltyFee = 7512 // estimatesmartfee 313 or sth
  const revocationFee = 8520

  const aliceOrigRing = rings[0]
  const aliceFundRing = rings[1]
  const bobFundRing = rings[2]
  const aliceCommRing = rings[3]
  const bobCommRing = rings[4]
  const wRevRing1 = rings[5]
  const wRevRing2 = rings[5]
  const aliceDelRing = rings[6]
  const bobDelRing = rings[7]
  const bobPenaltyRing = rings[8]
  const wOrigRing = rings[9]
  const bobColRing = rings[10]
  const wColRing = rings[11]
  const bobRevRing = rings[12]

  // Funding TX

  const ftx1 = WchTwr.getFundingTX({
    outpoint: new Outpoint(fundingHash, 0),
    ring: aliceOrigRing,
    fundKey1: aliceFundRing.publicKey,
    fundKey2: bobFundRing.publicKey,
    outAmount: aliceAmount + bobAmount
  })

  let ftx2 = new MTX()

  const fundingInput = new Input({
    prevout: new Outpoint(fundingHash, 0),
    script: new Script(),
    witness: Witness.fromStack({items: [aliceOrigRing.getProgram().toRaw()]})
  })
  ftx2.addInput(fundingInput)

  ftx2 = WchTwr.getFundingTX({
    fctx: ftx2, fundKey1: aliceFundRing.publicKey,
    fundKey2: bobFundRing.publicKey, outAmount: aliceAmount + bobAmount
  })

  assert(ftx1.hash().equals(ftx2.hash()) &&
    ftx1.witnessHash().equals(ftx2.witnessHash()),
    'The two funding-collateral TX generation methods do not produce same results')

  const ftx = ftx1

  // Commitment TX

  const commTX = WchTwr.getCommitmentTX({
    rings: {
      aliceFundRing, bobFundRing,
      aliceCommRing, wRevRing1,
      aliceDelRing, bobCommRing,
      wRevRing2, bobDelRing
    },
    delays: {bobDelay: delay, aliceDelay: delay},
    amount: {aliceAmount, bobAmount, fee: fundingColFee},
    prevout: Outpoint.fromTX(ftx, 0)
  })

  const fundingWitnessHash = ftx.outputs[0].script.code[1].data
  const commWitnessScript = commTX.inputs[0].witness.getRedeem().sha256()
  assert(fundingWitnessHash.equals(commWitnessScript),
    'Funding output witness hash doesn\'t correspond to commitment input witness script')

  // Collateral TX

  const colTX = WchTwr.getCollateralTX({
    outpoint: new Outpoint(colHash, 0),
    ring: wOrigRing,
    fundKey1: bobColRing.publicKey,
    fundKey2: wColRing.publicKey,
    outAmount: aliceAmount + bobAmount + colEpsilon
  })

  // Penalty TX

  const ptx = WchTwr.getPenaltyTX({
    rings: {
      bobPenaltyRing, bobDelRing,
      bobCommRing, wRevRing: wRevRing1,
      bobColRing, wColRing
    },
    bobDelay: delay, commTX, colTX, fee: penaltyFee
  })

  const commWitnessHash = commTX.outputs[1].script.code[1].data
  const penaltyWitnessScriptForComm = ptx.inputs[0].witness.getRedeem().sha256()
  assert(commWitnessHash.equals(penaltyWitnessScriptForComm),
    'Commitment output witness hash doesn\'t correspond to penalty input witness script')

  const colWitnessHash = colTX.outputs[0].script.code[1].data
  const penaltyWitnessScriptForCol = ptx.inputs[1].witness.getRedeem().sha256()
  assert(colWitnessHash.equals(penaltyWitnessScriptForCol),
    'Collateral output witness hash doesn\'t correspond to penalty input witness script')

  // Revocation TX

  const rtx = WchTwr.getRevocationTX({
    rings: {
      aliceCommRing, bobCommRing, wRevRing1, wRevRing2,
      aliceDelRing, bobDelRing, bobRevRing
    },
    delays: {
      aliceDelay: delay, bobDelay: delay
    },
    commTX, fee: revocationFee
  })

  const aliceWitnessHash = commTX.outputs[0].script.code[1].data
  const aliceWitnessScript = rtx.inputs[0].witness.getRedeem().sha256()
  assert(aliceWitnessHash.equals(aliceWitnessScript),
    'Alice output witness hash doesn\'t correspond to revocation input witness script')

  const bobWitnessHash = commTX.outputs[1].script.code[1].data
  const bobWitnessScript = rtx.inputs[1].witness.getRedeem().sha256()
  assert(bobWitnessHash.equals(bobWitnessScript),
    'Bob output witness hash doesn\'t correspond to revocation input witness script')

  console.log('Funding TX:\n', ftx, '\n')
  console.log('Commitment TX:\n', commTX, '\n')
  console.log('Collateral TX:\n', colTX, '\n')
  console.log('Penalty TX:\n', ptx, '\n')
  console.log('Revocation TX:\n', rtx, '\n')
})()

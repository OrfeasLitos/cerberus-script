'use strict'

const bcoin = require('bcoin')
const sha256 = require('bcrypto/lib/sha256')
const assert = require('bsert')

const KeyRing = bcoin.KeyRing
const Amount = bcoin.Amount
const Coin = bcoin.Coin
const Script = bcoin.Script
const Outpoint = bcoin.Outpoint

const WchTwr = require('./watchtower')

;(async () => {
  const rings = Array.apply(null, Array(12))
        .map(x => KeyRing.generate())
  rings.map(ring => {ring.witness = true})
  const delay = 42
  const aliceAmount = Amount.fromBTC(10).toValue()
  const bobAmount = Amount.fromBTC(20).toValue()
  const fundingHash = sha256.digest(Buffer.from('funding')).toString('hex')
  const colHash = sha256.digest(Buffer.from('collateral')).toString('hex')
  const colEpsilon = 40000
  const fundingColFee = 2330
  const commitmentFee = 14900
  const penaltyFee = 7512 // estimatesmartfee 313 or sth

  // Funding TX

  const fundingInCoin = new Coin({
    value: aliceAmount + bobAmount + fundingColFee,
    script: Script.fromPubkeyhash(rings[0].getAddress().hash), // TODO: make p2wpkh
    hash: fundingHash,
    index: 0,
    address: rings[0].getAddress()
  })

  const ftx = await WchTwr.getFundingTX({
    inCoin: fundingInCoin, ring: rings[0],
    fundKey1: rings[1].publicKey,
    fundKey2: rings[2].publicKey,
    outAmount: aliceAmount + bobAmount
  })

  // Commitment TX

  const commTX = await WchTwr.getCommitmentTX({
    rings: {
      aliceFundRing: rings[1], bobFundRing: rings[2],
      aliceCommRing: rings[3], wRevRing1: rings[4],
      aliceDelRing: rings[5], bobCommRing: rings[6],
      wRevRing2: rings[4], bobDelRing: rings[7]
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

  const colInCoin = new Coin({
    value: aliceAmount + bobAmount + colEpsilon + fundingColFee,
    script: Script.fromPubkeyhash(rings[9].getAddress().hash), // TODO: make p1wpkh
    hash: colHash,
    index: 0,
    address: rings[9].getAddress()
  })

  const colTX = await WchTwr.getCollateralTX({
    inCoin: colInCoin, ring: rings[9],
    fundKey1: rings[10].publicKey,
    fundKey2: rings[11].publicKey,
    outAmount: aliceAmount + bobAmount + colEpsilon
  })

  // Penalty TX

  const ptx = WchTwr.getPenaltyTX({
    rings: {
      bobPenaltyRing: rings[8], bobDelRing: rings[7],
      bobCommRing: rings[6], wRevRing: rings[4],
      bobColRing: rings[10], wColRing: rings[11]
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

  console.log('Funding TX:\n', ftx, '\n')
  console.log('Commitment TX:\n', commTX, '\n')
  console.log('Collateral TX:\n', colTX, '\n')
  console.log('Penalty TX:\n', ptx, '\n')
})()

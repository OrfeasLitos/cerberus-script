# cerberus-script

Bitcoin script for "Cerberus - Incentivizing Watchtowers", implemented with the
[bcoin.js](https://github.com/bcoin-org/bcoin/) library.

How to setup and verify the implementation:
1. Clone this repository
1. go to the top directory of the repository
1. `npm install` (assumes a working `npm` and `nodejs` installation. nodejs v12 is not yet
   supported due to limitations of the `bcoin` library.)
1. `npm test`

Let channel between Alice (with funds `a`) and Bob (with funds `b`). Bob employs
watchtower W. All scripts are P2WSH.

## Funding transaction output (on-chain)

Like
[LN](https://github.com/lightningnetwork/lightning-rfc/blob/636b9f2e28c5eb9564b50b85ac85e23fc2176623/03-transactions.md#funding-transaction-output):
* value: `a + b`
* redeem script: `2 <pubkey1> <pubkey2> 2 OP_CHECKMULTISIG`, where `pubkey1`, `pubkey2`
  are the `funding_pubkey`s of Alice and Bob, sorted by ascending order of their
  DER-encodings.

## Collateral transaction output (on-chain)

* value: `a + b + ε` (provided by W)
* redeem script: `2 <collateral_pubkey1> <collateral_pubkey2> 2 OP_CHECKMULTISIG`, where
  `collateral_pubkey1`, `collateral_pubkey2` are the public keys of Bob and W, sorted by
  ascending order of their DER-encodings.

## Commitment transaction held by Alice (off-chain)

* unique input spends Funding output with witness script `0 <pubkey1_sig> <pubkey2_sig>`
* output 1: like [LN
  revocation](https://github.com/lightningnetwork/lightning-rfc/blob/636b9f2e28c5eb9564b50b85ac85e23fc2176623/03-transactions.md#to_local-output)
  * value: `a`
  * redeem script:
  ```
  OP_IF
      # Revocation
      2
      <revocation_pubkey1>
      <revocation_pubkey2>
      2
      OP_CHECKMULTISIG
  OP_ELSE
      # Normal
      `bob_delay`
      OP_CHECKSEQUENCEVERIFY
      OP_DROP
      <alice_delayed_pubkey>
      OP_CHECKSIG
  OP_ENDIF
  ```
  Where `<revocation_pubkey1>` and `<revocation_pubkey2>` are the two keys
  `<alice_collateral_pubkey>` and `<watchtower_revocation_pubkey>`, sorted by ascending
  order of their DER-encodings.
  * Spendable by witness scripts `<alice_delayed_sig> 0` (normal path) or `0
    <revocation_sig1> <revocation_sig2> 1` (revocation path)
* output 2:
  * value: `b`
  * redeem script:
  ```
  OP_IF
      # Revocation
      2
      <revocation_pubkey3>
      <revocation_pubkey4>
      2
      OP_CHECKMULTISIG
  OP_ELSE
      # Normal
      `bob_delay`
      OP_CHECKSEQUENCEVERIFY
      OP_DROP
      <bob_delayed_pubkey>
      OP_CHECKSIG
  OP_ENDIF
  ```
  Where `<revocation_pubkey3>` and `<revocation_pubkey4>` are the two keys
  `<bob_collateral_pubkey>` and `<watchtower_revocation_pubkey>`, sorted by ascending
  order of their DER-encodings.
  * Spendable by witness scripts `<bob_delayed_sig> 0` (normal path) or `0
    <revocation_sig3> <revocation_sig4> 1` (revocation path)

## Revocation transaction (off-chain for an open channel)

* input 1 spends output 1 of a Commitment tx, following the revocation path.
* input 2 spends output 2 of a Commitment tx, following the revocation path.
* output:
  * value: `a + b`
  * redeem script: P2WPKH to `<bob_pubkey>`

## Claim transaction (off-chain for an open channel)

* unique input spends the output of a Collateral tx, with witness script `0
  <collateral_sig1> <collateral_sig2>`.
* unique output:
  * value: `a + b + ε`
  * redeem script:
  ```
  OP_IF
      # Penalty
      `bob_delay`
      OP_CHECKSEQUENCEVERIFY
      OP_DROP
      2
      <penalty_pubkey1>
      <penalty_pubkey2>
      2
      OP_CHECKMULTISIG
  OP_ELSE
      # Normal
      `long_delay`
      OP_CHECKSEQUENCEVERIFY
      <watchtower_penalty_pubkey>
      OP_CHECKSIG
  OP_ENDIF
  ```
  Where `<penalty_pubkey1>` and `<penalty_pubkey2>` are the two keys
  `<bob_penalty_pubkey>` and `<watchtower_penalty_pubkey>`, sorted by ascending
  order of their DER-encodings.
  * Spendable by witness scripts `<watchtower_penalty_sig> 0` (normal path) or `0
    <penalty_sig1> <penalty_sig2> 1` (penalty path)

## Penalty transaction (off-chain for an open channel)

* input 1 spends output 2 of a Commitment tx, following the normal path.
* input 2 spends the output of a Claim tx, following the penalty path.

* output:
  * value: `b' + a + b + ε`, where `b'` is Bob's old balance as found in the Commitment tx
    spent by this Penalty tx
  * redeem script: P2WPKH to `<bob_pubkey>`

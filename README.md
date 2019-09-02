# cerberus-script

Bitcoin script for "Cerberus - Incentivizing Watchtowers", implemented with the
[bcoin.js](https://github.com/bcoin-org/bcoin/) library.

Let channel between Alice (with funds `a`) and Bob (with funds `b`). Bob employs
watchtower W. All scripts are P2WSH.

## Funding transaction output (on-chain)

Like
[LN](https://github.com/lightningnetwork/lightning-rfc/blob/636b9f2e28c5eb9564b50b85ac85e23fc2176623/03-transactions.md#funding-transaction-output):
* value: `a + b`
* script: `2 <pubkey1> <pubkey2> 2 OP_CHECKMULTISIG`, where `pubkey1`, `pubkey2` are the
  `funding_pubkey`s of Alice and Bob, sorted by ascending order of their DER-encodings.

## Collateral transaction output (on-chain)

* value: `a + b + ε`
* script: `2 <pubkey3> <pubkey4> 2 OP_CHECKMULTISIG`, where `pubkey3`, `pubkey4` are the
  `collateral_pubkey`s of Bob and W, sorted by ascending order of their DER-encodings.

## Commitment transaction held by Alice (off-chain)

* unique input spends Funding output with witness script `0 <pubkey1_sig> <pubkey2_sig>`
* 1st of 2 outputs: like [LN
  revocation](https://github.com/lightningnetwork/lightning-rfc/blob/636b9f2e28c5eb9564b50b85ac85e23fc2176623/03-transactions.md#to_local-output)
  * value: `a`
  * script:
  ```
  OP_IF
      # Revocation
      <revocation_pubkey>
  OP_ELSE
      `bob_delay`
      OP_CHECKSEQUENCEVERIFY
      OP_DROP
      <alice_delayed_pubkey>
  OP_ENDIF
  OP_CHECKSIG
  ```
* 2nd of 2 outputs:
  * value: `b`
  * script:
  ```
  
  ```

## Revocation transaction (off-chain for an open channel)

## Penalty transaction (off-chain for an open channel)

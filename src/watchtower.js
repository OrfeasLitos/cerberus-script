'use strict'

const Watchtower = {
  getFundingTX: require('./funding'),
  getCollateralTX: require('./collateral').
  getCommitmentTX: require('./commitment'),
  getPenaltyTX: require('./penalty'),
  getRevocationTX: require('./revocation'),
}

module.exports = Watchtower

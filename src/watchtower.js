'use strict'

module.exports = {
  getFundingTX: require('./funding'),
  getCollateralTX: require('./collateral'),
  getCommitmentTX: require('./commitment'),
  getPenaltyTX: require('./penalty'),
  getRevocationTX: require('./revocation'),
}

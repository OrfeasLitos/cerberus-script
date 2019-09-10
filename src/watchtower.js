'use strict'

module.exports = {
  getFundingTX: require('./funding-collateral'),
  getCollateralTX: require('./funding-collateral'),
  getCommitmentTX: require('./commitment'),
  getPenaltyTX: require('./penalty'),
  getRevocationTX: require('./revocation'),
}

'use strict'

module.exports = {
  getFundingTX: require('./funding-collateral'),
  getCollateralTX: require('./funding-collateral'),
  getCommitmentTX: require('./commitment'),
  getReclaimTX: require('./reclaim'),
  getPenaltyTX: require('./penalty'),
  getRevocationTX: require('./revocation'),
}

'use strict'

module.exports = {
  getFundingTX: require('./funding-collateral'),
  getCollateralTX: require('./funding-collateral'),
  getCommitmentTX: require('./commitment'),
  getReclaimTX: require('./reclaim'),
  getPenalty2TX: require('./penalty2'),
  getRevocationTX: require('./revocation'),
}

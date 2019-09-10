'use strict'

module.exports = {
  getFundingTX: require('./funding-collateral'),
  getCollateralTX: module.exports.getFundingTX,
  getCommitmentTX: require('./commitment'),
  getPenaltyTX: require('./penalty'),
  getRevocationTX: require('./revocation'),
}

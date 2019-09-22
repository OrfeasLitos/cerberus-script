'use strict'

const penalty = require('./penalty')

module.exports = {
  getFundingTX: require('./funding-collateral'),
  getCollateralTX: require('./funding-collateral'),
  getCommitmentTX: require('./commitment'),
  getReclaimTX: require('./reclaim'),
  getPenalty1TX: penalty.getPenalty1TX,
  getPenalty2TX: penalty.getPenalty2TX,
  getRevocationTX: require('./revocation'),
}

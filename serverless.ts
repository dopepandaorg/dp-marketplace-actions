import type { AWS } from '@serverless/typescript';

import SyncProfileWithTx from '@functions/SyncProfileWithTx';
import CastVoteWithTx from '@functions/CastVoteWithTx'
import SyncVotesWeightByContest from '@functions/SyncVotesWeightByContest'
import ConnectProfile from '@functions/ConnectProfile'

const serverlessConfiguration: AWS = {
  service: 'dp-marketplace-actions',
  frameworkVersion: '3',
  useDotenv: true,
  plugins: ['serverless-esbuild'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 128,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
  },
  // import the function via paths
  functions: { SyncProfileWithTx, CastVoteWithTx, SyncVotesWeightByContest, ConnectProfile },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
};

module.exports = serverlessConfiguration;

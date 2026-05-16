import { serverless } from '@teamcalo/service-builder';

import f from './functions';
import r from './resources';

module.exports = serverless({
  service: 'calo-dashboard-routing-api',
  plugins: ['serverless-dotenv-plugin', 'serverless-offline'],
  custom: {
    awsSDK2Layer: true,
    esbuild: {
      exclude: ['@elastic/elasticsearch', 'date-fns', 'date-fns-tz', 'lodash'],
      // REMOVE AFTER MIGRATED TO ESM
      target: 'node18',
      outExtension: {
        '.js': '.js'
      },
      format: 'cjs',
      banner: {
        js: ''
      }
    },
    BUCKET_NAME: {
      'Fn::ImportValue': 'calo-${self:provider.stage}-S3Name'
    }
  },
  provider: {
    runtime: 'nodejs18.x',
    layers: ['${ssm:/calo-layers-holder/${self:provider.stage}/LibsLayer}'],
    apiGateway: {
      restApiId: {
        'Fn::ImportValue': 'calo-dashboard-api-${self:provider.stage}-DashboardApiGatewayID'
      },
      restApiRootResourceId: {
        'Fn::ImportValue': 'calo-dashboard-api-${self:provider.stage}-DashboardResourceID'
      },
      restApiResources: {
        '/{country}': {
          'Fn::ImportValue': 'calo-dashboard-api-${self:provider.stage}-ApiGatewayResourceCountryVar'
        },
        '/route-plans': '${ssm:/calo-dashboard-driver-api/${self:provider.stage}/ApiGatewayResourceRoutePlans}',
        '/route-plans/{id}':
          '${ssm:/calo-dashboard-driver-api/${self:provider.stage}/ApiGatewayResourceRoutePlansIdVar}'
      }
    },
    environment: {
      POWERTOOLS_LOGGER_SAMPLE_RATE: '0',
      DATA_TABLE_NAME: {
        'Fn::ImportValue': 'calo-${self:provider.stage}-SingleDataTableName'
      },
      DASHBOARD_TABLE_NAME: {
        'Fn::ImportValue': 'calo-dashboard-api-${self:provider.stage}-DashboardTable'
      },
      DONATION_TABLE_NAME: {
        'Fn::ImportValue': 'calo-consumer-api-${self:provider.stage}-DonationsTableName'
      },
      SECRET_ARN: {
        'Fn::ImportValue': 'calo-${self:provider.stage}-ApiKeySecretRef'
      },
      OS_SECRET_ARN: {
        'Fn::ImportValue': 'calo-dashboard-api-${self:provider.stage}-OSSecretRef'
      },
      OPENSEARCH_URL: {
        'Fn::ImportValue': 'calo-dashboard-api-${self:provider.stage}-OSURL'
      },
      SUDO_SERVICE_URL: {
        'Fn::ImportValue': 'calo-sudo-core-3-${sls:stage}-GraphQlApiUrl'
      },
      DELIVERY_SERVICE_URL: {
        'Fn::ImportValue': 'calo-delivery-management-service-${sls:stage}-GraphQlApiUrl'
      },
      SERVICE_NAME: '${self:service}'
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: [
          'dynamodb:PutItem',
          'dynamodb:GetItem',
          'dynamodb:UpdateItem',
          'dynamodb:Query',
          'dynamodb:BatchGetItem'
        ],
        Resource: 'arn:aws:dynamodb:us-east-1:*:table/calo-dashboard-*'
      },
      {
        Effect: 'Allow',
        Action: 'appsync:GraphQL',
        Resource: {
          'Fn::Join': [
            '',
            [
              'arn:aws:appsync:',
              { Ref: 'AWS::Region' },
              ':',
              { Ref: 'AWS::AccountId' },
              ':apis/',
              {
                'Fn::ImportValue': 'calo-sudo-core-3-${self:provider.stage}-GraphQlApiId'
              },
              '/*'
            ]
          ]
        }
      },
      {
        Effect: 'Allow',
        Action: 'appsync:GraphQL',
        Resource: {
          'Fn::Join': [
            '',
            [
              'arn:aws:appsync:',
              { Ref: 'AWS::Region' },
              ':',
              { Ref: 'AWS::AccountId' },
              ':apis/',
              {
                'Fn::ImportValue': 'calo-delivery-management-service-${self:provider.stage}-GraphQlApiId'
              },
              '/*'
            ]
          ]
        }
      },
      {
        Effect: 'Allow',
        Action: [
          'dynamodb:PutItem',
          'dynamodb:GetItem',
          'dynamodb:UpdateItem',
          'dynamodb:Query',
          'dynamodb:BatchGetItem'
        ],
        Resource: [
          {
            'Fn::ImportValue': 'calo-${self:provider.stage}-SingleDataTableArn'
          },
          {
            'Fn::Join': [
              '',
              [
                {
                  'Fn::ImportValue': 'calo-${self:provider.stage}-SingleDataTableArn'
                },
                '/*'
              ]
            ]
          }
        ]
      },
      {
        Effect: 'Allow',
        Action: 'secretsmanager:GetSecretValue',
        Resource: {
          'Fn::ImportValue': 'calo-dashboard-api-${self:provider.stage}-OSSecretRef'
        }
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:Query'],
        Resource: [
          {
            'Fn::ImportValue': 'calo-consumer-api-${self:provider.stage}-DonationsTableArn'
          },
          {
            'Fn::Join': [
              '',
              [
                {
                  'Fn::ImportValue': 'calo-consumer-api-${self:provider.stage}-DonationsTableArn'
                },
                '/*'
              ]
            ]
          }
        ]
      }
    ]
  },
  functions: f,
  resources: r
});

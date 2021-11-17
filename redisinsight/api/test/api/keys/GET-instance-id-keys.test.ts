import {
  expect,
  describe,
  it,
  before,
  deps,
  Joi,
  requirements,
  validateApiCall,
} from '../deps';
import { initSettings, setAppSettings } from '../../helpers/local-db';
const { server, request, constants, rte } = deps;

// endpoint to test
const endpoint = (instanceId = constants.TEST_INSTANCE_ID) =>
  request(server).get(`/instance/${instanceId}/keys`);

const responseSchema = Joi.array().items(Joi.object().keys({
  total: Joi.number().integer().required(),
  scanned: Joi.number().integer().required(),
  cursor: Joi.number().integer().required(),
  host: Joi.string(),
  port: Joi.number().integer(),
  keys: Joi.array().items(Joi.object().keys({
    name: Joi.string().required(),
    type: Joi.string().required(),
    ttl: Joi.number().integer().required(),
    size: Joi.number().integer(), // todo: fix size pipeline for cluster
  })).required(),
}).required()).required();

const mainCheckFn = async (testCase) => {
  it(testCase.name, async () => {
    if (testCase.before) {
      await testCase.before();
    }

    await validateApiCall({
      endpoint,
      ...testCase,
    });

    if (testCase.after) {
      await testCase.after();
    }
  });
};

describe('GET /instance/:instanceId/keys', () => {
  // todo: add query validation
  xdescribe('Validation', () => {});

  describe('Common', () => {
    const KEYS_NUMBER = 1500; // 300 per each base type
    before(async () => await rte.data.generateNKeys(KEYS_NUMBER, true));

    describe('Search (standalone + cluster)', () => {
      [
        {
          name: 'Should find key by exact name',
          query: {
            cursor: '0',
            match: 'str_key_1'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.eq(1);
            expect(result.keys[0].name).to.eq('str_key_1');
          }
        },
        {
          name: 'Should not find key by exact name',
          query: {
            cursor: '0',
            match: 'not_exist_key'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).gte(KEYS_NUMBER);
            expect(result.keys.length).to.eq(0);
          }
        },
        {
          name: 'Should prevent full scan in one request',
          query: {
            count: 100,
            cursor: '0',
            match: 'not_exist_key*'
          },
          responseSchema,
          before: async () => await setAppSettings({ scanThreshold: 500 }),
          after: async () => await initSettings(),
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(500).lte((500 + 100) * result.numberOfShards);
            expect(result.keys.length).to.eql(0);
          }
        },
        {
          name: 'Should search by with * in the end',
          query: {
            cursor: '0',
            match: 'str_key_11*'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(11);
            result.keys.map(({ name }) => {
              expect(name.indexOf('str_key_11')).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with * in the beginning',
          query: {
            cursor: '0',
            match: '*_key_111'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(5);
            result.keys.map(({ name }) => {
              expect(name.indexOf('_key_111')).to.eql(name.length - 8);
            })
          }
        },
        {
          name: 'Should search by with * in the middle',
          query: {
            cursor: '0',
            match: 'str_*_111'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.eq(1);
            expect(result.keys[0].name).to.eq('str_key_111');
          }
        },
        {
          name: 'Should search by with ? in the end',
          query: {
            cursor: '0',
            match: 'str_key_10?'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(10);
            result.keys.map(({ name }) => {
              expect(name.indexOf('str_key_10')).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with [a-b] glob pattern',
          query: {
            cursor: '0',
            match: 'str_key_10[0-5]'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(1).lte(6);
            result.keys.map(({ name }) => {
              expect(name.indexOf('str_key_10')).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with [a,b,c] glob pattern',
          query: {
            cursor: '0',
            match: 'str_key_10[0,1,2]'
          },
          responseSchema,
          checkFn: ({body}) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(1).lte(3);
            result.keys.map(({name}) => {
              expect(name.indexOf('str_key_10')).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with [abc] glob pattern',
          query: {
            cursor: '0',
            match: 'str_key_10[012]'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(1).lte(3);
            result.keys.map(({ name }) => {
              expect(name.indexOf('str_key_10')).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with [^a] glob pattern',
          query: {
            cursor: '0',
            match: 'str_key_10[^0]'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(9);
            result.keys.map(({ name }) => {
              expect(name.indexOf('str_key_10')).to.eql(0);
            })
          }
        },
        {
          name: 'Should search by with combined glob patterns',
          query: {
            cursor: '0',
            match: 's?r_*_[1][0-5][^0]'
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(KEYS_NUMBER);
            expect(result.keys.length).to.gte(54);
          }
        },
      ].map(mainCheckFn);
    });

    describe('Standalone', () => {
      requirements('rte.type=STANDALONE');

      [
        {
          name: 'Should scan all types',
          query: {
            cursor: '0',
          },
          responseSchema,
          checkFn: ({ body }) => {
            expect(body[0].total).to.eql(KEYS_NUMBER);
            expect(body[0].scanned).to.eql(200);
            expect(body[0].cursor).to.not.eql(0);
            expect(body[0].keys.length).to.gte(200);
          }
        },
        {
          name: 'Should scan by provided count value',
          query: {
            count: 500,
            cursor: '0',
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(500).lte(510);
            expect(result.keys.length).to.gte(500).lte(510);
          }
        },
      ].map(mainCheckFn);

      it('Should scan entire database', async () => {
        const keys = [];
        let cursor = null;
        let scanned = 0;

        while (cursor !== 0) {
          await validateApiCall({
            endpoint,
            query: {
              cursor: cursor || 0,
              count: 99,
            },
            checkFn: ({ body }) => {
              cursor = body[0].cursor;
              scanned += body[0].scanned;
              keys.push(...body[0].keys);
            },
          });
        }

        expect(keys.length).to.be.gte(KEYS_NUMBER);
        expect(keys.length).to.be.lt(KEYS_NUMBER + 5); // redis returns each key at least once
        expect(cursor).to.eql(0);
        expect(scanned).to.be.gte(KEYS_NUMBER);
        expect(scanned).to.be.lt(KEYS_NUMBER + 99);
      });

      describe('Filter by type', () => {
        requirements('rte.version>=6.0');

        [
          {
            name: 'Should filter by type (string)',
            query: {
              cursor: '0',
              type: 'string',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('str_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('string'));
            }
          },
          {
            name: 'Should filter by type (list)',
            query: {
              cursor: '0',
              type: 'list',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('list_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('list'));
            }
          },
          {
            name: 'Should filter by type (set)',
            query: {
              cursor: '0',
              type: 'set',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('set_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('set'));
            }
          },
          {
            name: 'Should filter by type (zset)',
            query: {
              cursor: '0',
              type: 'zset',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('zset_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('zset'));
            }
          },
          {
            name: 'Should filter by type (hash)',
            query: {
              cursor: '0',
              type: 'hash',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(KEYS_NUMBER);
              expect(body[0].scanned).to.gte(200);
              expect(body[0].scanned).to.lte(KEYS_NUMBER);
              expect(body[0].scanned % 200).to.lte(0);
              expect(body[0].cursor).to.not.eql(0);
              expect(body[0].keys.length).to.gte(200);
              expect(body[0].keys.length).to.lt(300);
              body[0].keys.map(key => expect(key.name).to.have.string('hash_key_'));
              body[0].keys.map(key => expect(key.type).to.eql('hash'));
            }
          },
        ].map(mainCheckFn);

        describe('REJSON-RL', () => {
          requirements('rte.modules.rejson');
          before(async () => await rte.data.generateNReJSONs(300, false));

          [
            {
              name: 'Should filter by type (ReJSON-RL)',
              query: {
                cursor: '0',
                type: 'ReJSON-RL',
                count: 200,
              },
              responseSchema,
              checkFn: ({ body }) => {
                expect(body[0].total).to.gte(KEYS_NUMBER);
                expect(body[0].scanned).to.gte(200);
                expect(body[0].scanned % 200).to.lte(0);
                expect(body[0].cursor).to.not.eql(0);
                expect(body[0].keys.length).to.gte(200);
                expect(body[0].keys.length).to.lt(300);
                body[0].keys.map(key => expect(key.name).to.have.string('rejson_key_'));
                body[0].keys.map(key => expect(key.type).to.eql('ReJSON-RL'));
              }
            },
          ].map(mainCheckFn);
        });
        describe('TSDB-TYPE', () => {
          requirements('rte.modules.timeseries');
          before(async () => await rte.data.generateNTimeSeries(300, false));

          [
            {
              name: 'Should filter by type (timeseries)',
              query: {
                cursor: '0',
                type: 'TSDB-TYPE',
                count: 200,
              },
              responseSchema,
              checkFn: ({ body }) => {
                expect(body[0].total).to.gte(KEYS_NUMBER);
                expect(body[0].scanned).to.gte(200);
                expect(body[0].scanned % 200).to.lte(0);
                expect(body[0].cursor).to.not.eql(0);
                expect(body[0].keys.length).to.gte(200);
                expect(body[0].keys.length).to.lt(300);
                body[0].keys.map(key => expect(key.name).to.have.string('ts_key_'));
                body[0].keys.map(key => expect(key.type).to.eql('TSDB-TYPE'));
              }
            },
          ].map(mainCheckFn);
        });
        describe('Stream', () => {
          requirements('rte.version>=5.0');
          before(async () => await rte.data.generateNStreams(300, false));

          [
            {
              name: 'Should filter by type (stream)',
              query: {
                cursor: '0',
                type: 'stream',
                count: 200,
              },
              responseSchema,
              checkFn: ({ body }) => {
                expect(body[0].total).to.gte(KEYS_NUMBER);
                expect(body[0].scanned).to.gte(200);
                expect(body[0].scanned % 200).to.lte(0);
                expect(body[0].cursor).to.not.eql(0);
                expect(body[0].keys.length).to.gte(200);
                expect(body[0].keys.length).to.lt(300);
                body[0].keys.map(key => expect(key.name).to.have.string('st_key_'));
                body[0].keys.map(key => expect(key.type).to.eql('stream'));
              }
            },
          ].map(mainCheckFn);
        });
        describe('Graph', () => {
          requirements('rte.modules.graph');
          before(async () => await rte.data.generateNGraphs(300, false));

          [
            {
              name: 'Should filter by type (stream)',
              query: {
                cursor: '0',
                type: 'graphdata',
                count: 200,
              },
              responseSchema,
              checkFn: ({ body }) => {
                expect(body[0].total).to.gte(KEYS_NUMBER);
                expect(body[0].scanned).to.gte(200);
                expect(body[0].scanned % 200).to.lte(0);
                expect(body[0].cursor).to.not.eql(0);
                expect(body[0].keys.length).to.gte(200);
                expect(body[0].keys.length).to.lt(300);
                body[0].keys.map(key => expect(key.name).to.have.string('graph_key_'));
                body[0].keys.map(key => expect(key.type).to.eql('graphdata'));
              }
            },
          ].map(mainCheckFn);
        });
      });

      describe('Exact search on huge keys number', () => {
        requirements('rte.onPremise');
        // Number of keys to generate. Could be 10M or even more but consume much more time
        // We decide to generate 500K which should take ~10s
        const NUMBER_OF_KEYS = 500 * 1000;
        before(async () => await rte.data.generateHugeNumberOfTinyStringKeys(NUMBER_OF_KEYS, true));

        [
          {
            name: 'Should scan all types',
            query: {
              cursor: '0',
              match: 'k_488500'
            },
            responseSchema,
            checkFn: ({ body }) => {
              expect(body[0].total).to.eql(NUMBER_OF_KEYS);
              expect(body[0].scanned).to.eql(NUMBER_OF_KEYS);
              expect(body[0].cursor).to.eql(0);
              expect(body[0].keys.length).to.eql(1);
              expect(body[0].keys[0].name).to.eql('k_488500');
            }
          },
        ].map(mainCheckFn);
      });
    });
    describe('Cluster', () => {
      requirements('rte.type=CLUSTER');

      [
        {
          name: 'Should scan all types',
          query: {
            cursor: '0',
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
              expect(shard.scanned).to.eql(200);
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.eql(200 * result.numberOfShards);
            expect(result.keys.length).to.gte(200 * result.numberOfShards);
          }
        },
        {
          name: 'Should scan by provided count value',
          query: {
            count: 300,
            cursor: '0',
          },
          responseSchema,
          checkFn: ({ body }) => {
            const result = {
              total: 0,
              scanned: 0,
              keys: [],
              numberOfShards: 0,
            };

            body.map(shard => {
              result.total += shard.total;
              result.scanned += shard.scanned;
              result.keys.push(...shard.keys);
              result.numberOfShards++;
            });
            expect(result.total).to.eql(KEYS_NUMBER);
            expect(result.scanned).to.gte(300 * result.numberOfShards).lte(310 * result.numberOfShards);
            expect(result.keys.length).to.gte(300 * result.numberOfShards).lte(310 * result.numberOfShards);
          }
        },
      ].map(mainCheckFn);

      it('Should scan entire database', async () => {
        const keys = [];
        let scanned = 0;
        let cursor = ['0'];
        while (cursor.length > 0) {
          await validateApiCall({
            endpoint,
            query: {
              cursor: cursor.join('||'),
              count: 99,
            },
            checkFn: ({ body }) => {
              cursor = [];
              body.map(shard => {
                if (shard.cursor !== 0) {
                  cursor.push(`${shard.host}:${shard.port}@${shard.cursor}`);
                }
                scanned += shard.scanned;
                keys.push(...shard.keys);
              });
            },
          });
        }

        expect(keys.length).to.be.gte(KEYS_NUMBER);
        expect(cursor).to.eql([]);
        expect(scanned).to.be.gte(KEYS_NUMBER);
      });

      describe('Filter by type', () => {
        requirements('rte.version>=6.0');
        [
          {
            name: 'Should filter by type (string)',
            query: {
              cursor: '0',
              type: 'string',
              count: 200,
            },
            responseSchema,
            checkFn: ({ body }) => {
              const result = {
                total: 0,
                scanned: 0,
                keys: [],
                numberOfShards: 0,
              };

              body.map(shard => {
                result.total += shard.total;
                result.scanned += shard.scanned;
                result.keys.push(...shard.keys);
                result.numberOfShards++;
                expect(shard.scanned).to.gte(200);
                expect(shard.scanned).to.lte(KEYS_NUMBER);
              });
              expect(result.total).to.eql(KEYS_NUMBER);
              expect(result.scanned).to.gte(200 * result.numberOfShards);
              expect(result.keys.length).to.gte(200);
              result.keys.map(key => expect(key.name).to.have.string('str_key_'));
              result.keys.map(key => expect(key.type).to.eql('string'));
            }
          },
        ].map(mainCheckFn);
      });
    });
  });

  describe('ACL', () => {
    requirements('rte.acl');
    before(async () => await rte.data.generateKeys(true));
    before(async () => rte.data.setAclUserRules('~* +@all'));

    [
      {
        name: 'Should remove key',
        endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
        query: {
          cursor: '0',
        },
        statusCode: 200,
      },
      {
        name: 'Should throw error if no permissions for "scan" command',
        endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
        query: {
          cursor: '0',
        },
        statusCode: 403,
        responseBody: {
          statusCode: 403,
          error: 'Forbidden',
        },
        before: () => rte.data.setAclUserRules('~* +@all -scan')
      },
    ].map(mainCheckFn);
  });
});
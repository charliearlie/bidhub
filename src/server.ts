import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { MikroORM } from '@mikro-orm/core';
import { json } from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { buildSchema } from 'type-graphql';
import Redis from 'ioredis';
import connectRedis from 'connect-redis';

import mikroORMConfig from './mikro-orm.config';
import { __prod__ } from './constants';

import { ItemResolver } from './resolvers/item-resolver';
import { User } from './entities/User';
import { UserResolver } from './resolvers/user-resolver';
import { Item } from './entities/Item';

dotenv.config();

const main = async () => {
  const redis = Redis.createClient();
  const RedisStore = connectRedis(session);
  const orm = await MikroORM.init(mikroORMConfig);
  const migrator = orm.getMigrator();
  const migrations = await migrator.getPendingMigrations();
  if (migrations && migrations.length > 0) {
    await migrator.up();
  }

  const users = await orm.em.find(User, {});

  console.log(users);

  const items = await orm.em.find(Item, {});

  console.log({ items });

  const app = express();
  const httpServer = http.createServer(app);

  app.set('trust proxy', !__prod__);
  app.set('Access-Control-Allow-Origin', 'https://studio.apollographql.com');
  app.set('Access-Control-Allow-Credentials', true);

  app.use(
    session({
      name: 'qid',
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        sameSite: 'lax', // csrf
        secure: __prod__, // cookie only works in https
      },
    })
  );

  const server = new ApolloServer({
    schema: await buildSchema({
      resolvers: [ItemResolver, UserResolver],
    }),
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({
        embed: true,
        includeCookies: true,
      }),
    ],
  });
  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => ({
        em: orm.em,
        req,
        res,
        redis,
      }),
    })
  );

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 4000 }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:4000/graphql`);
};

main().catch((error) => console.error(error));

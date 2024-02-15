const{ ApolloServer, gql } = require('apollo-server-lambda');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const { Client } = require('pg');
const { JSONResolver } = require('graphql-scalars');
require('dotenv').config();

 const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'The JSON scalar type represents JSON objects as a string.',
  serialize(value) {
    return JSONResolver.serialize(value);
  },
  parseValue(value) {
    return JSONResolver.parseValue(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return JSONResolver.parseLiteral(ast);
    }
    return null;
  },
});

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
};

// GraphQL schema definition
const typeDefs = gql`
  scalar JSON

  type Product {
    product_id: ID
    product_details: JSON
    inventory_id: ID
  }

  type Query {
    getAllProducts: [Product]
  }

  
`;

const resolvers = {
  JSON: JSONScalar, 
  Query: {
    getAllProducts: async () => {
      const pgClient = new Client(dbConfig);

      try {
        await pgClient.connect();
        const query = 'SELECT * FROM product';
        const result = await pgClient.query(query);
        return result.rows.map(row => ({
          product_id: row.product_id,
          product_details: row.product_details,
          inventory_id: row.inventory_id
        }));
      } catch (error) {
        console.error("Error getting all products:", error.message);
        throw error;
      } finally {
        await pgClient.end();
      }
    }
  }
};
 

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.error(error);
    return error;
  },
});

exports.graphqlHandler = server.createHandler();
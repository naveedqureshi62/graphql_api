 const { ApolloServer, gql } = require('apollo-server-lambda');
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

 const typeDefs = gql`
  scalar JSON

  type Product {
    product_id: ID
    product_details: JSON
    inventory_id: ID
  }

  type Query {
    getProductById(product_id: ID!): Product
  }
 
`;

const resolvers = {
  JSON: JSONScalar,
  Query: {
    getProductById: async (_, { product_id }) => {
      const pgClient = new Client(dbConfig);

      try {
        await pgClient.connect();
        const query = 'SELECT * FROM product WHERE product_id = $1';
        const values = [product_id];
        const result = await pgClient.query(query, values);
        return result.rows[0];
      } catch (error) {
        console.error("Error fetching product by ID:", error.message);
        throw error;
      } finally {
        await pgClient.end();
      }
    },
  },
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
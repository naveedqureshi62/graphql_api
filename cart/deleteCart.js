const { ApolloServer, gql } = require('apollo-server-lambda');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const { Client } = require('pg');
const { JSONResolver } = require('graphql-scalars');
require('dotenv').config(); // Load environment variables


// Define custom scalar type for JSON
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

// Move database connection details to a separate configuration file
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

  type CartItem {
    cartitemid: ID
    customer_id: ID
    product_id: ID
    product_details: JSON
    total: Float
  }

  type Query {
    getAllCartitems: [CartItem]
    getCartitem(cartitemid: ID!): CartItem
  }

  type Mutation {
    deleteCartitem(cartitemid: ID!): Boolean
  }
`;

const resolvers = {
    JSON: JSONScalar, // Register custom scalar resolver
    Mutation: {
      deleteCartitem: async (_, { cartitemid }) => {
        const pgClient = new Client(dbConfig);
        try {
          await pgClient.connect();
  
          // Delete the cart item from the database
          const query = 'DELETE FROM Cart WHERE cartitemid = $1';
          const result = await pgClient.query(query, [cartitemid]);
  
          return true; // Return true if deletion is successful
        } catch (error) {
          console.error("Error deleting cart item:", error.message);
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
});

exports.graphqlHandler = server.createHandler();
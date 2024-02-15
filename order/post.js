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

  type Order {
    order_id: ID
    customer_id: ID
    order_details: JSON
  }

  type Query {
    getAllOrders: [Order]
  }

  type Mutation {
    addOrder(customer_id: ID!, order_details: JSON!): Order
  }
`;

const resolvers = {
  JSON: JSONScalar, // Register custom scalar resolver
  Query: {
    getAllOrders: async () => {
      const pgClient = new Client(dbConfig);

      try {
        await pgClient.connect();
        const result = await pgClient.query('SELECT * FROM orders');
        return result.rows;
      } catch (error) {
        console.error("Error fetching orders:", error.message);
        throw error;
      } finally {
        await pgClient.end();
      }
    },
  },

  Mutation: {
    addOrder: async (_, { customer_id, order_details }) => {
      const pgClient = new Client(dbConfig);

      try {
        await pgClient.connect();
        const query = 'INSERT INTO orders(customer_id, order_details) VALUES($1, $2) RETURNING *';
        const values = [customer_id, JSON.stringify(order_details)]; // Serialize JSON to string
        const result = await pgClient.query(query, values);
        return result.rows[0];
      } catch (error) {
        console.error("Error adding order:", error.message);
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
});

exports.graphqlHandler = server.createHandler();
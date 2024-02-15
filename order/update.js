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
    addOrder(order_id: ID!, customer_id: ID, order_details: JSON!): Order
    updateOrder(order_id: ID!, customer_id: ID, order_details: JSON!): Order
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
     
    updateOrder: async (_, { order_id, customer_id, order_details }) => {
      const pgClient = new Client(dbConfig);
  
      try {
        await pgClient.connect();
        const query = 'UPDATE orders SET customer_id = $1, order_details = $2 WHERE order_id = $3 RETURNING *';
        const values = [customer_id, JSON.stringify(order_details), order_id];
        const result = await pgClient.query(query, values);
        return result.rows[0];
      } catch (error) {
        console.error("Error updating order:", error.message);
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
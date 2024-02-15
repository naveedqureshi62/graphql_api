 const { ApolloServer, gql } = require('apollo-server-lambda');
const { Client } = require('pg');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
};

 const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'The JSON scalar type represents JSON objects as a string.',
  serialize(value) {
    return JSON.stringify(value);
  },
  parseValue(value) {
    return JSON.parse(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    return null;
  },
});

 const typeDefs = gql`
  scalar JSON

  type Product {
    product_id: ID
    product_details: JSON
    inventory_id: ID
  }
  type Query {
    dummyQuery: String # Add a dummy query
  }

  type Mutation {
    deleteProduct(product_id: ID!): Product
  }
`;

const resolvers = {
  JSON: JSONScalar,

  Mutation: {
    deleteProduct: async (_, { product_id }) => {
      const pgClient = new Client(dbConfig);

      try {
        await pgClient.connect();
        const query = 'DELETE FROM product WHERE product_id = $1 RETURNING *';
        const values = [product_id];
        const result = await pgClient.query(query, values);

        if (result.rows.length === 0) {
          throw new Error("Product not found");
        }

        return result.rows[0];
      } catch (error) {
        console.error("Error deleting product:", error.message);
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
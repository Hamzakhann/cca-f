import { runAgent } from "./loop.js";

const tools = [
  {
    name: "get_customer",
    description: "Get customer details by customer ID.",
    input_schema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "The unique ID of the customer (e.g. C-1001)",
        },
      },
      required: ["customer_id"],
    },
  },
];

const toolExecutors = {
  get_customer: async ({ customer_id }) => {
    const customers = {
      "C-1001": { id: "C-1001", name: "Alice Smith", status: "Active" },
    };
    return customers[customer_id] || { error: "Customer not found" };
  },
};

async function main() {
  try {
    await runAgent("What is the name of customer C-1001?", tools, toolExecutors);
  } catch (error) {
    console.error("Error running agent:", error);
  }
}

main();

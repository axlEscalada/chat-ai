const mongoose = require("mongoose")
const request = require("supertest")
const app = require("../index")

require("dotenv").config();

describe("POST /chats/", () => {
  test("should return chats by sesssionid", async () => {
    return request(app)
  });
});

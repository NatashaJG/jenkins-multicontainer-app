const request = require("supertest");
const { app } = require("../../src/app");

describe("Pruebas Unitarias - API", () => {

    test("GET / debe responder correctamente", async () => {

        const response = await request(app)
            .get("/")
            .expect(200);

        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toBe(
            "Aplicación Jenkins MultiContainer funcionando"
        );

    });

    test("GET /health debe retornar estado saludable", async () => {

        const response = await request(app)
            .get("/health")
            .expect(200);

        expect(response.body).toHaveProperty("status");
        expect(response.body.status).toBe("healthy");

        expect(response.body).toHaveProperty("timestamp");

        expect(response.body).toHaveProperty("services");

        expect(response.body.services).toHaveProperty("postgres");
        expect(response.body.services).toHaveProperty("redis");

    });

    test("POST /users sin datos debe retornar 400", async () => {

        const response = await request(app)
            .post("/users")
            .send({})
            .expect(400);

        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toBe(
            "Nombre y correo son obligatorios"
        );

    });

    test("POST /users con nombre solamente debe retornar 400", async () => {

        const response = await request(app)
            .post("/users")
            .send({
                name: "Juan"
            })
            .expect(400);

        expect(response.body).toHaveProperty("error");

    });

    test("POST /users con correo solamente debe retornar 400", async () => {

        const response = await request(app)
            .post("/users")
            .send({
                email: "juan@test.com"
            })
            .expect(400);

        expect(response.body).toHaveProperty("error");

    });

});
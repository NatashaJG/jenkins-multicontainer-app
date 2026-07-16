const request = require("supertest");

const {
  app,
  pool,
  redisClient,
  connectRedis,
  initializeDatabase,
} = require("../../src/app");


describe("Pruebas de Integración", () => {


  beforeAll(async () => {

    await connectRedis();

    await initializeDatabase();

  });



  beforeEach(async () => {

    // Limpia PostgreSQL antes de cada prueba
    await pool.query(
      "TRUNCATE TABLE users RESTART IDENTITY CASCADE"
    );


    // Limpia Redis antes de cada prueba
    if (redisClient.isOpen) {

      await redisClient.flushAll();

    }

  });



  afterAll(async () => {


    try {

      await pool.query(
        "DROP TABLE IF EXISTS users"
      );


    } catch (err) {}



    await pool.end();



    if (redisClient.isOpen) {

      await redisClient.quit();

    }


  });





  test("Debe crear un usuario en PostgreSQL", async () => {


    const user = {

      name: "Juan Pérez",

      email: "juan@test.com",

    };



    const response = await request(app)

      .post("/users")

      .send(user)

      .expect(201);



    expect(response.body).toHaveProperty("id");

    expect(response.body.name)
      .toBe(user.name);


    expect(response.body.email)
      .toBe(user.email);




    const result = await pool.query(

      "SELECT * FROM users WHERE id = $1",

      [
        response.body.id
      ]

    );



    expect(result.rows.length)
      .toBe(1);


  });







  test("Debe obtener un usuario desde PostgreSQL", async () => {


    const user = {

      name: "María",

      email: "maria@test.com",

    };



    const create = await request(app)

      .post("/users")

      .send(user);



    const response = await request(app)

      .get(`/users/${create.body.id}`)

      .expect(200);




    expect(response.body.source)

      .toBe("database");



    expect(response.body.data.name)

      .toBe(user.name);



  });









  test("Debe obtener un usuario desde Redis en la segunda petición", async () => {


    const user = {

      name: "Carlos",

      email: "carlos@test.com",

    };



    const create = await request(app)

      .post("/users")

      .send(user);




    const id = create.body.id;





    const first = await request(app)

      .get(`/users/${id}`)

      .expect(200);




    expect(first.body.source)

      .toBe("database");







    const second = await request(app)

      .get(`/users/${id}`)

      .expect(200);




    expect(second.body.source)

      .toBe("cache");



  });









  test("Debe retornar 404 cuando el usuario no existe", async () => {



    const response = await request(app)

      .get("/users/99999")

      .expect(404);




    expect(response.body.error)

      .toBe("Usuario no encontrado");



  });



});
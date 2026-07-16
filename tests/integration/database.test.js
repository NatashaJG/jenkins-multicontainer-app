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


    // Limpiar PostgreSQL

    await pool.query(
      "DELETE FROM users"
    );


    // Limpiar Redis

    if(redisClient.isOpen){

      await redisClient.flushAll();

    }


  });



  afterAll(async () => {


    try{

      await pool.query(
        "DROP TABLE IF EXISTS users"
      );

    }catch(err){}



    await pool.end();



    if(redisClient.isOpen){

      await redisClient.quit();

    }


  });



  test("Debe crear un usuario en PostgreSQL", async()=>{


    const user = {

      name:"Juan Pérez",

      email:`juan_${Date.now()}@test.com`

    };



    const response = await request(app)

      .post("/users")

      .send(user)

      .expect(201);



    expect(response.body)
      .toHaveProperty("id");



    expect(response.body.name)
      .toBe(user.name);



    expect(response.body.email)
      .toBe(user.email);



    const result = await pool.query(

      "SELECT * FROM users WHERE id=$1",

      [
        response.body.id
      ]

    );



    expect(result.rows.length)
      .toBe(1);


  });





  test("Debe obtener un usuario desde PostgreSQL", async()=>{


    const user = {

      name:"María",

      email:`maria_${Date.now()}@test.com`

    };



    const create = await request(app)

      .post("/users")

      .send(user)

      .expect(201);



    const id =
      create.body.id;



    // Confirmar que Redis no tiene información

    if(redisClient.isOpen){

      await redisClient.del(
        `user:${id}`
      );

    }



    const response = await request(app)

      .get(`/users/${id}`)

      .expect(200);



    expect(response.body.source)
      .toBe("database");



    expect(response.body.data.name)
      .toBe(user.name);



  });





  test("Debe obtener un usuario desde Redis en la segunda petición", async()=>{


    const user = {

      name:"Carlos",

      email:`carlos_${Date.now()}@test.com`

    };



    const create = await request(app)

      .post("/users")

      .send(user)

      .expect(201);



    const id =
      create.body.id;



    // Primera petición debe ir a PostgreSQL

    const first = await request(app)

      .get(`/users/${id}`)

      .expect(200);



    expect(first.body.source)

      .toBe("database");



    // Segunda petición debe salir de Redis

    const second = await request(app)

      .get(`/users/${id}`)

      .expect(200);



    expect(second.body.source)

      .toBe("cache");



    expect(second.body.data.name)

      .toBe(user.name);



  });





  test("Debe retornar 404 cuando el usuario no existe", async()=>{


    const response = await request(app)

      .get("/users/99999")

      .expect(404);



    expect(response.body.error)

      .toBe("Usuario no encontrado");


  });



});
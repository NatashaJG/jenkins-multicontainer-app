const express = require("express");
const { Pool } = require("pg");
const { createClient } = require("redis");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


/* ============================
   PostgreSQL
============================ */

const pool = new Pool({

  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "testdb",
  user: process.env.DB_USER || "testuser",
  password: process.env.DB_PASSWORD || "testpass"

});


/* ============================
   Redis
============================ */

const redisClient = createClient({

  url:
    `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`

});


redisClient.on("error", (err)=>{

  console.error(
    "❌ Redis:",
    err.message
  );

});


async function connectRedis(){

  try{

    if(!redisClient.isOpen){

      await redisClient.connect();

      console.log(
        "✅ Redis conectado"
      );

    }

  }catch(error){

    console.error(
      "Error conectando Redis:",
      error.message
    );

  }

}



/* ============================
   Inicializar Base de Datos
============================ */

async function initializeDatabase(){

  try{

    await pool.query(`

      CREATE TABLE IF NOT EXISTS users(

        id SERIAL PRIMARY KEY,

        name VARCHAR(100) NOT NULL,

        email VARCHAR(100) UNIQUE NOT NULL

      );

    `);


    console.log(
      "✅ Tabla users lista"
    );


  }catch(err){

    console.error(
      "Error inicializando BD:",
      err.message
    );

  }

}



/* ============================
   Health Check
============================ */

app.get("/health", async(req,res)=>{


  let dbStatus = false;


  try{

    await pool.query(
      "SELECT NOW()"
    );

    dbStatus = true;


  }catch{}



  res.json({

    status:"healthy",

    timestamp:
      new Date().toISOString(),

    services:{

      postgres:
        dbStatus,

      redis:
        redisClient.isOpen

    }

  });


});



/* ============================
   Crear Usuario
============================ */

app.post("/users", async(req,res)=>{


  const {
    name,
    email
  } = req.body;



  if(!name || !email){

    return res.status(400).json({

      error:
        "Nombre y correo son obligatorios"

    });

  }



  try{


    const result = await pool.query(

      `

      INSERT INTO users(name,email)

      VALUES($1,$2)

      RETURNING *

      `,

      [
        name,
        email
      ]

    );



    const user =
      result.rows[0];



    /*
      IMPORTANTE:

      No guardar en Redis aquí.

      La primera consulta GET
      debe salir desde PostgreSQL.

    */



    res.status(201).json(user);



  }catch(err){


    res.status(500).json({

      error:
        err.message

    });


  }


});



/* ============================
   Obtener Usuario
============================ */

app.get("/users/:id", async(req,res)=>{


  const id =
    req.params.id;



  /*
      1. Buscar en Redis
  */


  try{


    if(redisClient.isOpen){


      const cached =
        await redisClient.get(
          `user:${id}`
        );



      if(cached){


        return res.json({

          source:
            "cache",

          data:
            JSON.parse(cached)

        });


      }

    }


  }catch(err){

    console.error(
      "Error Redis:",
      err.message
    );

  }




  /*
      2. Buscar en PostgreSQL
  */


  try{


    const result =
      await pool.query(

        `

        SELECT *

        FROM users

        WHERE id=$1

        `,

        [
          id
        ]

      );



    if(result.rows.length === 0){


      return res.status(404).json({

        error:
          "Usuario no encontrado"

      });


    }



    const user =
      result.rows[0];



    /*
       3. Guardar después
          de consultar PostgreSQL
    */


    try{


      if(redisClient.isOpen){


        await redisClient.set(

          `user:${id}`,

          JSON.stringify(user)

        );


      }


    }catch(err){}



    res.json({

      source:
        "database",

      data:
        user

    });



  }catch(err){


    res.status(500).json({

      error:
        err.message

    });


  }


});



/* ============================
   Ruta principal
============================ */

app.get("/",(req,res)=>{


  res.json({

    message:
      "Aplicación Jenkins MultiContainer funcionando"

  });


});



/* ============================
   Inicio servidor
============================ */

async function startServer(){


  await initializeDatabase();

  await connectRedis();



  app.listen(
    PORT,
    ()=>{

      console.log(
        `🚀 Servidor iniciado en http://localhost:${PORT}`
      );

    }
  );


}



if(require.main === module){

  startServer();

}



/* ============================
   Exportaciones Jest
============================ */

module.exports = {

  app,

  pool,

  redisClient,

  connectRedis,

  initializeDatabase

};
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


redisClient.on("error",(err)=>{

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
   Base de Datos
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
   Health
============================ */

app.get("/health",async(req,res)=>{


  let postgres=false;

  let redis=false;


  try{

    await pool.query(
      "SELECT NOW()"
    );

    postgres=true;


  }catch{}



  redis =
    redisClient.isOpen;



  res.json({

    status:"healthy",

    timestamp:
      new Date().toISOString(),

    services:{

      postgres,

      redis

    }

  });


});



/* ============================
   Crear Usuario
============================ */

app.post("/users",async(req,res)=>{


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


    const result =
      await pool.query(

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


    res.status(201)
       .json(result.rows[0]);



  }catch(err){


    res.status(500)
       .json({

        error:
        err.message

       });


  }


});



/* ============================
   Obtener Usuario
============================ */

app.get("/users/:id",async(req,res)=>{


  const id=req.params.id;



  /*
     Solo usar Redis cuando existe
     una caché válida.
  */


  try{


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



  }catch(err){}



  /*
      Buscar en PostgreSQL
  */


  try{


    const result =
      await pool.query(

      `

      SELECT *

      FROM users

      WHERE id=$1

      `,

      [id]

    );



    if(result.rows.length===0){


      return res.status(404)
      .json({

        error:
        "Usuario no encontrado"

      });


    }



    const user =
      result.rows[0];



    /*
       Guardar solamente después
       de obtener de BD
    */


    try{


      await redisClient.set(

        `user:${id}`,

        JSON.stringify(user),

        {

          EX:
          300

        }

      );


    }catch(err){}



    res.json({

      source:
      "database",

      data:
      user

    });



  }catch(err){


    res.status(500)
    .json({

      error:
      err.message

    });


  }


});



/* ============================
   Inicio
============================ */

app.get("/",(req,res)=>{


  res.json({

    message:
    "Aplicación Jenkins MultiContainer funcionando"

  });


});




async function startServer(){


  await initializeDatabase();

  await connectRedis();



  app.listen(

    PORT,

    ()=>console.log(

      `🚀 Servidor iniciado en http://localhost:${PORT}`

    )

  );


}



if(require.main===module){

  startServer();

}



/* ============================
   Jest
============================ */

module.exports={

  app,

  pool,

  redisClient,

  connectRedis,

  initializeDatabase

};
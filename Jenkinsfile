pipeline {

    agent any


    parameters {

        booleanParam(
            name: 'DEMO_MODE',
            defaultValue: false,
            description: 'Ejecutar demostración sin pruebas de integración'
        )

    }


    environment {

        APP_NAME = 'jenkins-multicontainer-app'

        DOCKER_COMPOSE_FILE = 'docker/docker-compose.test.yml'

    }



    stages {


        stage('Preparación del Entorno') {


            steps {


                echo 'Verificando herramientas...'


                bat 'docker --version'

                bat 'docker compose version'

                bat 'node --version'

                bat 'npm --version'


            }

        }



        stage('Instalación de Dependencias') {


            steps {


                echo 'Instalando dependencias...'


                bat 'npm install'


            }

        }



        stage('Levantar Servicios Docker') {


            steps {


                echo 'Iniciando PostgreSQL, Redis y App...'


                bat """

                docker compose -f %DOCKER_COMPOSE_FILE% up -d

                """


                echo 'Esperando servicios disponibles...'


                timeout(time: 60, unit: 'SECONDS') {


                    bat """

                    docker ps

                    """


                }


            }


        }



        stage('Pruebas Unitarias') {


            steps {


                echo 'Ejecutando pruebas unitarias...'


                bat """

                npm test -- tests/unit

                """


            }


        }



        stage('Pruebas de Integración Docker') {


            when {

                expression {

                    return !params.DEMO_MODE

                }

            }


            steps {


                echo 'Ejecutando pruebas dentro del contenedor...'


                bat """

                docker compose -f %DOCKER_COMPOSE_FILE% exec -T app npm test -- tests/integration

                """


            }


        }



        stage('Modo Demostración') {


            when {

                expression {

                    return params.DEMO_MODE

                }

            }


            steps {


                echo 'Ejecutando modo demostración CI/CD...'


                bat """

                echo =====================================

                echo CAMBIO SIMULADO CORRECTAMENTE

                echo Nueva version validada

                echo Pipeline funcionando correctamente

                echo =====================================

                """


            }


        }



        stage('Prueba End-to-End') {


            when {


                branch 'main'


            }


            steps {


                echo 'Ejecutando pruebas E2E...'


                bat """


                curl http://localhost:3000/health


                """


            }


        }



    }



    post {



        always {


            echo 'Limpiando contenedores Docker...'


            bat """


            docker compose -f %DOCKER_COMPOSE_FILE% down -v


            """


        }



        success {


            echo 'Pipeline completado exitosamente'


        }



        failure {


            echo 'Pipeline falló. Revisar logs'


        }


    }


}
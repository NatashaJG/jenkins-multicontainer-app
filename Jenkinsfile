pipeline {

    agent any

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


        stage('Pruebas Unitarias') {

            steps {

                echo 'Ejecutando pruebas unitarias...'

                bat 'npm test'

            }

        }


        stage('Pruebas de Integración Docker Compose') {

            steps {

                echo 'Levantando servicios Docker...'


                bat """
                docker compose -f %DOCKER_COMPOSE_FILE% up -d
                """


                echo 'Esperando servicios...'

                timeout(time: 60, unit: 'SECONDS') {

                    bat """
                    docker ps
                    """

                }


                echo 'Ejecutando pruebas dentro del contenedor...'


                bat """
                docker compose -f %DOCKER_COMPOSE_FILE% exec -T app npm test
                """


            }


            post {

                always {

                    echo 'Limpiando contenedores...'


                    bat """
                    docker compose -f %DOCKER_COMPOSE_FILE% down -v
                    """

                }

            }

        }


        stage('Prueba End-to-End') {


            when {

                branch 'main'

            }


            steps {


                echo 'Ejecutando pruebas E2E...'


                bat """

                docker compose -f %DOCKER_COMPOSE_FILE% up -d

                timeout /t 10


                curl http://localhost:3000/health

                """


            }


            post {

                always {

                    bat """

                    docker compose -f %DOCKER_COMPOSE_FILE% down -v

                    """

                }

            }

        }

    }


    post {


        success {

            echo 'Pipeline completado exitosamente'

        }


        failure {

            echo 'Pipeline falló. Revisar logs'

        }


        always {

            echo 'Limpieza del workspace'

        }

    }

}
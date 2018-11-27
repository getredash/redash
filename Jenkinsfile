def gitCommit = ""
def imageTag = ""
def networkName = ""
def ALL_PYTHON_FILES = ""

node('ci') {
  properties([disableConcurrentBuilds()])
    networkName = env.BUILD_TAG.bytes.encodeHex().toString()

    withEnv([
        "COMPOSE_PROJECT_NAME=${networkName}"
    ]) {
      try {

        stage('setup') {
          sh """
            """
        }

        stage('checkout') {
          checkout scm
            gitCommit = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
            imageTag = "registry.tapingo.com/tapingo/redash5:${env.BRANCH_NAME}-${gitCommit}"
            validateJira()
        }

        stage('build image') {
          sh """
            git clean -xdf
            mkdir ./out/
            docker build -t ${imageTag} --target test -f deployment/Dockerfile .
            """
        }

        stage('push image') {
            sh "docker push ${imageTag}"
        }

      } finally {
        junit allowEmptyResults: true, testResults: 'out/test*.xml'
        sh """
        """
      }
    }
}

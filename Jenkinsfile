// library is loaded from github.com/wkda/jenkins-libraries-devops
@Library('devops@v0.5.x') _

pipeline {
    agent {
        node {
            label "docker-builder"
        }
    }

    parameters {

        choice(
                name: 'ENV_NAME',
                choices: ["qa", "prod"],
                description: "(Only if DEPLOY is selected) Define which environment to deploy"
        )
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
    }

    stages {
      stage('Read tfvars into file') {
        steps {
                // Set variables if not defined
                script {
                    if (env.ENV_NAME == null) env.ENV_NAME = "qa"
                    if (env.VERSION == null) env.VERSION = "latest"
                    env.TF_VAR_app_version = env.VERSION == "latest" ? GIT_COMMIT.take(7) : env.VERSION.trim()
                    env.TF_VAR_service_name = "bi-redashv10"
                    env.ECS_SERVICE = env.TF_VAR_service_name
                    env.RELEASE_VERSION = env.RELEASE_VERSION?.trim()
                }
                // loaded from shared library
                loadTfVars()
            }
        }

        stage('Push docker image') {
            steps {
                // loaded from shared library
                createECRRepo("bi-redashv10")
                script {
                  env.REGISTRY = "${env.aws_account_id}.dkr.ecr.${env.aws_default_region}.amazonaws.com"
                  env.IMAGE = "${env.REGISTRY}/${env.ECS_SERVICE}"
                  sh 'printenv'
                  dir("docker") {
                    sh "ls"
                    sh "docker build . -t ${IMAGE}:${TF_VAR_app_version}"
                    echo "** Pushing docker image"
                    sh "docker push ${IMAGE}:${TF_VAR_app_version}"
                  }

                }
            }
        }

        // stage('Plan terraform') {
        //     steps {
        //         // loaded from shared library
        //         passTfEnv('INFO_VERSION', "${TF_VAR_app_version}")
        //         passTfEnv('BUILD', "${BUILD_NUMBER}")
        //         planTerraform13()
        //     }
        // }
        //
        // stage('Apply terraform') {
        //     steps {
        //         sh('''#!/bin/bash -ex
        //         cd terraform
        //         terraform13 apply ecs-deploy.plan
        //         echo "Cleanup"
        //         git checkout -- .
        //         rm -v ecs-deploy.plan
        //         ''')
        //     }
        // }

        // stage('ECS wait for deploy') {
        //     steps {
        //         sh('''
        //             #!/bin/bash
        //             aws ecs wait services-stable --region ${AWS_DEFAULT_REGION} --cluster ${CLUSTER} --services ${ECS_SERVICE}
        //         ''')
        //     }
        // }

    }



// In addition to email you can use slack notifications
// check https://jenkins.qa.auto1.team/pipeline-syntax/ for slackSend step
    post {
        success {
            echo 'success'
        }
        failure {
            echo 'failure'
        }
    }
}

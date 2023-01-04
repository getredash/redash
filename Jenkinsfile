// library is loaded from github.com/wkda/jenkins-libraries-devops
@Library('devops@v0.5.x') _

pipeline {
    agent {
        node {
            label "docker-builder"
        }
    }

    environment {
        ENV_NAME = "${JENKINS_URL.contains("qa") ? "qa" : "prod"}"
        VAULT_ADDR = "${JENKINS_URL.contains("qa") ? "https://vault.qa.auto1.team " : "https://vault.prod.auto1.team"}"
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
                    if (env.VERSION == null) env.VERSION = "latest"
                    env.TF_VAR_app_version = env.VERSION == "latest" ? GIT_COMMIT.take(7) : env.VERSION.trim()
                    env.TF_VAR_service_name = "bi-redashv10"
                    env.ECS_SERVICE = env.TF_VAR_service_name
                    env.RELEASE_VERSION = env.RELEASE_VERSION?.trim()
                    env.TF_VAR_vault_address = env.VAULT_ADDR
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
                  sh "ls"
                  sh "docker build . -t ${IMAGE}:${TF_VAR_app_version}"
                  echo "** Pushing docker image"
                  sh "docker push ${IMAGE}:${TF_VAR_app_version}"

                  REDASH_NGINX_IMAGE_CHECK=`docker pull \$REGISTRY/\${ECS_SERVICE}/redash-nginx:latest > /dev/null && echo "success" || echo "failed"`
                    if [ "${REDASH_NGINX_IMAGE_CHECK}" = "failed" ] ; then
                    	echo "** Building nginx docker image"
                    	docker build --pull --force-rm -t \$REGISTRY/\${GIT_REPO_NAME}/redash-nginx:latest -f Dockerfile_nginx
                    	echo "Pushing docker image"
                    	docker push \$REGISTRY/\${ECS_SERVICE}/redash-nginx:latest
                    fi
                }
            }
        }

        stage('Plan terraform') {
            steps {
                // loaded from shared library
                passTfEnv('INFO_VERSION', "${TF_VAR_app_version}")
                passTfEnv('BUILD', "${BUILD_NUMBER}")
                planTerraform13()
            }
        }

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

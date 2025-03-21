# Redash Easiware

## Setup

Créer un fichier `.env` à la racine en définissant les variables `REDASH_COOKIE_SECRET` et `REDASH_SECRET_KEY`.

Suivre: https://github.com/getredash/redash/wiki/Local-development-setup
sauf la dernière section sur le développement de python en local, qui n'est pas nécessaire et est compliqué à mettre en place.

S'assurer ensuite que tous les containers sont sur le même network et peuvent communiquer (pour que redash accède à la base Postgres de l'application):

```sh
docker network inspect easiware-start-network -f '{{range .Containers}}{{println .IPv4Address "\t" .Name}}{{end}}'
```

Au premier lancement de l'interface, on crée un utilisateur admin dont on récupèrera la clé d'API.

On crée ensuite une datasource correspondant à la base de donnée Easiware:
Dans le champ Host, il vaut mieux se servir du DNS de Docker en passant le nom du container de la base Easiware: 'postgres' en principe.

## Lancement

Pour simplement relancer le projet:

```sh
docker compose up -d
```

L'application met quelques secondes à être accessible lors du démarrage.

## Modfication

A chaque modification du code, pour voir les changements:

```sh
make build && make compose_build && docker compose restart server
```

## Synchronisation upstream

Ajouter le repo originel pour récupérer si nécessaire les mises à jour:

```sh
git remote add upstream git@github.com:getredash/redash.git
```

On préfèrera récupérer les mises à jour de versions stables, en rebasant des tags spécifiques:

```sh
git pull --rebase upstream v25.1.0
```

## Convention commit

Préfixer nos commits avec 'easiware:' afin de bien distinguer nos modifications de celles de l'upstream.


# Pushing Docker image into Scaleway container repository

1. An acces to Scaleway console is mandatory.

https://www.scaleway.com/en/docs/identity-and-access-management/organizations-and-projects/how-to/create-ssh-key/

2. Api-keys are mandatories

https://www.scaleway.com/en/docs/iam/how-to/create-api-keys/

## Build Docker images

Build the same version of Docker images for all environment (preview, staging, production).
```bash
 build-all-dockerImg.sh
```

### just for preview
```bash
 ./build-push-dockerImg.sh preview
 # with version for tag image = "redash:2025.03.21-22.48.42"
 ./build-push-dockerImg.sh preview 2025.03.21-22.48.42
```

## just  staging
```bash
 ./build-push-dockerImg.sh staging
```

## just production
```bash
 ./build-push-dockerImg.sh production
```


<p align="center">
  <img title="Redash" src='https://github.com/freaker2k7/redash/blob/master/client/app/assets/images/logo.png?raw=true' width="200px"/>
</p>

[![Documentation](https://img.shields.io/badge/docs-redash.io/help-brightgreen.svg)](https://redash.io/help/)
[![GitHub Build](https://github.com/freaker2k7/redash/actions/workflows/ci.yml/badge.svg)](https://github.com/freaker2k7/redash/actions)

Redash is an amazing open source tool for querying and visualizing data. It allows you to connect to any data source, easily visualize and share your data, and collaborate with your team.
For more information, please visit [Redash GitHub repository](https://github.com/getredash/redash).

**This fork adds support for AI.**

**New** Redash features:

1. **Data Source Description**: Help the AI to understand your data better.
2. **Text To Query**: Use AI to generate SQL, NoSQL and other queries from natural language questions.
3. **Auto Visualizations**: Use AI to auto-generate visualizations for questions.
4. **Auto Alerts**: Use AI to generate alert suggestions from your data and queries.
5. **Name To Dashboard**: Use AI to generate dashboards from your queries and visualizations.
6. **MacOS Support**: Now it runs on MacOS as well as on Linux.
7. **Memcached Support**: Added Memcached as a supported data source.

### Demo video

Watch the demo video on YouTube to see the new AI features in action.

[![Watch the demo video](https://img.youtube.com/vi/oV6WXlqXe54/hqdefault.jpg)](https://www.youtube.com/watch?v=oV6WXlqXe54)<br>
<sub>*NOTICE: All tests were run on a local PC.*</sub>

## Supported AI Providers

- [Anthropic](https://www.anthropic.com/) [Cloud]
- [DeepSeek](https://www.deepseek.com/) [Cloud, Local & Remote]
- [Gemini](https://gemini.google.com/) [Cloud]
- [Grok](https://grok.com/) [Cloud]
- [HuggingFace](https://huggingface.co/) [Local]
- [OLlama](https://ollama.com/) [Cloud, Local & Remote]
- [OpenAI](https://openai.com/) [Cloud]
- [OpenRouter](https://openrouter.ai/) [Cloud]

## Installation

### Prerequisites

* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose](https://docs.docker.com/compose/install/)
* [Node.js](https://nodejs.org/en/download/)
* [Python](https://www.python.org/downloads/)
* [Make](https://www.gnu.org/software/make/)
* [Nginx](https://nginx.org/en/download.html) (Optional, for reverse proxy setup)

See [Redash's Prerequisites](https://github.com/getredash/redash/wiki/Local-development-setup#set-up-the-prerequisites) for detailed instructions on how to install the prerequisites.

### Installation Steps

#### 1. Clone the repository:

```bash
git clone https://github.com/freaker2k7/redash
```

#### 2. Navigate to the project directory:

```bash
cd redash
```

#### 3. Install dependencies and set up the environment:

```bash
make local_init
```

#### 4. Set up the `.env` file which was created during the installation process.

```
REDASH_COOKIE_SECRET=1234....1234
REDASH_SECRET_KEY=1234...1235
HF_TOKEN=hf_1234...1234
```

#### 5. Start the Redash server and client:

```bash
make local_run
```

Alternatively, you can run the server and client separately:

```bash
# Run the server
make up
# Run the client
make start
```

*NOTE: This is useful if you want to run the server and client in separate machines.*
while [[ $(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001) -ne 200 ]]; do; sleep 1; done
#### 6. Open your web browser and go to http://localhost:5001 to access Redash.

#### 7. (Optional) Set up a reverse proxy to host Redash with optionally enabling HTTPS:

Install Nginx if you haven't already - [Nginx Installation Guide](https://nginx.org/en/docs/install.html)

Then add the following configuration as `redash.conf` to your Nginx configuration folder (usually located at `/etc/nginx/conf.d/`):

```nginx
server {
	listen 80;

	server_name yourdomain.com;

	# If you want only HTTP, then remove from this comment...
	return 301 https://$host$request_uri;
}

server {
	listen 443 ssl;

	server_name yourdomain.com;

	ssl_certificate /path/to/your/certificate.crt;
	ssl_certificate_key /path/to/your/private.key;
	# ... up to this comment.

	while [[ $(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001) -ne 200 ]]; do; sleep 1; done
		proxy_pass http://localhost:5001;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}
}
```

*NOTE: This step is suited only for on-premise installations. If you are using a cloud provider, think about using their load balancer or reverse proxy service instead.*

## TL;DR

Quick installation steps for those who want to get started with Redash quickly:

```bash
git clone https://github.com/freaker2k7/redash
cd redash
make quickstart
```

*NOTE: This will take a few good minutes to complete. Once done, you can access Redash at http://localhost:5001. Meanwhile, you can get some coffee.*

## Stopping Redash

To stop Redash, run the following command in the project directory:

```bash
make down
```

Also, you can clean up a bit by running, in the project directory:

```bash
make clean
```

## Bonus: MacOS Support

Now there is a helper Ubuntu docker in `/macos-helper` which assists with installing the python dependencies.
Moreover it has an RDP support, so one can use Microsoft Remote Desktop Manager to access the Ubuntu GUI and work on the Redash server and client from there.

You can build the helper docker with the following command:

```bash
docker build -t macos-install-helper ./macos-helper
```

Then run it with the following command:

```bash
docker run -d -p 3389:3389 -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd):/home/redash/redash --name ubuntu macos-install-helper /entrypoint.sh rdp
```

Finally, you can connect to the Ubuntu GUI with the following credentials:

```
Username: redash
Password: 1234
Host: localhost
Port: 3389
```

## Getting Help

* Issues: https://github.com/freaker2k7/redash/issues

## Security

Please email [me](mailto:thenetfreaker+security@gmail.com) to report any security vulnerabilities regarding the AI feature explicitly. We will acknowledge receipt of your vulnerability and strive to send you regular updates about our progress. If you're curious about the status of your disclosure please feel free to email us again. For any other issue, please issue or PR to the [Redash GitHub repository](https://github.com/getredash/redash).

## License

BSD-2-Clause.

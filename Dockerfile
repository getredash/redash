FROM debian:stretch

RUN apt-get update && apt-get install -y \
    apt-utils \
    procps \
    wget \
    python-pip \
    python-dev \
    curl \
    build-essential \
    pwgen \
    libffi-dev \
    libssl-dev \
    default-libmysqlclient-dev \
    libpq-dev \
    freetds-dev \
    libsasl2-dev \
    xmlsec1

RUN adduser --gecos "" --disabled-login redash 

RUN mkdir -p /opt/redash && \
    chown redash /opt/redash
#RUN wget "https://s3.amazonaws.com/redash-releases/redash.3.0.0.b3134.tar.gz" -O "/tmp/redash.tar.gz" && \
#    tar -C "/opt/redash/" -xvf "/tmp/redash.tar.gz"

RUN pip install --upgrade pip==9.0.3

USER redash

WORKDIR /opt/redash/

RUN echo "export PATH=$PATH:/home/redash/.local/bin" >> ~/.bashrc 

ADD ./requirements*txt /opt/redash/

RUN pip install --user setproctitle
RUN pip install --user -r requirements.txt
RUN pip install --user -r requirements_all_ds.txt
RUN pip install --user --upgrade pyasn1-modules
RUN pip install --user pandas

USER root

ADD . /opt/redash/

ADD https://releases.hashicorp.com/envconsul/0.6.2/envconsul_0.6.2_linux_amd64.tgz /tmp/
RUN tar -xf /tmp/envconsul* -C /bin && rm /tmp/envconsul*

RUN ln -s /home/redash/.local/bin/celery /usr/bin/celery

RUN ln -fs /usr/share/zoneinfo/Asia/Jakarta /etc/localtime && dpkg-reconfigure -f noninteractive tzdata

USER redash

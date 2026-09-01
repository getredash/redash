FROM ubuntu:24.04

EXPOSE 3389/tcp

ARG USER=redash
ARG PASS=1234
ARG X11Forwarding=false

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install tzdata and set the timezone to UTC
RUN DEBIAN_FRONTEND=noninteractive apt update && \
    apt install -y tzdata && \
    echo "Etc/UTC" > /etc/timezone && \
    ln -fs /usr/share/zoneinfo/UTC /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

RUN DEBIAN_FRONTEND=noninteractive apt update && \
    apt install -y dbus-x11 xrdp sudo openssl gnome-shell ubuntu-desktop-minimal gnome-console && \
    [ $X11Forwarding = 'true' ] && apt install -y openssh-server; \
    apt autoremove --purge; \
    apt clean;

# Remove the reboot required file
RUN rm /run/reboot-required* || true

# Create a user and add it to the sudo group
RUN useradd -s /bin/bash -m $USER -p $(openssl passwd "$PASS"); \
    usermod -aG sudo $USER; \
    adduser xrdp ssl-cert;

# Setting the required environment variables
RUN echo 'LANG=en_US.UTF-8' >> /etc/default/locale; \
    echo 'export GNOME_SHELL_SESSION_MODE=ubuntu' > /home/$USER/.xsessionrc; \
    echo 'export XDG_CURRENT_DESKTOP=ubuntu:GNOME' >> /home/$USER/.xsessionrc; \
    echo 'export XDG_SESSION_TYPE=x11' >> /home/$USER/.xsessionrc;

# Enabling log to the stdout
RUN sed -i "s/#EnableConsole=false/EnableConsole=true/g" /etc/xrdp/xrdp.ini;

# Disabling system animations and reducing the image quality to improve the performance
RUN sed -i 's/max_bpp=32/max_bpp=16/g' /etc/xrdp/xrdp.ini; \
    gsettings set org.gnome.desktop.interface enable-animations true;

# Listening on wildcard address for X forwarding
RUN [ $X11Forwarding = 'true' ] && \
        sed -i 's/#X11UseLocalhost yes/X11UseLocalhost no/g' /etc/ssh/sshd_config || :;

# Adding the user to the sudoers file
RUN echo "$USER ALL=(ALL) NOPASSWD:ALL" | tee -a /etc/sudoers.d/$USER

# Set up ulimit
RUN echo "ulimit -n 65535" >> /etc/profile

# Install Redash dependencies
RUN apt -y install build-essential curl pwgen python3-venv xvfb chromium-browser iptables nftables && \
    apt install -y --no-install-recommends default-libmysqlclient-dev freetds-dev libffi-dev libpq-dev \
        python3-dev libkrb5-dev libsasl2-dev libsasl2-modules-gssapi-mit libssl-dev unixodbc-dev xmlsec1

RUN su - $USER -s /bin/bash -c 'export NVM_DIR="$HOME/.nvm" && \
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.6/install.sh | bash && \
        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
        nvm install --lts 24 && \
        nvm alias default 24 && \
        nvm use 24 && \
        npm install -g pnpm@10.30.3 && \
        hash -r' && \
    echo "export NVM_DIR=/home/$USER/.nvm && [ -s /home/$USER/.nvm/nvm.sh ] && source /home/$USER/.nvm/nvm.sh" >> /home/$USER/.bashrc

# Install docker
RUN mkdir -p /tmp/docker && cd /tmp/docker && \
    curl -sLO "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/arm64/containerd.io_2.2.6-1~ubuntu.24.04~noble_arm64.deb" && \
    curl -sLO "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/arm64/docker-ce_29.6.2-1~ubuntu.24.04~noble_arm64.deb" && \
    curl -sLO "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/arm64/docker-ce-cli_29.6.2-1~ubuntu.24.04~noble_arm64.deb" && \
    curl -sLO "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/arm64/docker-buildx-plugin_0.35.0-1~ubuntu.24.04~noble_arm64.deb" && \
    curl -sLO "https://download.docker.com/linux/ubuntu/dists/noble/pool/stable/arm64/docker-compose-plugin_5.3.1-1~ubuntu.24.04~noble_arm64.deb" && \
    dpkg -i *.deb && \
    cd / && \
    rm -rf /tmp/docker

# Set up the entrypoint script
COPY redash-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]

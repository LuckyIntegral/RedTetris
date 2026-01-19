FROM ubuntu:22.04

RUN apt-get update && apt-get install -y sudo zsh git curl wget locales

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install MySQL
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server

# install omz theme
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" -y

COPY .zshrc /root/.zshrc

WORKDIR /workspace

COPY start-dev.sh /usr/local/bin/start-dev.sh
RUN chmod +x /usr/local/bin/start-dev.sh

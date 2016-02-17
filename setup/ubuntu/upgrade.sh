#!/bin/bash
set -eu

# Ported from the fabfile at https://gist.github.com/arikfr/440d1403b4aeb76ebaf8

# Install latest version
GIT_URL="https://github.com/mobiledefense/redash.git"
GIT_REVISION=$(git ls-remote "$GIT_URL" HEAD | sed "s/HEAD//")
VERSION_DIR="/opt/redash/redash.$GIT_REVISION"

if [ ! -d "$VERSION_DIR" ]; then
    echo "Upgrading to revision $GIT_REVISION..."
    sudo -u redash git clone "$GIT_URL" "$VERSION_DIR"
    ln -nfs /opt/redash/.env $VERSION_DIR/.env

    cd $VERSION_DIR

    # Update requirements
    pip install -r requirements.txt

    # Apply migrations
    MIGRATIONS=$(comm -23 <(cd $VERSION_DIR/migrations && find . | sed "s|^\./||" | sort) <(cd /opt/redash/current/migrations && find . | sed "s|^\./||" | sort))
    echo "Applying $(echo $MIGRATIONS | sed '/^\s*$/d' | wc -l | tr -d ' ') migrations..."
    echo $MIGRATIONS | xargs -n1 -I% sudo -u redash PYTHONPATH=. bin/run python migrations/%

    # Link to current
    ln -nfs "$VERSION_DIR" /opt/redash/current

    # Restart services
    /etc/init.d/redash_supervisord restart
fi

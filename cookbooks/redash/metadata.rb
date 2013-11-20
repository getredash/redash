name             'redash'
maintainer       'Everything.me'
maintainer_email 'timor@everything.me'
license          'All rights reserved'
description      'Installs/Configures redash'
long_description IO.read(File.join(File.dirname(__FILE__), 'README.md'))
version          '0.4'

depends "postgresql"
depends "python"
depends "ark"
depends "database"

%w(python dhcp sysctl git).each do |cookbook|
  depends cookbook
end
depends 'runit', '>= 1.1.0'

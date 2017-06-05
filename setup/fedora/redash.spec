%global _python_bytecompile_errors_terminate_build 0
%global __python_requires %{nil}
%global __python_requires %{nil}
%define debug_package %{nil}
%define redash_version 1.0.0-rc.1
%define redash_installdir /opt/redash/

Name:	    redash
Version:	1.0.0rc1
Release:	1%{?dist}
Summary:	Web based dashboard builder

Group:		Applications/Publishing
License:	BSD
URL:		http://redash.io
Source0:	https://github.com/getredash/redash/archive/v%{redash_version}.tar.gz
Source1:    %{name}-runner.py
Source2:    %{name}.cfg
Source3:    %{name}-supervisor.conf
BuildRequires: python-virtualenv cyrus-sasl-devel openssl-devel
BuildRequires: postgresql-devel python-devel mariadb-devel freetds-devel
BuildRequires: xmlsec1 xmlsec1-devel npm gcc gcc-c++
Requires:	python-virtualenv redis supervisor xmlsec1
Requires(pre): shadow-utils

%description
Redash provides a web based dashboarding platform for easily visualizing and
sharing your data

%prep
%setup -q -n %{name}-%{redash_version}


%build
echo $PWD
virtualenv venv/
./venv/bin/pip install -r requirements.txt
./venv/bin/pip install -r requirements_all_ds.txt
npm install
npm run build

%install
mkdir -p %{buildroot}/%{redash_installdir}
cp -r * %{buildroot}/%{redash_installdir}
virtualenv --relocatable %{buildroot}/opt/redash/venv
grep -lrZF "#!%{buildroot}" %{buildroot} | xargs \
  -r -0 perl -p -i -e "s|%{buildroot}|%{redash_installdir}|g"
grep -lrZF "#!%{_builddir}/%{name}-%{redash_version}" %{buildroot} | xargs \
  -r -0 perl -p -i -e "s|%{_builddir}/%{name}-%{redash_version}|%{redash_installdir}|g"

perl -p -i -e "s|%{buildroot}|%{redash_installdir}|g" \
     %{buildroot}/%{redash_installdir}/venv/bin/activate
perl -p -i -e "s|%{_builddir}/%{name}-%{redash_version}|%{redash_installdir}|g" \
     %{buildroot}/%{redash_installdir}/venv/bin/activate

mkdir -p %{buildroot}/%{_bindir}
cp %{SOURCE1} %{buildroot}/%{_bindir}/redash
mkdir -p %{buildroot}/%{_sysconfdir}/
cp %{SOURCE2} %{buildroot}/%{_sysconfdir}/%{name}.cfg
mkdir -p %{buildroot}/%{_sysconfdir}/supervisord.d/
cp %{SOURCE3} %{buildroot}/%{_sysconfdir}/supervisord.d/%{name}.ini
mkdir -p %{buildroot}/%{_var}/log/%{name}

%pre
getent group redash >/dev/null || groupadd -r redash
getent passwd redash >/dev/null || \
    useradd -r -g redash -d /opt/redash -s /sbin/nologin \
    -c "Redash user" redash
exit 0

%files
%defattr(-,redash,redash)
%attr(755,redash,redash) %{_bindir}/%{name}
%config %{_sysconfdir}/%{name}.cfg
%config %{_sysconfdir}/supervisord.d/%{name}.ini
/opt/redash
%{_var}/log/redash/

%changelog
* Fri Mar 3 2017 Izhar Firdaus <kagesenshi.87@gmail.com> 1.0.0rc1-1
- Initial package

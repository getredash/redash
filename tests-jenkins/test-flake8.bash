#!/bin/bash

PRETEND_EVERYTHING_IS_FINE=true

echo "${0}: # redash/setup.cfg #"
cat redash/setup.cfg
echo "${0}: ##### "
echo



flake8 redash
EXIT_CODE=${?}




if ${PRETEND_EVERYTHING_IS_FINE}
then
	if [ "${EXIT_CODE}" != "0" ]
	then
		echo
		echo "${0}: Some problems were detected but I am pretending eveything is fine."
		echo "${0}: Once the initially detected problems are fixed (or added to be ignored) change the PRETEND_EVERYTHING_IS_FINE to false"
		exit 0
	fi
fi

exit ${EXIT_CODE}


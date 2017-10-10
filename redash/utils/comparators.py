from sqlalchemy import func
from sqlalchemy.ext.hybrid import Comparator


class CaseInsensitiveComparator(Comparator):
    def __eq__(self, other):
        return func.lower(self.__clause_element__()) == func.lower(other)

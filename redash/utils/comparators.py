from sqlalchemy import String


class CaseInsensitiveComparator(String.Comparator):
    def __eq__(self, other):
        return func.lower(self.__clause_element__()) == func.lower(other)

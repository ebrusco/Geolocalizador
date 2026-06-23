class ProspectoAIError(Exception):
    pass


class TerritoryNotFoundError(ProspectoAIError):
    pass


class SearchNotFoundError(ProspectoAIError):
    pass


class GridTooLargeError(ProspectoAIError):
    pass


class PlacesAPIError(ProspectoAIError):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Places API error {status_code}: {detail}")


class GeocodingError(ProspectoAIError):
    pass

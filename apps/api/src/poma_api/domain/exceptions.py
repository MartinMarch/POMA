class PomaError(Exception):
    code = "poma_error"
    status_code = 500


class CatalogNotFoundError(PomaError):
    code = "catalog_not_found"
    status_code = 404


class TableTokenRequiredError(PomaError):
    code = "table_token_required"
    status_code = 403


class TableAccessDeniedError(PomaError):
    code = "table_access_denied"
    status_code = 403


class RepositoryUnavailableError(PomaError):
    code = "catalog_service_unavailable"
    status_code = 503


class TpvError(PomaError):
    code = "tpv_error"
    status_code = 502


class TpvAuthenticationError(TpvError):
    code = "tpv_authentication_failed"


class TpvUnavailableError(TpvError):
    code = "tpv_unavailable"
    status_code = 503


class TpvTimeoutError(TpvError):
    code = "tpv_timeout"
    status_code = 504


class TpvNotFoundError(TpvError):
    code = "tpv_order_not_found"
    status_code = 404


class TpvContractError(TpvError):
    code = "tpv_invalid_response"

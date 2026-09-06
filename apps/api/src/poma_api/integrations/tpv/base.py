from abc import ABC, abstractmethod

from poma_api.domain.models import ExternalOrder, OrderDraft, TpvCatalog


class TPVAdapter(ABC):
    @abstractmethod
    async def healthcheck(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def get_catalog(self) -> TpvCatalog:
        raise NotImplementedError

    @abstractmethod
    async def calculate_order(self, order: OrderDraft) -> ExternalOrder:
        raise NotImplementedError

    @abstractmethod
    async def create_order(self, order: OrderDraft) -> ExternalOrder:
        raise NotImplementedError

    @abstractmethod
    async def get_order(self, external_order_id: str) -> ExternalOrder:
        raise NotImplementedError

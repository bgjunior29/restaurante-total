from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

OrderStatus = Literal["RECEBIDO", "EM_PREPARO", "PRONTO", "SAIU_ENTREGA", "ENTREGUE", "CANCELADO"]
OrderType = Literal["MESA", "RETIRADA", "DELIVERY"]
PaymentKind = Literal["PIX", "CARD", "CASH", "OTHER"]
Station = Literal["COZINHA", "BAR", "CONFEITARIA", "COPA"]
CallKind = Literal["GARCOM", "CONTA", "AJUDA"]
Theme = Literal["verde", "grafite", "vinho", "oceano", "roxo", "terra"]
HexColor = Field(default="#f6c35b", pattern=r"^#[0-9a-fA-F]{6}$")
Role = Literal["ADMIN", "STAFF", "KITCHEN"]
Money = Field(ge=0, le=10_000_00)  # até R$ 10.000,00
OptionalMoney = Field(default=0, ge=0, le=10_000_00)


def _https(v: str, what: str) -> str:
    v = v.strip()
    if v and not v.startswith(("https://", "http://")):
        raise ValueError(f"{what} precisa ser um endereço começando com https://")
    return v


class LoginIn(BaseModel):
    username: str
    password: str


# ---------- Pedido do cliente ----------


class CartItemIn(BaseModel):
    productId: int
    quantity: int = Field(ge=1, le=50)
    optionIds: list[int] = Field(default_factory=list, max_length=30)


class OrderIn(BaseModel):
    type: OrderType = "MESA"
    tableNumber: int | None = None  # obrigatório para MESA
    sessionToken: str | None = Field(default=None, max_length=64)  # conta da mesa já aberta neste celular
    customerName: str = Field(default="", max_length=60)
    customerPhone: str = Field(default="", max_length=20)
    address: str = Field(default="", max_length=200)
    addressRef: str = Field(default="", max_length=120)
    notes: str = Field(default="", max_length=300)
    paymentMethodId: int | None = None  # obrigatório para retirada e delivery
    changeForCents: int = OptionalMoney
    couponCode: str = Field(default="", max_length=30)
    items: list[CartItemIn] = Field(default_factory=list, max_length=60)


class CouponCheckIn(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    subtotalCents: int = Field(ge=0)


class CallIn(BaseModel):
    tableNumber: int
    kind: CallKind = "GARCOM"


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=400)


# ---------- Equipe ----------


class StatusIn(BaseModel):
    status: OrderStatus


class PaymentIn(BaseModel):
    paid: bool
    paymentMethodId: int | None = None


class CloseSessionIn(BaseModel):
    paymentMethodId: int
    includeService: bool = True
    people: int = Field(default=1, ge=1, le=50)


# ---------- Gestão do restaurante ----------


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    station: Station = "COZINHA"
    sortOrder: int = 0


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=240)
    imageUrl: str = Field(default="", max_length=500)
    priceCents: int = Money
    categoryId: int
    available: bool = True
    stockQty: int | None = Field(default=None, ge=0, le=100_000)
    lowStockAt: int = Field(default=5, ge=0, le=10_000)
    sortOrder: int = 0
    optionGroupIds: list[int] = Field(default_factory=list, max_length=20)

    @field_validator("imageUrl")
    @classmethod
    def https_image(cls, v: str) -> str:
        return _https(v, "A foto")


class OptionIn(BaseModel):
    id: int | None = None  # presente = atualiza; ausente = cria
    name: str = Field(min_length=1, max_length=60)
    priceCents: int = Money
    available: bool = True


class OptionGroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    minSelect: int = Field(default=0, ge=0, le=20)
    maxSelect: int = Field(default=1, ge=1, le=20)
    sortOrder: int = 0
    options: list[OptionIn] = Field(default_factory=list, max_length=40)


class PaymentMethodIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    kind: PaymentKind = "OTHER"
    active: bool = True
    sortOrder: int = 0


class CouponIn(BaseModel):
    code: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_-]+$")
    kind: Literal["PERCENT", "FIXED"] = "PERCENT"
    value: int = Field(ge=1, le=10_000_00)
    minOrderCents: int = OptionalMoney
    maxUses: int | None = Field(default=None, ge=1, le=100_000)
    validUntil: date | None = None  # vale até o fim desse dia
    active: bool = True

    @field_validator("value")
    @classmethod
    def percent_limit(cls, v: int, info) -> int:
        if info.data.get("kind") == "PERCENT" and v > 100:
            raise ValueError("O desconto em % vai de 1 a 100.")
        return v


class TableIn(BaseModel):
    number: int = Field(ge=1, le=999)
    label: str = Field(default="", max_length=40)
    seats: int = Field(default=4, ge=1, le=50)
    active: bool = True


class IdentityIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    tagline: str = Field(default="", max_length=60)
    heroTitle: str = Field(default="", max_length=60)
    heroHighlight: str = Field(default="", max_length=60)
    heroText: str = Field(default="", max_length=240)
    logoUrl: str = Field(default="", max_length=500)
    accentColor: str = HexColor
    theme: Theme = "terra"
    openingHours: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=30)
    whatsapp: str = Field(default="", max_length=20)
    instagram: str = Field(default="", max_length=60)
    address: str = Field(default="", max_length=160)

    @field_validator("logoUrl")
    @classmethod
    def https_logo(cls, v: str) -> str:
        return _https(v, "O logo")


class SettingsIn(BaseModel):
    ordersOpen: bool
    pixKey: str = Field(default="", max_length=120)
    publicUrl: str = Field(default="", max_length=200)
    orderPrefix: str = Field(default="RT", min_length=1, max_length=6, pattern=r"^[A-Za-z0-9]+$")
    serviceFeePct: int = Field(default=10, ge=0, le=30)
    lateAfterMin: int = Field(default=20, ge=5, le=180)
    pickupEnabled: bool = True
    deliveryEnabled: bool = False
    deliveryFeeCents: int = Field(default=800, ge=0, le=10_000_00)
    freeDeliveryAboveCents: int = OptionalMoney
    minDeliveryCents: int = OptionalMoney
    deliveryArea: str = Field(default="", max_length=300)
    prepTimeMin: int = Field(default=25, ge=5, le=240)
    deliveryTimeMin: int = Field(default=50, ge=10, le=300)
    notifyWhatsapp: bool = False


class UserIn(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    name: str = Field(min_length=1, max_length=60)
    password: str = Field(min_length=6, max_length=100)
    role: Role = "STAFF"


class UserUpdateIn(BaseModel):
    name: str | None = Field(default=None, max_length=60)
    password: str | None = Field(default=None, min_length=6, max_length=100)
    role: Role | None = None
    active: bool | None = None


# ---------- Plataforma ----------


class TenantCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    slug: str = Field(min_length=3, max_length=40)
    plan: str = Field(default="Padrão", max_length=30)
    planPriceCents: int = Money
    notes: str = Field(default="", max_length=500)
    adminName: str = Field(default="Administrador", min_length=1, max_length=60)
    adminUsername: str = Field(default="admin", min_length=3, max_length=30)
    adminPassword: str = Field(min_length=6, max_length=100)
    starterContent: bool = True  # cria cardápio exemplo, pagamentos, cupom e 6 mesas
    # Identidade inicial (tudo editável depois, pela plataforma ou pelo dono do restaurante)
    tagline: str = Field(default="Restaurante · Cozinha · Encontros", max_length=60)
    accentColor: str = HexColor
    theme: Theme = "terra"


class TenantUpdateIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    slug: str = Field(min_length=3, max_length=40)
    plan: str = Field(default="Padrão", max_length=30)
    planPriceCents: int = Money
    notes: str = Field(default="", max_length=500)
    status: Literal["ACTIVE", "SUSPENDED"] = "ACTIVE"


class TenantAdminResetIn(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6, max_length=100)

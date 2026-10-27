from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ProductCheck(BaseModel):
    """Camera count against the POS record for one part."""

    visual: int = Field(ge=0, description="Units the camera counted on the shelf")
    pos: int = Field(ge=0, description="Units the POS records say are in stock")
    status: Literal["Matched", "Mismatch"]


class ScanResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    counts: dict[str, int] = Field(description="Parts found per class name, 0 when none")
    inference_ms: int = Field(alias="inferenceMs", ge=0)
    products: dict[str, ProductCheck] = Field(
        default_factory=dict, description="POS comparison per part; empty if it could not be done"
    )

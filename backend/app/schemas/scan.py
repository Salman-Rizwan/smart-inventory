from pydantic import BaseModel, ConfigDict, Field


class ScanResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    counts: dict[str, int] = Field(description="Parts found per class name, 0 when none")
    inference_ms: int = Field(alias="inferenceMs", ge=0)
